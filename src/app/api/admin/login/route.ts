import { NextRequest, NextResponse } from "next/server";
import { verifyCsrf } from "@/lib/csrf";
import { getAdminByUsername, verifyAdminPassword } from "@/lib/admin";
import { setAdminSession } from "@/lib/session";
import { logAdminActivity } from "@/lib/activity";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await verifyCsrf(req)))
    return NextResponse.json({ ok: false, message: "보안 토큰이 유효하지 않습니다." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  const admin = getAdminByUsername(username);
  if (!admin || !verifyAdminPassword(admin, password)) {
    return NextResponse.json(
      { ok: false, message: "아이디 또는 비밀번호가 일치하지 않습니다." },
      { status: 401 }
    );
  }

  const mustChange = admin.must_change_password === 1;
  await setAdminSession({
    adminId: admin.id,
    username: admin.username,
    orgLabel: admin.org_label,
    mustChange,
  });
  logAdminActivity({ adminId: admin.id, username: admin.username, action: "login" });

  return NextResponse.json({ ok: true, mustChange });
}
