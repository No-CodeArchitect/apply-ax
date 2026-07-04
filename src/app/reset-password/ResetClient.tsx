"use client";

import { useState } from "react";
import Link from "next/link";
import { passwordIssue } from "@/lib/validation";
import { postJson } from "@/lib/client";

export default function ResetClient({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="card mt-8 p-6 text-sm text-slate-600">
        유효하지 않은 접근입니다. 비밀번호 찾기를 다시 진행해 주세요.
        <div className="mt-4">
          <Link href="/forgot-password" className="btn-outline">비밀번호 찾기</Link>
        </div>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const pe = passwordIssue(password);
    if (pe) return setError(pe);
    if (password !== passwordConfirm) return setError("비밀번호 확인이 일치하지 않습니다.");
    setLoading(true);
    try {
      const { status, data } = await postJson<{ ok: boolean; message?: string }>(
        "/api/reset-password",
        { token, password, passwordConfirm }
      );
      if (status === 200 && data.ok) setDone(true);
      else setError(data.message || "재설정에 실패했습니다.");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="card mt-8 p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">✓</div>
        <h2 className="text-lg font-bold text-navy-800">비밀번호가 재설정되었습니다</h2>
        <div className="mt-6">
          <Link href="/lookup" className="btn-primary">접수 조회로 이동</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card mt-8 space-y-4 p-6" noValidate>
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      <div>
        <label className="label req">새 비밀번호</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div>
        <label className="label req">새 비밀번호 확인</label>
        <input className="input" type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "재설정 중…" : "비밀번호 재설정"}
      </button>
    </form>
  );
}
