"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/client";

export default function AdminChangePasswordPage() {
  const router = useRouter();
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (pw !== pw2) return setError("새 비밀번호 확인이 일치하지 않습니다.");
    setLoading(true);
    try {
      const { status, data } = await postJson<{ ok: boolean; message?: string }>(
        "/api/admin/change-password",
        { currentPassword: cur, newPassword: pw, newPasswordConfirm: pw2 }
      );
      if (status === 200 && data.ok) {
        router.push("/admin");
        router.refresh();
      } else setError(data.message || "변경에 실패했습니다.");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-sm">
        <h1 className="text-xl font-bold text-navy-800">비밀번호 변경</h1>
        <p className="mt-1 text-sm text-slate-500">보안을 위해 초기 비밀번호를 변경해 주세요. (8자 이상, 영문+숫자)</p>
        <form onSubmit={onSubmit} className="card mt-6 space-y-4 p-6" noValidate>
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          <div>
            <label className="label">현재 비밀번호</label>
            <input className="input" type="password" value={cur} onChange={(e) => setCur(e.target.value)} />
          </div>
          <div>
            <label className="label">새 비밀번호</label>
            <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div>
            <label className="label">새 비밀번호 확인</label>
            <input className="input" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "변경 중…" : "변경하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
