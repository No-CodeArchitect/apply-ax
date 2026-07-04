// 클라이언트 컴포넌트용 fetch 헬퍼. CSRF 토큰(ax_csrf 쿠키)을 헤더로 첨부한다.
"use client";

export function getCsrfToken(): string {
  const m = document.cookie.match(/(?:^|;\s*)ax_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

export async function postJson<T = unknown>(
  url: string,
  body: unknown
): Promise<{ status: number; data: T }> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": getCsrfToken(),
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, data };
}

export async function postForm<T = unknown>(
  url: string,
  form: FormData
): Promise<{ status: number; data: T }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "x-csrf-token": getCsrfToken() },
    body: form,
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, data };
}
