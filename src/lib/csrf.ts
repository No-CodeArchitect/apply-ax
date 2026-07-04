import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

// Double-submit 쿠키 방식의 CSRF 보호.
// 토큰 쿠키(ax_csrf)는 middleware 에서 발급하고, 폼 렌더링 시 서버가 값을 읽어
// 클라이언트에 전달 → 상태 변경 요청 시 x-csrf-token 헤더로 되돌려 받아 비교한다.
export const CSRF_COOKIE = "ax_csrf";
export const CSRF_HEADER = "x-csrf-token";

/** 서버 컴포넌트에서 현재 CSRF 토큰을 읽는다 (없으면 빈 문자열). */
export async function getCsrfToken(): Promise<string> {
  return (await cookies()).get(CSRF_COOKIE)?.value ?? "";
}

/** 라우트 핸들러에서 CSRF 토큰 일치 여부 검증. */
export async function verifyCsrf(req: NextRequest): Promise<boolean> {
  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = req.headers.get(CSRF_HEADER);
  if (!cookieToken || !headerToken) return false;
  // 길이 우선 비교 후 상수 시간 비교
  if (cookieToken.length !== headerToken.length) return false;
  let diff = 0;
  for (let i = 0; i < cookieToken.length; i++) {
    diff |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i);
  }
  return diff === 0;
}
