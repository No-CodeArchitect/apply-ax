"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DOC_TYPES } from "@/lib/tasks";
import {
  formatBizRegNo,
  normalizeBizRegNo,
  isValidBizRegNo,
  isValidEmail,
  isValidPhone,
  passwordIssue,
} from "@/lib/validation";
import { postForm } from "@/lib/client";

const MAX_FILE_MB = 20;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

interface Guide {
  id: number;
  title: string;
  guide: string;
}
interface CreatedTask {
  id: number;
  title: string;
}
interface ApplyResponse {
  ok: boolean;
  message?: string;
  createdTasks?: CreatedTask[];
  duplicatedTasks?: CreatedTask[];
  receiptNos?: number[];
  allDuplicated?: boolean;
  needAuth?: boolean;
}

export default function ApplyForm({ guides }: { guides: Guide[] }) {
  // 1단계: 과제 선택 / 2단계: 정보 입력·첨부
  const [step, setStep] = useState<1 | 2>(1);
  const [tasks, setTasks] = useState<number[]>([]);
  const [taskError, setTaskError] = useState("");

  const [biz, setBiz] = useState("");
  const [bizState, setBizState] = useState<{
    checking: boolean;
    valid: boolean;
    exists: boolean;
  }>({ checking: false, valid: false, exists: false });

  const [f, setF] = useState({
    companyName: "",
    ceoName: "",
    applicantName: "",
    phone: "",
    email: "",
    reason: "",
    techExperience: "",
  });
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [result, setResult] = useState<ApplyResponse | null>(null);
  const [touched, setTouched] = useState(false);

  const selectedGuides = useMemo(
    () => guides.filter((g) => tasks.includes(g.id)),
    [guides, tasks]
  );

  // 사업자등록번호 등록 여부 조회 (2단계에서, 디바운스)
  useEffect(() => {
    if (step !== 2) return;
    const n = normalizeBizRegNo(biz);
    if (!isValidBizRegNo(n)) {
      setBizState({ checking: false, valid: false, exists: false });
      return;
    }
    setBizState((s) => ({ ...s, checking: true, valid: true }));
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/apply/check-biz?biz=${n}`);
        const data = await res.json();
        setBizState({ checking: false, valid: true, exists: !!data.exists });
      } catch {
        setBizState((s) => ({ ...s, checking: false }));
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [biz, step]);

  const upd = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  const toggleTask = (id: number) =>
    setTasks((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));

  // 파일 선택 즉시 20MB 초과 검사 → 초과 시 안내하고 선택을 취소한다.
  function onFileChange(key: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && file.size > MAX_FILE_BYTES) {
      setFileErrors((p) => ({
        ...p,
        [key]: `파일 용량이 ${MAX_FILE_MB}MB를 초과합니다 (${(file.size / 1024 / 1024).toFixed(1)}MB). 더 작은 파일을 첨부해 주세요.`,
      }));
      e.target.value = ""; // 초과 파일은 선택 해제
    } else {
      setFileErrors((p) => {
        const n = { ...p };
        delete n[key];
        return n;
      });
    }
  }

  // 2단계 입력값 검증
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!isValidBizRegNo(biz)) e.biz = "사업자등록번호 10자리를 정확히 입력하세요.";
    if (!f.companyName.trim()) e.companyName = "상호를 입력하세요.";
    if (!f.ceoName.trim()) e.ceoName = "대표자명을 입력하세요.";
    if (!f.applicantName.trim()) e.applicantName = "제출자 이름을 입력하세요.";
    if (!isValidPhone(f.phone)) e.phone = "연락처를 정확히 입력하세요.";
    if (!isValidEmail(f.email)) e.email = "이메일 형식이 올바르지 않습니다.";
    if (!f.reason.trim()) e.reason = "지원 사유를 입력하세요.";
    if (!f.techExperience.trim()) e.techExperience = "보유 기술·실적을 입력하세요.";
    if (bizState.valid && !bizState.exists) {
      const pe = passwordIssue(password);
      if (pe) e.password = pe;
      else if (password !== passwordConfirm) e.passwordConfirm = "비밀번호 확인이 일치하지 않습니다.";
    } else if (bizState.valid && bizState.exists) {
      if (!password) e.password = "기존 비밀번호를 입력하세요.";
    }
    return e;
  }, [biz, f, password, passwordConfirm, bizState]);

  const showErr = (key: string) => (touched ? errors[key] : undefined);

  function goNext() {
    if (tasks.length === 0) {
      setTaskError("지원할 과제를 최소 1개 선택해 주세요.");
      return;
    }
    setTaskError("");
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setServerError("");
    if (Object.keys(errors).length > 0) {
      setServerError("입력 내용을 다시 확인해 주세요.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // 20MB 초과 파일 최종 확인 (선택 직후 걸러지지만 안전장치)
    for (const dt of DOC_TYPES) {
      const file = fileRefs.current[dt.key]?.files?.[0];
      if (file && file.size > MAX_FILE_BYTES) {
        setServerError(`${dt.label} 파일이 ${MAX_FILE_MB}MB를 초과합니다. 더 작은 파일을 첨부해 주세요.`);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    const fd = new FormData();
    tasks.forEach((t) => fd.append("tasks", String(t)));
    fd.append("bizRegNo", normalizeBizRegNo(biz));
    Object.entries(f).forEach(([k, v]) => fd.append(k, v));
    fd.append("password", password);
    fd.append("passwordConfirm", passwordConfirm);
    for (const dt of DOC_TYPES) {
      const file = fileRefs.current[dt.key]?.files?.[0];
      if (file) fd.append(dt.key, file);
    }

    setSubmitting(true);
    try {
      const { status, data } = await postForm<ApplyResponse>("/api/apply", fd);
      if (status === 200 && data.ok) {
        setResult(data);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setServerError(data.message || "접수 처리 중 오류가 발생했습니다.");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      setServerError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── 접수 완료 화면 ────────────────────────────────────────
  if (result?.ok) {
    return (
      <div className="card mt-8 p-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
          ✓
        </div>
        <h2 className="text-xl font-bold text-navy-800">접수가 완료되었습니다</h2>
        <p className="mt-2 text-sm text-slate-600">
          아래 접수번호로 정상 접수되었습니다. 접수 내용은 「접수 조회·수정」에서 사업자등록번호와
          비밀번호로 확인·수정하실 수 있습니다.
        </p>
        <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm">
          <div className="font-semibold text-slate-700">접수된 과제</div>
          <ul className="mt-2 space-y-1">
            {result.createdTasks?.map((t, i) => (
              <li key={t.id} className="flex justify-between">
                <span>{t.title}</span>
                <span className="text-slate-400">접수번호 #{result.receiptNos?.[i]}</span>
              </li>
            ))}
          </ul>
          {result.duplicatedTasks && result.duplicatedTasks.length > 0 && (
            <p className="mt-3 text-xs text-amber-700">
              ※ 이미 접수된 과제({result.duplicatedTasks.map((t) => t.title).join(", ")})는
              제외되었습니다. 수정은 접수 조회 페이지에서 하실 수 있습니다.
            </p>
          )}
        </div>
        <div className="mt-6 flex gap-3">
          <Link href="/lookup" className="btn-primary">접수 조회·수정</Link>
          <Link href="/" className="btn-outline">홈으로</Link>
        </div>
      </div>
    );
  }

  const newBiz = bizState.valid && !bizState.exists;
  const existingBiz = bizState.valid && bizState.exists;

  // ── 1단계: 과제 선택 ──────────────────────────────────────
  if (step === 1) {
    return (
      <div className="mt-8">
        <div className="mb-5 flex items-center gap-2 text-sm">
          <span className="badge bg-navy-700 text-white">1 과제 선택</span>
          <span className="text-slate-300">→</span>
          <span className="badge bg-slate-100 text-slate-400">2 정보 입력·첨부</span>
        </div>

        <section className="card p-6">
          <h2 className="text-base font-semibold text-navy-800">
            <span className="req">지원할 과제를 선택하세요</span>
          </h2>
          <p className="mt-1 text-xs text-slate-500">복수 선택이 가능하며, 과제별로 개별 접수됩니다.</p>
          <div className="mt-4 space-y-3">
            {guides.map((g) => {
              const checked = tasks.includes(g.id);
              return (
                <label
                  key={g.id}
                  className={`block cursor-pointer rounded-lg border p-4 transition ${
                    checked ? "border-navy-500 bg-navy-50" : "border-slate-200 hover:border-navy-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-navy-700"
                      checked={checked}
                      onChange={() => toggleTask(g.id)}
                    />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-navy-800">{g.title}</span>
                      {g.guide && (
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">{g.guide}</p>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          {taskError && <p className="field-error">{taskError}</p>}
        </section>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Link href="/" className="btn-outline">취소</Link>
          <button type="button" className="btn-primary" onClick={goNext}>
            다음 단계 →
          </button>
        </div>
      </div>
    );
  }

  // ── 2단계: 정보 입력 · 첨부 ───────────────────────────────
  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-8" noValidate>
      <div className="flex items-center gap-2 text-sm">
        <button type="button" onClick={goBack} className="badge bg-slate-100 text-slate-500 hover:bg-slate-200">
          1 과제 선택
        </button>
        <span className="text-slate-300">→</span>
        <span className="badge bg-navy-700 text-white">2 정보 입력·첨부</span>
      </div>

      {serverError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* 선택한 과제 요약 */}
      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-navy-800">선택한 과제</h2>
          <button type="button" onClick={goBack} className="text-xs text-navy-600 underline">
            변경
          </button>
        </div>
        <ul className="mt-3 space-y-1.5">
          {selectedGuides.map((g) => (
            <li key={g.id} className="flex items-center gap-2 text-sm text-slate-700">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-navy-100 text-[11px] font-bold text-navy-700">
                {g.id}
              </span>
              {g.title}
            </li>
          ))}
        </ul>
      </section>

      {/* 기업 정보 */}
      <section className="card p-6">
        <h2 className="text-base font-semibold text-navy-800">기업 정보</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label req">사업자등록번호</label>
            <input
              className="input"
              inputMode="numeric"
              placeholder="000-00-00000"
              value={biz}
              onChange={(e) => setBiz(formatBizRegNo(e.target.value))}
              onBlur={() => setTouched(true)}
              maxLength={12}
            />
            {bizState.checking && <p className="mt-1 text-xs text-slate-400">확인 중…</p>}
            {existingBiz && (
              <p className="mt-1 text-xs text-navy-600">
                이미 등록된 사업자등록번호입니다. 기존 비밀번호로 인증 후 접수됩니다.
              </p>
            )}
            {newBiz && (
              <p className="mt-1 text-xs text-emerald-600">신규 사업자등록번호 — 비밀번호를 새로 설정합니다.</p>
            )}
            {showErr("biz") && <p className="field-error">{showErr("biz")}</p>}
          </div>
          <div>
            <label className="label req">상호(기업명)</label>
            <input className="input" value={f.companyName} onChange={upd("companyName")} />
            {showErr("companyName") && <p className="field-error">{showErr("companyName")}</p>}
          </div>
          <div>
            <label className="label req">대표자명</label>
            <input className="input" value={f.ceoName} onChange={upd("ceoName")} />
            {showErr("ceoName") && <p className="field-error">{showErr("ceoName")}</p>}
          </div>
          <div>
            <label className="label req">제출자(담당자) 이름</label>
            <input className="input" value={f.applicantName} onChange={upd("applicantName")} />
            {showErr("applicantName") && <p className="field-error">{showErr("applicantName")}</p>}
          </div>
          <div>
            <label className="label req">연락처</label>
            <input className="input" placeholder="010-0000-0000" value={f.phone} onChange={upd("phone")} />
            {showErr("phone") && <p className="field-error">{showErr("phone")}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="label req">이메일</label>
            <input className="input" type="email" placeholder="name@company.com" value={f.email} onChange={upd("email")} />
            {showErr("email") && <p className="field-error">{showErr("email")}</p>}
          </div>
        </div>
      </section>

      {/* 지원 내용 */}
      <section className="card p-6">
        <h2 className="text-base font-semibold text-navy-800">지원 내용</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="label req">지원 사유</label>
            <textarea className="input min-h-[120px]" value={f.reason} onChange={upd("reason")} />
            {showErr("reason") && <p className="field-error">{showErr("reason")}</p>}
          </div>
          <div>
            <label className="label req">보유 기술 / 실적</label>
            <textarea className="input min-h-[120px]" value={f.techExperience} onChange={upd("techExperience")} />
            {showErr("techExperience") && <p className="field-error">{showErr("techExperience")}</p>}
          </div>
        </div>
      </section>

      {/* 첨부파일 */}
      <section className="card p-6">
        <h2 className="text-base font-semibold text-navy-800">첨부 서류</h2>
        <p className="mt-1 text-xs text-slate-500">PDF / HWP / HWPX / DOC / DOCX · 파일당 최대 20MB</p>
        <div className="mt-4 space-y-4">
          {DOC_TYPES.map((dt) => (
            <div key={dt.key}>
              <label className={`label ${dt.required ? "req" : ""}`}>{dt.label}</label>
              <input
                ref={(el) => {
                  fileRefs.current[dt.key] = el;
                }}
                type="file"
                accept=".pdf,.hwp,.hwpx,.doc,.docx"
                onChange={(e) => onFileChange(dt.key, e)}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-navy-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-navy-700 hover:file:bg-navy-200"
              />
              {fileErrors[dt.key] && <p className="field-error">{fileErrors[dt.key]}</p>}
            </div>
          ))}
          <p className="text-xs text-slate-400">※ 파일당 최대 {MAX_FILE_MB}MB 까지 첨부할 수 있습니다.</p>
        </div>
      </section>

      {/* 비밀번호 */}
      <section className="card p-6">
        <h2 className="text-base font-semibold text-navy-800">
          {existingBiz ? "비밀번호 인증" : "비밀번호 설정"}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {existingBiz
            ? "이미 등록된 사업자등록번호입니다. 기존 비밀번호를 입력해 주세요."
            : "비밀번호는 사업자등록번호 단위로 통일 관리됩니다. (8자 이상, 영문+숫자)"}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label req">비밀번호</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {showErr("password") && <p className="field-error">{showErr("password")}</p>}
          </div>
          {newBiz && (
            <div>
              <label className="label req">비밀번호 확인</label>
              <input
                className="input"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
              {showErr("passwordConfirm") && <p className="field-error">{showErr("passwordConfirm")}</p>}
            </div>
          )}
        </div>
        {existingBiz && (
          <p className="mt-3 text-xs text-slate-500">
            비밀번호가 기억나지 않으면{" "}
            <Link href="/forgot-password" className="underline">비밀번호 찾기</Link>를 이용하세요.
          </p>
        )}
      </section>

      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={goBack} className="btn-outline">← 이전</button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "제출 중…" : "접수 제출"}
        </button>
      </div>
    </form>
  );
}
