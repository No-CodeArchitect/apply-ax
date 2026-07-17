import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getAdminSession } from "@/lib/session";
import { canAccessEvaluation } from "@/lib/admin";
import { getDb, nowIso } from "@/lib/db";
import { logAdminActivity } from "@/lib/activity";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!canAccessEvaluation(session.username)) return NextResponse.json({ ok: false }, { status: 403 });

  const db = getDb();
  const reviewers = db
    .prepare("SELECT id, name, affiliation_group, org, title, email, phone, created_at FROM reviewers ORDER BY id")
    .all() as {
    id: number; name: string; affiliation_group: string; org: string | null;
    title: string | null; email: string | null; phone: string | null; created_at: string;
  }[];

  const tokens = db
    .prepare("SELECT reviewer_id, token, expires_at FROM reviewer_tokens ORDER BY id DESC")
    .all() as { reviewer_id: number; token: string; expires_at: string }[];

  const tokenMap = new Map<number, { token: string; expires_at: string }>();
  for (const t of tokens) {
    if (!tokenMap.has(t.reviewer_id)) tokenMap.set(t.reviewer_id, t);
  }

  const result = reviewers.map((r) => {
    const t = tokenMap.get(r.id);
    return {
      ...r,
      magicLink: t ? `/evaluate?token=${t.token}` : null,
      tokenExpiresAt: t?.expires_at || null,
    };
  });

  return NextResponse.json({ ok: true, reviewers: result });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!canAccessEvaluation(session.username)) return NextResponse.json({ ok: false }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { name, affiliationGroup, org, title, email, phone } = body;

  if (!name || !affiliationGroup) {
    return NextResponse.json({ ok: false, message: "이름과 소속구분은 필수입니다." }, { status: 400 });
  }

  const db = getDb();
  const now = nowIso();

  const result = db
    .prepare(
      "INSERT INTO reviewers (name, affiliation_group, org, title, email, phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(name, affiliationGroup, org || null, title || null, email || null, phone || null, now);

  const reviewerId = result.lastInsertRowid;

  // 매직링크 토큰 자동 생성
  const token = crypto.randomBytes(48).toString("hex");
  db.prepare(
    "INSERT INTO reviewer_tokens (reviewer_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)"
  ).run(reviewerId, token, "2026-07-31T23:59:59+09:00", now);

  logAdminActivity({
    adminId: session.adminId,
    username: session.username,
    action: "create_reviewer",
    detail: `${name} (${affiliationGroup})`,
  });

  return NextResponse.json({
    ok: true,
    reviewer: { id: reviewerId, name, magicLink: `/evaluate?token=${token}` },
  });
}

export async function DELETE(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!canAccessEvaluation(session.username)) return NextResponse.json({ ok: false }, { status: 403 });

  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false, message: "id가 필요합니다." }, { status: 400 });

  const db = getDb();
  const reviewer = db.prepare("SELECT name FROM reviewers WHERE id = ?").get(id) as { name: string } | undefined;
  if (!reviewer) return NextResponse.json({ ok: false, message: "위원을 찾을 수 없습니다." }, { status: 404 });

  db.prepare("DELETE FROM evaluation_submits WHERE reviewer_id = ?").run(id);
  db.prepare("DELETE FROM evaluations WHERE reviewer_id = ?").run(id);
  db.prepare("DELETE FROM reviewer_tokens WHERE reviewer_id = ?").run(id);
  db.prepare("DELETE FROM reviewers WHERE id = ?").run(id);

  logAdminActivity({
    adminId: session.adminId,
    username: session.username,
    action: "delete_reviewer",
    detail: `${reviewer.name} (id=${id})`,
  });

  return NextResponse.json({ ok: true });
}
