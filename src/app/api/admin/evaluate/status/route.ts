import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { canAccessEvaluation } from "@/lib/admin";
import { getDb } from "@/lib/db";
import { TASKS } from "@/lib/tasks";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!canAccessEvaluation(session.username)) return NextResponse.json({ ok: false }, { status: 403 });

  const db = getDb();
  const reviewers = db
    .prepare("SELECT id, name, affiliation_group, org, email FROM reviewers ORDER BY id")
    .all() as { id: number; name: string; affiliation_group: string; org: string; email: string | null }[];

  const tasks = TASKS.map((t) => {
    const subCount = (
      db.prepare("SELECT COUNT(*) as c FROM submissions WHERE task_id = ?").get(t.id) as { c: number }
    ).c;
    return { id: t.id, title: t.title, short: t.short, submissionCount: subCount };
  });

  const submits = db
    .prepare(
      `SELECT es.reviewer_id, s.task_id, es.is_final, es.submitted_at
       FROM evaluation_submits es
       JOIN submissions s ON es.submission_id = s.id
       WHERE es.is_final = 1`
    )
    .all() as { reviewer_id: number; task_id: number; is_final: number; submitted_at: string }[];

  // 위원별 × 과제별 완료 건수
  const completionMap = new Map<string, number>();
  for (const s of submits) {
    const key = `${s.reviewer_id}-${s.task_id}`;
    completionMap.set(key, (completionMap.get(key) || 0) + 1);
  }

  const matrix = reviewers.map((r) => ({
    id: r.id,
    name: r.name,
    group: r.affiliation_group,
    org: r.org,
    email: r.email,
    tasks: tasks.map((t) => ({
      taskId: t.id,
      completed: completionMap.get(`${r.id}-${t.id}`) || 0,
      total: t.submissionCount,
    })),
  }));

  return NextResponse.json({ ok: true, reviewers: matrix, tasks });
}
