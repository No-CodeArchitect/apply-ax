import { NextRequest, NextResponse } from "next/server";
import { getReviewerSession } from "@/lib/reviewerSession";
import { getDb } from "@/lib/db";
import { getAllCriteria } from "@/lib/criteria";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getReviewerSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await ctx.params;
  const subId = Number(id);
  const db = getDb();

  const sub = db
    .prepare("SELECT id, task_id, company_name FROM submissions WHERE id = ?")
    .get(subId) as { id: number; task_id: number; company_name: string } | undefined;

  if (!sub) return NextResponse.json({ ok: false, message: "지원서를 찾을 수 없습니다." }, { status: 404 });

  const attachments = db
    .prepare("SELECT id, file_name, file_type FROM attachments WHERE submission_id = ? ORDER BY CASE file_type WHEN 'proposal' THEN 0 ELSE 1 END")
    .all(subId) as { id: number; file_name: string; file_type: string }[];

  const criteria = getAllCriteria();

  const myScores = db
    .prepare(
      "SELECT criteria_id, score FROM evaluations WHERE reviewer_id = ? AND submission_id = ?"
    )
    .all(session.reviewerId, subId) as { criteria_id: number; score: number | null }[];

  const scoreMap: Record<number, number | null> = {};
  for (const s of myScores) scoreMap[s.criteria_id] = s.score;

  const submit = db
    .prepare(
      "SELECT is_final, comment FROM evaluation_submits WHERE reviewer_id = ? AND submission_id = ?"
    )
    .get(session.reviewerId, subId) as { is_final: number; comment: string | null } | undefined;

  return NextResponse.json({
    ok: true,
    submission: {
      id: sub.id,
      taskId: sub.task_id,
      companyName: sub.company_name,
      attachments: attachments.map((a) => ({ id: a.id, fileName: a.file_name, fileType: a.file_type })),
    },
    criteria: criteria.map((c) => ({
      id: c.id,
      code: c.code,
      label: c.label,
      maxScore: c.max_score,
      score: scoreMap[c.id] ?? null,
    })),
    isFinal: submit?.is_final === 1,
    comment: submit?.comment || "",
  });
}
