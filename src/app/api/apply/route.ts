import { NextRequest, NextResponse } from "next/server";
import { getDb, nowIso } from "@/lib/db";
import { verifyCsrf } from "@/lib/csrf";
import { getApplicationStatus } from "@/lib/settings";
import {
  getCompanyByBiz,
  createCompany,
  verifyCompanyPassword,
} from "@/lib/company";
import { saveUpload, deleteUpload, type StoredFile } from "@/lib/files";
import { DOC_TYPES, TASK_IDS, taskTitle } from "@/lib/tasks";
import {
  normalizeBizRegNo,
  isValidBizRegNo,
  isValidEmail,
  isValidPhone,
  passwordIssue,
  requireText,
} from "@/lib/validation";
import { sendSubmissionConfirmation } from "@/lib/email";
import { formatDateTime } from "@/lib/format";
import { setApplicantSession } from "@/lib/session";

export const runtime = "nodejs";

function bad(message: string, extra: Record<string, unknown> = {}, status = 400) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

export async function POST(req: NextRequest) {
  if (!(await verifyCsrf(req))) return bad("보안 토큰이 유효하지 않습니다. 새로고침 후 다시 시도해 주세요.", {}, 403);

  // 접수 기간 검증 (서버 시각 기준)
  const status = getApplicationStatus();
  if (!status.open) {
    return bad(
      status.phase === "before"
        ? "아직 접수 기간이 아닙니다."
        : "접수가 마감되었습니다."
    );
  }

  const form = await req.formData();
  const str = (k: string) => (form.get(k)?.toString() ?? "").trim();

  const bizRegNo = normalizeBizRegNo(str("bizRegNo"));
  const companyName = str("companyName");
  const ceoName = str("ceoName");
  const applicantName = str("applicantName");
  const phone = str("phone");
  const email = str("email");
  const reason = str("reason");
  const techExperience = str("techExperience");
  const password = form.get("password")?.toString() ?? "";
  const passwordConfirm = form.get("passwordConfirm")?.toString() ?? "";

  const tasks = form
    .getAll("tasks")
    .map((v) => Number(v.toString()))
    .filter((n) => TASK_IDS.includes(n));

  // ── 검증 ──────────────────────────────────────────────────
  if (tasks.length === 0) return bad("지원할 과제를 최소 1개 선택해 주세요.");
  if (!isValidBizRegNo(bizRegNo)) return bad("사업자등록번호가 올바르지 않습니다.");
  for (const [v, label] of [
    [companyName, "상호(기업명)"],
    [ceoName, "대표자명"],
    [applicantName, "제출자 이름"],
  ] as const) {
    const e = requireText(v, label, 200);
    if (e) return bad(e);
  }
  if (!isValidPhone(phone)) return bad("연락처 형식이 올바르지 않습니다.");
  if (!isValidEmail(email)) return bad("이메일 형식이 올바르지 않습니다.");
  {
    const e = requireText(reason, "지원 사유") || requireText(techExperience, "보유 기술·실적");
    if (e) return bad(e);
  }

  // ── 기업(비밀번호) 처리 ───────────────────────────────────
  let company = getCompanyByBiz(bizRegNo);
  if (company) {
    // 기존 사업자: 비밀번호 인증
    const v = verifyCompanyPassword(company, password);
    if (v.locked) {
      return bad(
        `비밀번호 인증 실패가 많아 계정이 잠겼습니다. 약 ${Math.ceil((v.lockRemainingMs ?? 0) / 60000)}분 후 다시 시도해 주세요.`,
        { locked: true },
        429
      );
    }
    if (!v.ok) {
      return bad(
        `이미 등록된 사업자등록번호입니다. 비밀번호가 일치하지 않습니다.${
          v.attemptsLeft != null ? ` (남은 시도 ${v.attemptsLeft}회)` : ""
        }`,
        { needAuth: true }
      );
    }
  } else {
    // 신규 사업자: 새 비밀번호 설정
    const pe = passwordIssue(password);
    if (pe) return bad(pe);
    if (password !== passwordConfirm) return bad("비밀번호 확인이 일치하지 않습니다.");
    company = createCompany(bizRegNo, password, email);
  }

  // ── 중복 접수 확인 ────────────────────────────────────────
  const db = getDb();
  const existingTasks = db
    .prepare("SELECT task_id FROM submissions WHERE biz_reg_no = ?")
    .all(bizRegNo)
    .map((r) => (r as { task_id: number }).task_id);

  const duplicated = tasks.filter((t) => existingTasks.includes(t));
  const toCreate = tasks.filter((t) => !existingTasks.includes(t));

  if (toCreate.length === 0) {
    return bad(
      "선택하신 과제는 모두 이미 접수된 과제입니다. 접수 수정 페이지에서 확인·수정해 주세요.",
      { allDuplicated: true, duplicatedTasks: duplicated.map(taskTitle) }
    );
  }

  // ── 파일 준비 (검증) ──────────────────────────────────────
  const filesByType: Record<string, File | null> = {};
  for (const dt of DOC_TYPES) {
    const f = form.get(dt.key);
    filesByType[dt.key] = f instanceof File && f.size > 0 ? f : null;
    if (dt.required && !filesByType[dt.key]) {
      return bad(`${dt.label} 파일을 첨부해 주세요.`);
    }
  }

  // DB 를 건드리기 전에 모든 파일을 먼저 저장·검증한다.
  // (과제별로 독립 사본을 저장하여 수정/삭제 시 상호 영향이 없게 함)
  const now = nowIso();
  type PlannedAtt = StoredFile & { file_type: string };
  const plan: { taskId: number; atts: PlannedAtt[] }[] = [];
  const savedPaths: string[] = [];
  try {
    for (const t of toCreate) {
      const atts: PlannedAtt[] = [];
      for (const dt of DOC_TYPES) {
        const file = filesByType[dt.key];
        if (!file) continue;
        const r = await saveUpload(file);
        if (!r.ok || !r.stored) {
          savedPaths.forEach(deleteUpload); // 실패 시 이미 저장한 파일 정리
          return bad(r.error || "파일 저장 중 오류가 발생했습니다.");
        }
        atts.push({ ...r.stored, file_type: dt.key });
        savedPaths.push(r.stored.file_path);
      }
      plan.push({ taskId: t, atts });
    }
  } catch (e) {
    savedPaths.forEach(deleteUpload);
    console.error("파일 저장 실패:", (e as Error)?.message, e);
    return bad("첨부파일 저장 중 오류가 발생했습니다. 파일을 확인 후 다시 시도해 주세요.", {}, 500);
  }

  // ── 동기 트랜잭션: submission + attachments 일괄 생성 ──────
  const insertSub = db.prepare(
    `INSERT INTO submissions
      (company_id, biz_reg_no, task_id, company_name, ceo_name, applicant_name, phone, email, reason, tech_experience, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?)`
  );
  const insertAtt = db.prepare(
    `INSERT INTO attachments (submission_id, file_name, file_path, file_type, size, uploaded_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const createdIds: number[] = [];
  const runTx = db.transaction(() => {
    for (const item of plan) {
      const info = insertSub.run(
        company!.id,
        bizRegNo,
        item.taskId,
        companyName,
        ceoName,
        applicantName,
        phone,
        email,
        reason,
        techExperience,
        now,
        now
      );
      const submissionId = Number(info.lastInsertRowid);
      createdIds.push(submissionId);
      for (const a of item.atts) {
        insertAtt.run(submissionId, a.file_name, a.file_path, a.file_type, a.size, now);
      }
    }
  });

  try {
    runTx();
  } catch (e) {
    savedPaths.forEach(deleteUpload); // 롤백 시 저장 파일도 제거
    console.error("접수 트랜잭션 실패:", (e as Error)?.message, e);
    return bad("접수 처리 중 오류가 발생했습니다.", {}, 500);
  }

  // 인증 세션 부여 (접수 직후 조회/수정 편의)
  await setApplicantSession({ companyId: company.id, bizRegNo });

  // 접수 완료 메일 (실패해도 접수는 성립)
  try {
    await sendSubmissionConfirmation({
      to: email,
      companyName,
      taskTitles: toCreate.map(taskTitle),
      submittedAt: formatDateTime(now),
    });
  } catch (e) {
    console.error("확인 메일 발송 실패:", e);
  }

  return NextResponse.json({
    ok: true,
    createdTasks: toCreate.map((t) => ({ id: t, title: taskTitle(t) })),
    duplicatedTasks: duplicated.map((t) => ({ id: t, title: taskTitle(t) })),
    receiptNos: createdIds,
  });
}
