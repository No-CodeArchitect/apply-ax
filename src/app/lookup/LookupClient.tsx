"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatBizRegNo, normalizeBizRegNo, isValidBizRegNo } from "@/lib/validation";
import { formatDateTime } from "@/lib/format";
import { postJson } from "@/lib/client";

interface SubItem {
  id: number;
  taskId: number;
  taskTitle: string;
  companyName: string;
  applicantName: string;
  createdAt: string;
}
interface LookupResponse {
  ok: boolean;
  message?: string;
  editable?: boolean;
  phase?: string;
  submissions?: SubItem[];
}

export default function LookupClient() {
  const router = useRouter();
  const [biz, setBiz] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LookupResponse | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!isValidBizRegNo(biz)) return setError("사업자등록번호를 정확히 입력해 주세요.");
    if (!password) return setError("비밀번호를 입력해 주세요.");
    setLoading(true);
    try {
      const { status, data } = await postJson<LookupResponse>("/api/lookup", {
        bizRegNo: normalizeBizRegNo(biz),
        password,
      });
      if (status === 200 && data.ok) setResult(data);
      else setError(data.message || "조회에 실패했습니다.");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (result?.ok) {
    const subs = result.submissions || [];
    return (
      <div className="mt-8">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-navy-800">접수 내역</h2>
            {!result.editable && (
              <span className="badge bg-slate-200 text-slate-600">
                {result.phase === "before" ? "접수 기간 아님" : "접수 마감"}
              </span>
            )}
          </div>
          {subs.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">접수된 내역이 없습니다.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {subs.map((s) => (
                <li key={s.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-navy-800">{s.taskTitle}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {s.companyName} · 제출자 {s.applicantName} · {formatDateTime(s.createdAt)}
                    </div>
                  </div>
                  {result.editable ? (
                    <button
                      onClick={() => router.push(`/edit/${s.id}`)}
                      className="btn-outline shrink-0"
                    >
                      수정하기
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">접수가 마감되어 수정할 수 없습니다</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-slate-400">
            상세 내용(지원 사유, 첨부파일 등)은 「수정하기」에서 확인할 수 있습니다.
          </p>
        </div>
        <div className="mt-4">
          <Link href="/" className="btn-ghost">홈으로</Link>
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
        <label className="label req">비밀번호</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "조회 중…" : "조회하기"}
      </button>
      <div className="flex justify-between text-xs text-slate-500">
        <Link href="/forgot-password" className="underline">비밀번호를 잊으셨나요?</Link>
        <Link href="/apply" className="underline">신규 접수하기</Link>
      </div>
    </form>
  );
}
