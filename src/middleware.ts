import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth";

const CSRF_COOKIE = "ax_csrf";
const ADMIN_COOKIE = "ax_admin_session";

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── 관리자 경로 보호 ──────────────────────────────────────
  const isAdminArea = pathname.startsWith("/admin");
  const isAdminLogin = pathname === "/admin/login";
  if (isAdminArea && !isAdminLogin) {
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    const session = token ? await verifyToken<{ kind?: string }>(token) : null;
    if (!session || session.kind !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // ── CSRF 토큰 발급 (없을 때만) ────────────────────────────
  const res = NextResponse.next();
  if (!req.cookies.get(CSRF_COOKIE)?.value) {
    res.cookies.set(CSRF_COOKIE, randomToken(), {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return res;
}

export const config = {
  // 정적 자산/이미지/파비콘 제외한 모든 경로
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logos|.*\\.(?:png|jpg|jpeg|svg|ico)).*)"],
};
