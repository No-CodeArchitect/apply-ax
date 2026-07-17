"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import EvalNav from "../../../EvalNav";

interface CriteriaItem {
  id: number;
  code: string;
  label: string;
  maxScore: number;
  score: number | null;
}

export default function EvaluationDetailPage() {
  const { taskId, submissionId } = useParams<{ taskId: string; submissionId: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [attachments, setAttachments] = useState<{ id: number; fileName: string; fileType: string }[]>([]);
  const [criteria, setCriteria] = useState<CriteriaItem[]>([]);
  const [scores, setScores] = useState<Record<number, string>>({});
  const [comment, setComment] = useState("");
  const [isFinal, setIsFinal] = useState(false);
  const [reviewer, setReviewer] = useState<{ name: string; group: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/evaluate/submissions/${submissionId}`).then((r) => r.json()),
      fetch("/api/evaluate/tasks").then((r) => r.json()),
    ]).then(([data, taskData]) => {
      if (data.ok) {
        setCompanyName(data.submission.companyName);
        setAttachments(data.submission.attachments || []);
        setCriteria(data.criteria);
        setIsFinal(data.isFinal);
        setComment(data.comment || "");
        const s: Record<number, string> = {};
        for (const c of data.criteria) {
          s[c.id] = c.score !== null ? String(c.score) : "";
        }
        setScores(s);
      }
      if (taskData.ok) setReviewer(taskData.reviewer);
      setLoading(false);
    });
  }, [submissionId]);

  const totalScore = criteria.reduce((sum, c) => {
    const v = parseInt(scores[c.id] || "", 10);
    return sum + (isNaN(v) ? 0 : v);
  }, 0);

  const handleScoreChange = (criteriaId: number, value: string) => {
    if (isFinal) return;
    const cleaned = value.replace(/[^0-9]/g, "");
    setScores((prev) => ({ ...prev, [criteriaId]: cleaned }));
  };

  const flash = useCallback((type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  const handleSave = async () => {
    if (isFinal) return;
    setSaving(true);
    setMessage(null);

    const scoreList = criteria.map((c) => ({
      criteriaId: c.id,
      score: scores[c.id] === "" ? null : parseInt(scores[c.id], 10),
    }));

    const res = await fetch(`/api/evaluate/submissions/${submissionId}/scores`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scores: scoreList, comment }),
    });
    const data = await res.json();
    setSaving(false);

    if (data.ok) {
      flash("ok", "임시저장 되었습니다.");
    } else {
      flash("err", data.message || "저장에 실패했습니다.");
    }
  };

  const handleSubmit = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    setMessage(null);

    // 먼저 점수 저장
    const scoreList = criteria.map((c) => ({
      criteriaId: c.id,
      score: scores[c.id] === "" ? null : parseInt(scores[c.id], 10),
    }));

    const saveRes = await fetch(`/api/evaluate/submissions/${submissionId}/scores`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scores: scoreList, comment }),
    });
    const saveData = await saveRes.json();
    if (!saveData.ok) {
      flash("err", saveData.message || "저장에 실패했습니다.");
      setSubmitting(false);
      return;
    }

    const res = await fetch(`/api/evaluate/submissions/${submissionId}/submit`, {
      method: "POST",
    });
    const data = await res.json();
    setSubmitting(false);

    if (data.ok) {
      setIsFinal(true);
      flash("ok", "최종 제출이 완료되었습니다.");
    } else {
      flash("err", data.message || "제출에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-navy-200 border-t-navy-700" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {reviewer && <EvalNav name={reviewer.name} group={reviewer.group} />}

      <div className="container-page py-4">
        <div className="mb-3 text-sm text-slate-500">
          <Link href="/evaluate/tasks" className="hover:underline">과제 목록</Link>
          {" "}&rsaquo;{" "}
          <Link href={`/evaluate/tasks/${taskId}`} className="hover:underline">과제 {taskId}</Link>
          {" "}&rsaquo; {companyName}
        </div>

        {isFinal && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            최종 제출 완료 — 수정이 불가합니다.
          </div>
        )}

        {message && (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
              message.type === "ok"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      <div className="flex-1 container-page pb-8">
        <div className="mx-auto max-w-2xl">
          <div className="card p-5">
            <h2 className="text-base font-bold text-navy-800">{companyName}</h2>
            <p className="mt-0.5 text-xs text-slate-500">과제 {taskId} 평가</p>

            {attachments.length > 0 && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-xs font-semibold text-slate-600">첨부서류 다운로드</p>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att) => (
                    <a
                      key={att.id}
                      href={`/api/evaluate/attachments/${att.id}`}
                      download
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-navy-700 transition hover:border-navy-400 hover:bg-navy-50"
                    >
                      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3" />
                      </svg>
                      {att.fileType === "proposal" ? "연구개발계획서" : att.fileType === "biz_license" ? "회사소개자료" : att.fileName}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 space-y-4">
              {criteria.map((c) => {
                const val = scores[c.id] || "";
                const numVal = parseInt(val, 10);
                const isOver = !isNaN(numVal) && numVal > c.maxScore;
                return (
                  <div key={c.id}>
                    <label className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{c.label}</span>
                      <span className="text-xs text-slate-400">0~{c.maxScore}점</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={c.maxScore}
                      value={val}
                      onChange={(e) => handleScoreChange(c.id, e.target.value)}
                      disabled={isFinal}
                      className={`input mt-1 text-right tabular-nums ${
                        isOver ? "border-red-400 focus:border-red-500 focus:ring-red-400" : ""
                      }`}
                      placeholder="점수 입력"
                    />
                    {isOver && (
                      <p className="field-error">최대 {c.maxScore}점을 초과했습니다.</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
              <span className="text-sm font-semibold text-slate-700">합계</span>
              <span className="text-xl font-bold tabular-nums text-navy-800">
                {totalScore}
                <span className="text-sm font-normal text-slate-400"> / 100</span>
              </span>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4">
              <label className="text-sm font-medium text-slate-700">
                의견 <span className="font-normal text-slate-400">(선택, 참고용)</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isFinal}
                rows={4}
                className="input mt-1.5 resize-y"
                placeholder="해당 기업에 대한 정성적 의견을 자유롭게 작성해 주세요."
              />
            </div>

            {!isFinal && (
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-outline flex-1"
                >
                  {saving ? "저장 중..." : "임시저장"}
                </button>
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={submitting}
                  className="btn-primary flex-1"
                >
                  최종제출
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 최종제출 확인 모달 */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-navy-800">최종 제출 확인</h3>
            <p className="mt-2 text-sm text-slate-600">
              제출 후에는 점수를 수정할 수 없습니다.<br />
              정말 최종 제출하시겠습니까?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="btn-outline flex-1"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                className="btn-primary flex-1"
              >
                제출
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
