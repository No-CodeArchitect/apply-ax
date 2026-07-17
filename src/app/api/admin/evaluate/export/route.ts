import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { canAccessEvaluation } from "@/lib/admin";
import { getRawMatrix, computeNormalization } from "@/lib/normalization";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!canAccessEvaluation(session.username)) return NextResponse.json({ ok: false }, { status: 403 });

  const taskId = Number(req.nextUrl.searchParams.get("taskId") || "1");
  const format = req.nextUrl.searchParams.get("type") || "raw";

  if (![1, 2, 3].includes(taskId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const BOM = "﻿";

  if (format === "normalized") {
    const reviewers = getDb()
      .prepare("SELECT id, name FROM reviewers ORDER BY id")
      .all() as { id: number; name: string }[];
    const results = computeNormalization(taskId);

    const headers = ["기업명", ...reviewers.map((r) => `${r.name}(환산)`), "최종점수", "순위"];
    const rows = results.map((r) => {
      const scores = reviewers.map((rv) => {
        const rs = r.reviewerScores.find((s) => s.reviewerId === rv.id);
        return rs ? String(rs.convertedScore) : "";
      });
      return [r.companyName, ...scores, String(r.finalScore), String(r.rank)];
    });

    const csv = BOM + [headers, ...rows].map((r) => r.join(",")).join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="normalized_task${taskId}.csv"`,
      },
    });
  }

  // raw matrix
  const { reviewers, submissions, criteria, scoreMap, submitMap } = getRawMatrix(taskId);

  const headers = ["기업명", ...reviewers.map((r) => `${r.name}(원점수)`), "평균", ...reviewers.map((r) => `${r.name}(의견)`)];
  const rows = submissions.map((s) => {
    const scores = reviewers.map((r) => {
      const details = scoreMap.get(`${r.id}-${s.id}`) || [];
      return String(details.reduce((sum, d) => sum + (d.score ?? 0), 0));
    });
    const numScores = scores.map(Number);
    const avg = numScores.length > 0 ? (numScores.reduce((a, b) => a + b, 0) / numScores.length).toFixed(2) : "";
    const comments = reviewers.map((r) => {
      const state = submitMap.get(`${r.id}-${s.id}`);
      const c = state?.comment || "";
      return `"${c.replace(/"/g, '""')}"`;
    });
    return [s.company_name, ...scores, avg, ...comments];
  });

  const csv = BOM + [headers, ...rows].map((r) => r.join(",")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="raw_scores_task${taskId}.csv"`,
    },
  });
}
