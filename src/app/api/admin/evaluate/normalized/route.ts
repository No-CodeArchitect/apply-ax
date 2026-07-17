import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { canAccessEvaluation } from "@/lib/admin";
import { computeNormalization } from "@/lib/normalization";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!canAccessEvaluation(session.username)) return NextResponse.json({ ok: false }, { status: 403 });

  const taskId = Number(req.nextUrl.searchParams.get("taskId") || "1");
  if (![1, 2, 3].includes(taskId)) {
    return NextResponse.json({ ok: false, message: "잘못된 과제입니다." }, { status: 400 });
  }

  const reviewers = getDb()
    .prepare("SELECT id, name FROM reviewers ORDER BY id")
    .all() as { id: number; name: string }[];

  const results = computeNormalization(taskId);

  return NextResponse.json({
    ok: true,
    taskId,
    reviewers: reviewers.map((r) => ({ id: r.id, name: r.name })),
    results,
  });
}
