"use client";

import { useState } from "react";
import Link from "next/link";
import { formatBizRegNo, normalizeBizRegNo, isValidBizRegNo, isValidEmail } from "@/lib/validation";
import { postJson } from "@/lib/client";

export default function ForgotClient({ support }: { support: string }) {
  const [biz, setBiz] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!isValidBizRegNo(biz)) return setError("사업자등록번호를 정확히 입력해 주세요.");
    if (!isValidEmail(email)) return setError("이메일 형식이 올바르지 않습니다.");
    setLoading(true);
    try {
      const { status, data } = await postJson<{ ok: boolean; message?: string }>(
        "/api/forgot-password",
        { bizRegNo: normalizeBizRegNo(biz), email }
      );
      if (status === 200 && data.ok) setMessage(data.message || "요청이 접수되었습니다.");
      else setError(data.message || "요청 처리에 실패했습니다.");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8">
      {message ? (
        <div className="card p-6">
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
          <div className="mt-6">
            <Link href="/lookup" className="btn-outline">접수 조회로</Link>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="card space-y-4 p-6" noValidate>
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          <div>
            <label className="label req">사업자등록번호</label>
            <input
              className="input"
              inputMode="numeric"
              placeholder="000-00-00000"
              maxLength={12}
              value={biz}
              onChange={(e) => setBiz(formatBizRegNo(e.target.value))}
            />
          </div>
          <div>
            <label className="label req">등록 이메일</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "요청 중…" : "재설정 링크 받기"}
          </button>
        </form>
      )}

      <div className="mt-4 rounded-lg bg-slate-100 p-4 text-xs leading-relaxed text-slate-500">
        등록 이메일이 기억나지 않거나 정보가 일치하지 않는 경우, 관리자가 수동으로 초기화할 수 있습니다.
        <br />
        <span className="font-semibold text-slate-600">문의: {support}</span>
      </div>
    </div>
  );
}
