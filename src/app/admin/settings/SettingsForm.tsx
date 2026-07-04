"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/client";

interface Guide {
  id: number;
  title: string;
  guide: string;
}

export default function SettingsForm({
  start,
  end,
  guides,
}: {
  start: string;
  end: string;
  guides: Guide[];
}) {
  const router = useRouter();
  const [s, setS] = useState(start);
  const [e, setE] = useState(end);
  const [g, setG] = useState<Record<number, string>>(
    Object.fromEntries(guides.map((x) => [x.id, x.guide]))
  );
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setErr("");
    setMsg("");
    if (!s || !e) return setErr("시작/마감 일시를 입력해 주세요.");
    setLoading(true);
    try {
      // datetime-local 값을 KST(+09:00)로 해석하여 전송
      const payload: Record<string, string> = {
        start: `${s}:00+09:00`,
        end: `${e}:00+09:00`,
      };
      for (const gu of guides) payload[`task${gu.id}_guide`] = g[gu.id] ?? "";
      const { status, data } = await postJson<{ ok: boolean; message?: string }>(
        "/api/admin/settings",
        payload
      );
      if (status === 200 && data.ok) {
        setMsg("설정이 저장되었습니다.");
        router.refresh();
      } else setErr(data.message || "저장에 실패했습니다.");
    } catch {
      setErr("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 max-w-2xl space-y-6">
      {msg && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{msg}</div>
      )}
      {err && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
      )}

      <section className="card p-6">
        <h2 className="text-base font-semibold text-navy-800">접수 기간</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">접수 시작 일시</label>
            <input type="datetime-local" className="input" value={s} onChange={(ev) => setS(ev.target.value)} />
          </div>
          <div>
            <label className="label">접수 마감 일시</label>
            <input type="datetime-local" className="input" value={e} onChange={(ev) => setE(ev.target.value)} />
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-400">마감 시각 이후에는 서버에서 신규 접수·수정이 자동 차단됩니다.</p>
      </section>

      <section className="card p-6">
        <h2 className="text-base font-semibold text-navy-800">과제 안내 문구</h2>
        <div className="mt-4 space-y-4">
          {guides.map((gu) => (
            <div key={gu.id}>
              <label className="label">{gu.id}. {gu.title}</label>
              <textarea
                className="input min-h-[70px]"
                value={g[gu.id] ?? ""}
                onChange={(ev) => setG((prev) => ({ ...prev, [gu.id]: ev.target.value }))}
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "저장 중…" : "설정 저장"}
        </button>
      </div>
    </form>
  );
}
