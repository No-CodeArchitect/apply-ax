import { NextRequest, NextResponse } from "next/server";
import { getReviewerSession } from "@/lib/reviewerSession";
import { getDb, nowIso } from "@/lib/db";
import { getAllCriteria } from "@/lib/criteria";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getReviewerSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await ctx.params;
  const subId = Number(id);
  const db = getDb();

  const sub = db.prepare("SELECT id FROM submissions WHERE id = ?").get(subId);
  if (!sub) return NextResponse.json({ ok: false, message: "지원서를 찾을 수 없습니다." }, { status: 404 });

  const submit = db
    .prepare("SELECT is_final FROM evaluation_submits WHERE reviewer_id = ? AND submission_id = ?")
    .get(session.reviewerId, subId) as { is_final: number } | undefined;
  if (submit?.is_final === 1) {
    return NextResponse.json({ ok: false, message: "이미 최종 제출되어 수정할 수 없습니다." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const scores: { criteriaId: number; score: number | null }[] = body.scores || [];
  const comment: string | undefined = body.comment;

  const criteria = getAllCriteria();
  const criteriaMap = new Map(criteria.map((c) => [c.id, c]));

  const upsertScore = db.prepare(
    `INSERT INTO evaluations (reviewer_id, submission_id, criteria_id, score, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(reviewer_id, submission_id, criteria_id)
     DO UPDATE SET score = excluded.score, updated_at = excluded.updated_at`
  );

  const now = nowIso();
  const errors: string[] = [];

  const tx = db.transaction(() => {
    for (const s of scores) {
      const c = criteriaMap.get(s.criteriaId);
      if (!c) { errors.push(`항목 ${s.criteriaId}을 찾을 수 없습니다.`); continue; }
      if (s.score !== null) {
        if (!Number.isInteger(s.score) || s.score < 0 || s.score > c.max_score) {
          errors.push(`${c.label}: 0~${c.max_score} 범위의 정수만 입력 가능합니다.`);
          continue;
        }
      }
      upsertScore.run(session.reviewerId, subId, s.criteriaId, s.score, now);
    }

    if (comment !== undefined) {
      db.prepare(
        `INSERT INTO evaluation_submits (reviewer_id, submission_id, comment)
         VALUES (?, ?, ?)
         ON CONFLICT(reviewer_id, submission_id)
         DO UPDATE SET comment = excluded.comment`
      ).run(session.reviewerId, subId, comment);
    }
  });

  tx();

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, message: errors.join("; ") }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
