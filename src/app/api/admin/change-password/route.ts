import { NextRequest, NextResponse } from "next/server";
import { verifyCsrf } from "@/lib/csrf";
import { getAdminSession, setAdminSession } from "@/lib/session";
import { getAdminById, verifyAdminPassword, setAdminPassword } from "@/lib/admin";
import { logAdminActivity } from "@/lib/activity";
import { passwordIssue } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await verifyCsrf(req)))
    return NextResponse.json({ ok: false, message: "보안 토큰이 유효하지 않습니다." }, { status: 403 });

  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, message: "인증이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  const newPasswordConfirm = String(body.newPasswordConfirm || "");

  const admin = getAdminById(session.adminId);
  if (!admin) return NextResponse.json({ ok: false, message: "계정을 찾을 수 없습니다." }, { status: 404 });
  if (!verifyAdminPassword(admin, currentPassword))
    return NextResponse.json({ ok: false, message: "현재 비밀번호가 일치하지 않습니다." }, { status: 401 });

  const pe = passwordIssue(newPassword);
  if (pe) return NextResponse.json({ ok: false, message: pe }, { status: 400 });
  if (newPassword !== newPasswordConfirm)
    return NextResponse.json({ ok: false, message: "새 비밀번호 확인이 일치하지 않습니다." }, { status: 400 });

  setAdminPassword(admin.id, newPassword);
  // 세션의 mustChange 플래그 갱신
  await setAdminSession({
    adminId: admin.id,
    username: admin.username,
    orgLabel: admin.org_label,
    mustChange: false,
  });
  logAdminActivity({ adminId: admin.id, username: admin.username, action: "change_password" });

  return NextResponse.json({ ok: true });
}
