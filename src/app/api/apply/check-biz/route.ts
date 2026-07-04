import { NextRequest, NextResponse } from "next/server";
import { getCompanyByBiz } from "@/lib/company";
import { getDb } from "@/lib/db";
import { normalizeBizRegNo, isValidBizRegNo } from "@/lib/validation";
import { taskTitle } from "@/lib/tasks";

export const runtime = "nodejs";

// 입력한 사업자등록번호가 이미 등록되어 있는지 조회 → 비밀번호 UI 분기용.
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("biz") || "";
  const biz = normalizeBizRegNo(raw);
  if (!isValidBizRegNo(biz)) {
    return NextResponse.json({ valid: false, exists: false });
  }
  const company = getCompanyByBiz(biz);
  let appliedTasks: string[] = [];
  if (company) {
    appliedTasks = (
      getDb().prepare("SELECT task_id FROM submissions WHERE biz_reg_no = ?").all(biz) as {
        task_id: number;
      }[]
    ).map((r) => taskTitle(r.task_id));
  }
  return NextResponse.json({ valid: true, exists: !!company, appliedTasks });
}
