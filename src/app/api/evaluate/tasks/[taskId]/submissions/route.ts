import { NextRequest, NextResponse } from "next/server";
import { getReviewerSession } from "@/lib/reviewerSession";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ taskId: string }> }) {
  const session = await getReviewerSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { taskId } = await ctx.params;
  const tid = Number(taskId);
  if (![1, 2, 3].includes(tid)) {
    return NextResponse.json({ ok: false, message: "잘못된 과제입니다." }, { status: 400 });
  }

  const db = getDb();
  const subs = db
    .prepare("SELECT id, company_name, created_at FROM submissions WHERE task_id = ? ORDER BY id")
    .all(tid) as { id: number; company_name: string; created_at: string }[];

  const result = subs.map((s) => {
    const submit = db
      .prepare(
        "SELECT is_final FROM evaluation_submits WHERE reviewer_id = ? AND submission_id = ?"
      )
      .get(session.reviewerId, s.id) as { is_final: number } | undefined;

    const savedCount = (
      db.prepare(
        "SELECT COUNT(*) as c FROM evaluations WHERE reviewer_id = ? AND submission_id = ? AND score IS NOT NULL"
      ).get(session.reviewerId, s.id) as { c: number }
    ).c;

    let status: "not_started" | "in_progress" | "completed" = "not_started";
    if (submit?.is_final === 1) status = "completed";
    else if (savedCount > 0) status = "in_progress";

    return {
      id: s.id,
      companyName: s.company_name,
      status,
    };
  });

  return NextResponse.json({ ok: true, submissions: result });
}
