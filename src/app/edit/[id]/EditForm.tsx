"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isValidEmail, isValidPhone } from "@/lib/validation";
import { postForm } from "@/lib/client";

interface Submission {
  id: number;
  companyName: string;
  ceoName: string;
  applicantName: string;
  phone: string;
  email: string;
  reason: string;
  techExperience: string;
}
interface AttGroup {
  key: string;
  label: string;
  required: boolean;
  files: { name: string; size: number }[];
}

export default function EditForm({
  submission,
  attachments,
}: {
  submission: Submission;
  attachments: AttGroup[];
}) {
  const router = useRouter();
  const [f, setF] = useState(submission);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const upd = (k: keyof Submission) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!f.companyName.trim() || !f.ceoName.trim() || !f.applicantName.trim())
      return setError("필수 항목을 입력해 주세요.");
    if (!isValidPhone(f.phone)) return setError("연락처 형식이 올바르지 않습니다.");
    if (!isValidEmail(f.email)) return setError("이메일 형식이 올바르지 않습니다.");
    if (!f.reason.trim() || !f.techExperience.trim())
      return setError("지원 사유와 보유 기술·실적을 입력해 주세요.");

    const fd = new FormData();
    fd.append("submissionId", String(submission.id));
    fd.append("companyName", f.companyName);
    fd.append("ceoName", f.ceoName);
    fd.append("applicantName", f.applicantName);
    fd.append("phone", f.phone);
    fd.append("email", f.email);
    fd.append("reason", f.reason);
    fd.append("techExperience", f.techExperience);
    for (const g of attachments) {
      const file = fileRefs.current[g.key]?.files?.[0];
      if (file) fd.append(g.key, file);
    }

    setSaving(true);
    try {
      const { status, data } = await postForm<{ ok: boolean; message?: string }>("/api/edit", fd);
      if (status === 200 && data.ok) {
        setDone(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError(data.message || "수정에 실패했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="card mt-8 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">✓</div>
        <h2 className="text-lg font-bold text-navy-800">수정이 저장되었습니다</h2>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => router.push("/lookup")} className="btn-primary">접수 조회로</button>
          <button onClick={() => setDone(false)} className="btn-outline">계속 수정</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-8" noValidate>
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <section className="card p-6">
        <h2 className="text-base font-semibold text-navy-800">기업 정보</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label req">상호(기업명)</label>
            <input className="input" value={f.companyName} onChange={upd("companyName")} />
          </div>
          <div>
            <label className="label req">대표자명</label>
            <input className="input" value={f.ceoName} onChange={upd("ceoName")} />
          </div>
          <div>
            <label className="label req">제출자 이름</label>
            <input className="input" value={f.applicantName} onChange={upd("applicantName")} />
          </div>
          <div>
            <label className="label req">연락처</label>
            <input className="input" value={f.phone} onChange={upd("phone")} />
          </div>
          <div className="sm:col-span-2">
            <label className="label req">이메일</label>
            <input className="input" type="email" value={f.email} onChange={upd("email")} />
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-base font-semibold text-navy-800">지원 내용</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="label req">지원 사유</label>
            <textarea className="input min-h-[120px]" value={f.reason} onChange={upd("reason")} />
          </div>
          <div>
            <label className="label req">보유 기술 / 실적</label>
            <textarea className="input min-h-[120px]" value={f.techExperience} onChange={upd("techExperience")} />
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-base font-semibold text-navy-800">첨부 서류</h2>
        <p className="mt-1 text-xs text-slate-500">
          새 파일을 선택하면 해당 서류가 교체됩니다. 그대로 두면 기존 파일이 유지됩니다.
        </p>
        <div className="mt-4 space-y-4">
          {attachments.map((g) => (
            <div key={g.key}>
              <label className={`label ${g.required ? "req" : ""}`}>{g.label}</label>
              {g.files.length > 0 ? (
                <p className="mb-1 text-xs text-slate-500">
                  현재 파일: {g.files.map((x) => x.name).join(", ")}
                </p>
              ) : (
                <p className="mb-1 text-xs text-slate-400">등록된 파일 없음</p>
              )}
              <input
                ref={(el) => { fileRefs.current[g.key] = el; }}
                type="file"
                accept=".pdf,.hwp,.hwpx,.doc,.docx"
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-navy-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-navy-700 hover:file:bg-navy-200"
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <Link href="/lookup" className="btn-outline">취소</Link>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "저장 중…" : "수정 저장"}
        </button>
      </div>
    </form>
  );
}
