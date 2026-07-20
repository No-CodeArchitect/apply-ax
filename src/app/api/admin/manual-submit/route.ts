import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { saveUpload, type StoredFile } from "@/lib/files";
import { DOC_TYPES } from "@/lib/tasks";
import { logAdminActivity } from "@/lib/activity";
import {
  normalizeBizRegNo,
  isValidBizRegNo,
} from "@/lib/validation";
import { createCompany, getCompanyByBiz } from "@/lib/company";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "관리자 인증 필요" }, { status: 401 });
  }

  const form = await req.formData();
  const str = (k: string) => (form.get(k)?.toString() ?? "").trim();

  const bizRegNo = normalizeBizRegNo(str("bizRegNo"));
  const companyName = str("companyName");
  const ceoName = str("ceoName");
  const applicantName = str("applicantName") || ceoName;
  const phone = str("phone");
  const email = str("email");
  const reason = str("reason") || "관리자 수동 접수";
  const techExperience = str("techExperience") || "관리자 수동 접수";
  const taskId = Number(str("taskId"));
  const createdAt = str("createdAt") || new Date().toISOString();
  const password = str("password") || "TempPass1!";

  if (!isValidBizRegNo(bizRegNo)) {
    return NextResponse.json({ ok: false, message: "사업자등록번호가 올바르지 않습니다." }, { status: 400 });
  }
  if (!companyName || !ceoName || !taskId) {
    return NextResponse.json({ ok: false, message: "필수 필드 누락 (companyName, ceoName, taskId)" }, { status: 400 });
  }

  let company = getCompanyByBiz(bizRegNo);
  if (!company) {
    company = createCompany(bizRegNo, password, email);
  }

  const db = getDb();

  const existing = db
    .prepare("SELECT id FROM submissions WHERE biz_reg_no = ? AND task_id = ?")
    .get(bizRegNo, taskId);
  if (existing) {
    return NextResponse.json({ ok: false, message: "이미 해당 과제에 접수된 사업자입니다." }, { status: 409 });
  }

  const savedPaths: string[] = [];
  type PlannedAtt = StoredFile & { file_type: string };
  const atts: PlannedAtt[] = [];

  for (const dt of DOC_TYPES) {
    const f = form.get(dt.key);
    if (!(f instanceof File) || f.size === 0) continue;
    const r = await saveUpload(f);
    if (!r.ok || !r.stored) {
      return NextResponse.json({ ok: false, message: r.error || "파일 저장 실패" }, { status: 500 });
    }
    atts.push({ ...r.stored, file_type: dt.key });
    savedPaths.push(r.stored.file_path);
  }

  const insertSub = db.prepare(
    `INSERT INTO submissions
      (company_id, biz_reg_no, task_id, company_name, ceo_name, applicant_name, phone, email, reason, tech_experience, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?)`
  );
  const insertAtt = db.prepare(
    `INSERT INTO attachments (submission_id, file_name, file_path, file_type, size, uploaded_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const runTx = db.transaction(() => {
    const info = insertSub.run(
      company!.id, bizRegNo, taskId, companyName, ceoName,
      applicantName, phone, email, reason, techExperience,
      createdAt, createdAt
    );
    const submissionId = Number(info.lastInsertRowid);
    for (const a of atts) {
      insertAtt.run(submissionId, a.file_name, a.file_path, a.file_type, a.size, createdAt);
    }
    return submissionId;
  });

  const submissionId = runTx();

  logAdminActivity({
    adminId: session.adminId,
    username: session.username,
    action: "manual_submit",
    detail: `${companyName} (${bizRegNo}) 과제${taskId} / submission_id=${submissionId}`,
  });

  return NextResponse.json({ ok: true, submissionId });
}
