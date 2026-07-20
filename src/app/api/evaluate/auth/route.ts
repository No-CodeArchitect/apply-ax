import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { setReviewerSession } from "@/lib/reviewerSession";

export const runtime = "nodejs";

function findToken(token: string) {
  return getDb()
    .prepare(
      `SELECT rt.id, rt.reviewer_id, rt.expires_at, r.name, r.affiliation_group, r.org
       FROM reviewer_tokens rt
       JOIN reviewers r ON rt.reviewer_id = r.id
       WHERE rt.token = ?`
    )
    .get(token) as
    | { id: number; reviewer_id: number; expires_at: string; name: string; affiliation_group: string; org: string | null }
    | undefined;
}

/** GET: 토큰 검증 + 위원 정보 반환 (세션 미생성) */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token || token.length < 32) {
    return NextResponse.json({ ok: false, message: "유효하지 않은 링크입니다." }, { status: 400 });
  }

  const row = findToken(token);
  if (!row) {
    return NextResponse.json({ ok: false, message: "유효하지 않은 링크입니다." }, { status: 401 });
  }

  if (new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ ok: false, message: "만료된 링크입니다. 관리자에게 재발급을 요청하세요." }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    reviewer: { name: row.name, group: row.affiliation_group, org: row.org },
  });
}

/** POST: 본인 확인 후 세션 생성 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { token } = body;

  if (!token || typeof token !== "string" || token.length < 32) {
    return NextResponse.json({ ok: false, message: "유효하지 않은 링크입니다." }, { status: 400 });
  }

  const row = findToken(token);
  if (!row) {
    return NextResponse.json({ ok: false, message: "유효하지 않은 링크입니다." }, { status: 401 });
  }

  if (new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ ok: false, message: "만료된 링크입니다. 관리자에게 재발급을 요청하세요." }, { status: 401 });
  }

  if (body.ndaAgreed) {
    getDb()
      .prepare(
        `INSERT OR REPLACE INTO reviewer_nda (reviewer_id, agreed_at) VALUES (?, ?)`
      )
      .run(row.reviewer_id, new Date().toISOString());
  }

  await setReviewerSession({
    reviewerId: row.reviewer_id,
    name: row.name,
    affiliationGroup: row.affiliation_group,
  });

  return NextResponse.json({ ok: true });
}
