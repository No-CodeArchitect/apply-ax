import { NextRequest, NextResponse } from "next/server";
import { verifyCsrf } from "@/lib/csrf";
import { getAdminSession, clearAdminSession } from "@/lib/session";
import { logAdminActivity } from "@/lib/activity";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await verifyCsrf(req)))
    return NextResponse.json({ ok: false }, { status: 403 });
  const session = await getAdminSession();
  if (session) {
    logAdminActivity({ adminId: session.adminId, username: session.username, action: "logout" });
  }
  await clearAdminSession();
  return NextResponse.json({ ok: true });
}
