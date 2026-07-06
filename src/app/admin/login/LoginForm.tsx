"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/client";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username || !password) return setError("아이디와 비밀번호를 입력해 주세요.");
    setLoading(true);
    try {
      const { status, data } = await postJson<{ ok: boolean; mustChange?: boolean; message?: string }>(
        "/api/admin/login",
        { username, password }
      );
      if (status === 200 && data.ok) {
        router.push(data.mustChange ? "/admin/change-password" : "/admin");
        router.refresh();
      } else {
        setError(data.message || "로그인에 실패했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-navy-700 text-white">
            AX
          </div>
          <h1 className="text-xl font-bold text-navy-800">관리자 로그인</h1>
          <p className="mt-1 text-sm text-slate-500">접수 관리 시스템</p>
        </div>
        <form onSubmit={onSubmit} className="card space-y-4 p-6" noValidate>
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          <div>
            <label className="label">아이디</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </div>
          <div>
            <label className="label">비밀번호</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "로그인 중…" : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
