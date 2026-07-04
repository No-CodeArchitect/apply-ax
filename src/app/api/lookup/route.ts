import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyCsrf } from "@/lib/csrf";
import { getCompanyByBiz, verifyCompanyPassword } from "@/lib/company";
import { setApplicantSession } from "@/lib/session";
import { getApplicationStatus } from "@/lib/settings";
import { normalizeBizRegNo, isValidBizRegNo } from "@/lib/validation";
import { taskTitle } from "@/lib/tasks";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await verifyCsrf(req)))
    return NextResponse.json({ ok: false, message: "보안 토큰이 유효하지 않습니다." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const biz = normalizeBizRegNo(String(body.bizRegNo || ""));
  const password = String(body.password || "");

  if (!isValidBizRegNo(biz) || !password) {
    return NextResponse.json(
      { ok: false, message: "사업자등록번호와 비밀번호를 확인해 주세요." },
      { status: 400 }
    );
  }

  const company = getCompanyByBiz(biz);
  // 존재하지 않아도 동일한 실패 메시지로 응답(계정 열거 방지)
  if (!company) {
    return NextResponse.json(
      { ok: false, message: "사업자등록번호 또는 비밀번호가 일치하지 않습니다." },
      { status: 401 }
    );
  }

  const v = verifyCompanyPassword(company, password);
  if (v.locked) {
    return NextResponse.json(
      {
        ok: false,
        message: `인증 실패가 5회를 초과하여 잠금되었습니다. 약 ${Math.ceil(
          (v.lockRemainingMs ?? 0) / 60000
        )}분 후 다시 시도해 주세요.`,
      },
      { status: 429 }
    );
  }
  if (!v.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: `사업자등록번호 또는 비밀번호가 일치하지 않습니다.${
          v.attemptsLeft != null ? ` (남은 시도 ${v.attemptsLeft}회)` : ""
        }`,
      },
      { status: 401 }
    );
  }

  await setApplicantSession({ companyId: company.id, bizRegNo: biz });

  const rows = getDb()
    .prepare(
      "SELECT id, task_id, company_name, applicant_name, created_at FROM submissions WHERE biz_reg_no = ? ORDER BY task_id"
    )
    .all(biz) as {
    id: number;
    task_id: number;
    company_name: string;
    applicant_name: string;
    created_at: string;
  }[];

  const status = getApplicationStatus();

  return NextResponse.json({
    ok: true,
    editable: status.open,
    phase: status.phase,
    submissions: rows.map((r) => ({
      id: r.id,
      taskId: r.task_id,
      taskTitle: taskTitle(r.task_id),
      companyName: r.company_name,
      applicantName: r.applicant_name,
      createdAt: r.created_at,
    })),
  });
}
