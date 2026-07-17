import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { canAccessEvaluation } from "@/lib/admin";
import { getRawMatrix } from "@/lib/normalization";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!canAccessEvaluation(session.username)) return NextResponse.json({ ok: false }, { status: 403 });

  const taskId = Number(req.nextUrl.searchParams.get("taskId") || "1");
  if (![1, 2, 3].includes(taskId)) {
    return NextResponse.json({ ok: false, message: "잘못된 과제입니다." }, { status: 400 });
  }

  const { reviewers, submissions, criteria, scoreMap, submitMap } = getRawMatrix(taskId);

  const matrix = submissions.map((s) => {
    const scores = reviewers.map((r) => {
      const key = `${r.id}-${s.id}`;
      const details = scoreMap.get(key) || [];
      const submitState = submitMap.get(key);
      const total = details.reduce((sum, d) => sum + (d.score ?? 0), 0);
      const perCriteria = criteria.map((c) => {
        const d = details.find((dd) => dd.criteriaId === c.id);
        return { criteriaId: c.id, score: d?.score ?? null };
      });
      return {
        reviewerId: r.id,
        reviewerName: r.name,
        totalScore: total,
        isFinal: submitState?.isFinal ?? false,
        comment: submitState?.comment ?? null,
        perCriteria,
      };
    });

    const finalScores = scores.filter((sc) => sc.isFinal).map((sc) => sc.totalScore);
    const avg = finalScores.length > 0
      ? Math.round((finalScores.reduce((a, b) => a + b, 0) / finalScores.length) * 100) / 100
      : null;

    return {
      submissionId: s.id,
      companyName: s.company_name,
      scores,
      average: avg,
    };
  });

  return NextResponse.json({
    ok: true,
    taskId,
    reviewers: reviewers.map((r) => ({ id: r.id, name: r.name })),
    criteria: criteria.map((c) => ({ id: c.id, code: c.code, label: c.label, maxScore: c.max_score })),
    matrix,
  });
}
