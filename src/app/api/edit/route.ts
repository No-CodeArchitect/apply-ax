import { NextRequest, NextResponse } from "next/server";
import { getDb, nowIso } from "@/lib/db";
import { verifyCsrf } from "@/lib/csrf";
import { getApplicantSession } from "@/lib/session";
import { getApplicationStatus } from "@/lib/settings";
import { saveUpload, deleteUpload } from "@/lib/files";
import { DOC_TYPES } from "@/lib/tasks";
import { isValidEmail, isValidPhone, requireText } from "@/lib/validation";

export const runtime = "nodejs";

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(req: NextRequest) {
  if (!(await verifyCsrf(req))) return bad("보안 토큰이 유효하지 않습니다.", 403);

  const session = await getApplicantSession();
  if (!session) return bad("인증이 만료되었습니다. 다시 로그인해 주세요.", 401);

  // 마감 이후 수정 거부 (서버 시각 기준 재검증)
  const status = getApplicationStatus();
  if (!status.open) {
    return bad(
      status.phase === "closed"
        ? "접수가 마감되어 수정할 수 없습니다."
        : "접수 기간이 아닙니다.",
      403
    );
  }

  const form = await req.formData();
  const submissionId = Number(form.get("submissionId"));
  const db = getDb();
  const sub = db.prepare("SELECT * FROM submissions WHERE id = ?").get(submissionId) as
    | Record<string, unknown>
    | undefined;

  if (!sub) return bad("접수 건을 찾을 수 없습니다.", 404);
  if (sub.biz_reg_no !== session.bizRegNo) return bad("본인 접수 건만 수정할 수 있습니다.", 403);

  const str = (k: string) => (form.get(k)?.toString() ?? "").trim();
  const companyName = str("companyName");
  const ceoName = str("ceoName");
  const applicantName = str("applicantName");
  const phone = str("phone");
  const email = str("email");
  const reason = str("reason");
  const techExperience = str("techExperience");

  for (const [v, label] of [
    [companyName, "상호"],
    [ceoName, "대표자명"],
    [applicantName, "제출자 이름"],
    [reason, "지원 사유"],
    [techExperience, "보유 기술·실적"],
  ] as const) {
    const e = requireText(v, label);
    if (e) return bad(e);
  }
  if (!isValidPhone(phone)) return bad("연락처 형식이 올바르지 않습니다.");
  if (!isValidEmail(email)) return bad("이메일 형식이 올바르지 않습니다.");

  // 수정 전 스냅샷 기록
  const attachmentsBefore = db
    .prepare("SELECT * FROM attachments WHERE submission_id = ?")
    .all(submissionId);
  const snapshot = { submission: sub, attachments: attachmentsBefore };
  db.prepare(
    "INSERT INTO submission_history (submission_id, snapshot_json, changed_at) VALUES (?, ?, ?)"
  ).run(submissionId, JSON.stringify(snapshot), nowIso());

  // 본문 업데이트
  db.prepare(
    `UPDATE submissions SET company_name=?, ceo_name=?, applicant_name=?, phone=?, email=?, reason=?, tech_experience=?, updated_at=?
     WHERE id=?`
  ).run(companyName, ceoName, applicantName, phone, email, reason, techExperience, nowIso(), submissionId);

  // 첨부파일: 종류별로 새 파일이 오면 기존 것을 교체
  const insertAtt = db.prepare(
    `INSERT INTO attachments (submission_id, file_name, file_path, file_type, size, uploaded_at) VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const dt of DOC_TYPES) {
    const file = form.get(dt.key);
    if (file instanceof File && file.size > 0) {
      const r = await saveUpload(file);
      if (!r.ok) return bad(r.error || "파일 저장 오류");
      if (r.stored) {
        // 같은 종류 기존 첨부 삭제(파일 + 레코드)
        const olds = db
          .prepare("SELECT id, file_path FROM attachments WHERE submission_id = ? AND file_type = ?")
          .all(submissionId, dt.key) as { id: number; file_path: string }[];
        for (const o of olds) {
          deleteUpload(o.file_path);
          db.prepare("DELETE FROM attachments WHERE id = ?").run(o.id);
        }
        insertAtt.run(submissionId, r.stored.file_name, r.stored.file_path, dt.key, r.stored.size, nowIso());
      }
    }
  }

  return NextResponse.json({ ok: true });
}
