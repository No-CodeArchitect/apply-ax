import { NextRequest, NextResponse } from "next/server";
import { getReviewerSession } from "@/lib/reviewerSession";
import { getDb, nowIso } from "@/lib/db";
import { getAllCriteria } from "@/lib/criteria";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getReviewerSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await ctx.params;
  const subId = Number(id);
  const db = getDb();

  const sub = db.prepare("SELECT id FROM submissions WHERE id = ?").get(subId);
  if (!sub) return NextResponse.json({ ok: false, message: "지원서를 찾을 수 없습니다." }, { status: 404 });

  const existing = db
    .prepare("SELECT is_final FROM evaluation_submits WHERE reviewer_id = ? AND submission_id = ?")
    .get(session.reviewerId, subId) as { is_final: number } | undefined;
  if (existing?.is_final === 1) {
    return NextResponse.json({ ok: false, message: "이미 최종 제출되었습니다." }, { status: 403 });
  }

  const criteria = getAllCriteria();
  const myScores = db
    .prepare("SELECT criteria_id, score FROM evaluations WHERE reviewer_id = ? AND submission_id = ?")
    .all(session.reviewerId, subId) as { criteria_id: number; score: number | null }[];

  const scoreMap = new Map(myScores.map((s) => [s.criteria_id, s.score]));
  const missing = criteria.filter((c) => scoreMap.get(c.id) === null || scoreMap.get(c.id) === undefined);
  if (missing.length > 0) {
    return NextResponse.json({
      ok: false,
      message: `미입력 항목이 있습니다: ${missing.map((c) => c.label).join(", ")}`,
    }, { status: 400 });
  }

  const now = nowIso();
  db.prepare(
    `INSERT INTO evaluation_submits (reviewer_id, submission_id, is_final, submitted_at)
     VALUES (?, ?, 1, ?)
     ON CONFLICT(reviewer_id, submission_id)
     DO UPDATE SET is_final = 1, submitted_at = excluded.submitted_at`
  ).run(session.reviewerId, subId, now);

  return NextResponse.json({ ok: true });
}
