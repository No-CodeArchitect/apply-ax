import { NextRequest, NextResponse } from "next/server";
import { verifyCsrf } from "@/lib/csrf";
import { getAdminSession } from "@/lib/session";
import { setSetting } from "@/lib/settings";
import { logAdminActivity } from "@/lib/activity";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await verifyCsrf(req)))
    return NextResponse.json({ ok: false, message: "보안 토큰이 유효하지 않습니다." }, { status: 403 });

  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, message: "인증이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const start = String(body.start || "");
  const end = String(body.end || "");
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()))
    return NextResponse.json({ ok: false, message: "날짜 형식이 올바르지 않습니다." }, { status: 400 });
  if (startDate >= endDate)
    return NextResponse.json({ ok: false, message: "마감일시는 시작일시보다 이후여야 합니다." }, { status: 400 });

  setSetting("application_start_at", startDate.toISOString());
  setSetting("application_end_at", endDate.toISOString());

  // 과제 안내 문구(선택)
  for (const tid of [1, 2, 3]) {
    const key = `task${tid}_guide`;
    if (typeof body[key] === "string") setSetting(key, String(body[key]));
  }

  logAdminActivity({
    adminId: session.adminId,
    username: session.username,
    action: "update_settings",
    detail: `${startDate.toISOString()} ~ ${endDate.toISOString()}`,
  });

  return NextResponse.json({ ok: true });
}
