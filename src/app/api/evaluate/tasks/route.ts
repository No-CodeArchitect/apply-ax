import { NextResponse } from "next/server";
import { getReviewerSession } from "@/lib/reviewerSession";
import { getDb } from "@/lib/db";
import { TASKS } from "@/lib/tasks";

export const runtime = "nodejs";

export async function GET() {
  const session = await getReviewerSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const db = getDb();
  const result = TASKS.map((t) => {
    const totalCount = (
      db.prepare("SELECT COUNT(*) as c FROM submissions WHERE task_id = ?").get(t.id) as { c: number }
    ).c;

    const doneCount = (
      db.prepare(
        `SELECT COUNT(*) as c FROM evaluation_submits
         WHERE reviewer_id = ? AND is_final = 1
         AND submission_id IN (SELECT id FROM submissions WHERE task_id = ?)`
      ).get(session.reviewerId, t.id) as { c: number }
    ).c;

    return {
      id: t.id,
      title: t.title,
      short: t.short,
      totalSubmissions: totalCount,
      completedByMe: doneCount,
    };
  });

  return NextResponse.json({ ok: true, tasks: result, reviewer: { name: session.name, group: session.affiliationGroup } });
}
