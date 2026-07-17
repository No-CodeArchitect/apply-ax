"use client";

import { useEffect, useState } from "react";

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────
interface ReviewerStatus {
  id: number;
  name: string;
  group: string;
  org: string;
  email: string | null;
  tasks: { taskId: number; completed: number; total: number }[];
}
interface TaskInfo { id: number; title: string; short: string; submissionCount: number; }

interface MatrixScore {
  reviewerId: number;
  reviewerName: string;
  totalScore: number;
  isFinal: boolean;
  comment: string | null;
}
interface MatrixRow {
  submissionId: number;
  companyName: string;
  scores: MatrixScore[];
  average: number | null;
}

interface NormReviewerScore {
  reviewerId: number;
  reviewerName: string;
  rawScore: number;
  convertedScore: number;
}
interface NormResult {
  submissionId: number;
  companyName: string;
  reviewerScores: NormReviewerScore[];
  finalScore: number;
  rank: number;
}

interface ReviewerInfo {
  id: number;
  name: string;
  affiliation_group: string;
  org: string | null;
  email: string | null;
  magicLink: string | null;
  tokenExpiresAt: string | null;
}

type Tab = "status" | "matrix" | "normalized" | "reviewers";
const groupLabel: Record<string, string> = { snu: "서울대", airforce: "공군", aihub: "AI허브" };

export default function EvaluateAdmin() {
  const [tab, setTab] = useState<Tab>("status");
  const [selectedTask, setSelectedTask] = useState(1);

  const tabs: { key: Tab; label: string }[] = [
    { key: "status", label: "제출 현황" },
    { key: "matrix", label: "점수 매트릭스" },
    { key: "normalized", label: "정규화 결과" },
    { key: "reviewers", label: "위원 관리" },
  ];

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-navy-800">평가 관리</h1>

      <div className="mt-4 flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition ${
              tab === t.key
                ? "border-b-2 border-navy-700 text-navy-800"
                : "text-slate-500 hover:text-navy-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "status" && <StatusPanel />}
        {tab === "matrix" && <MatrixPanel taskId={selectedTask} onChangeTask={setSelectedTask} />}
        {tab === "normalized" && <NormalizedPanel taskId={selectedTask} onChangeTask={setSelectedTask} />}
        {tab === "reviewers" && <ReviewersPanel />}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 1. 제출 현황
// ──────────────────────────────────────────────────────────────
function StatusPanel() {
  const [data, setData] = useState<{ reviewers: ReviewerStatus[]; tasks: TaskInfo[] } | null>(null);

  useEffect(() => {
    fetch("/api/admin/evaluate/status").then((r) => r.json()).then((d) => d.ok && setData(d));
  }, []);

  if (!data) return <Loading />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            <th className="px-3 py-2 font-semibold text-slate-600">위원</th>
            <th className="px-3 py-2 font-semibold text-slate-600">소속</th>
            {data.tasks.map((t) => (
              <th key={t.id} className="px-3 py-2 text-center font-semibold text-slate-600">
                {t.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.reviewers.map((r) => (
            <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-3 py-2.5 font-medium text-navy-800">{r.name}</td>
              <td className="px-3 py-2.5 text-slate-500">
                <span className="badge bg-slate-100 text-slate-600">{groupLabel[r.group] || r.group}</span>
              </td>
              {r.tasks.map((t) => {
                const done = t.completed === t.total && t.total > 0;
                const started = t.completed > 0;
                return (
                  <td key={t.taskId} className="px-3 py-2.5 text-center">
                    <span
                      className={`badge ${
                        done ? "bg-green-100 text-green-700" :
                        started ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {t.completed}/{t.total}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 2. 점수 매트릭스
// ──────────────────────────────────────────────────────────────
function TaskSelector({ taskId, onChange }: { taskId: number; onChange: (id: number) => void }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      {[1, 2, 3].map((id) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            taskId === id ? "bg-navy-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          과제 {id}
        </button>
      ))}
    </div>
  );
}

function MatrixPanel({ taskId, onChangeTask }: { taskId: number; onChangeTask: (id: number) => void }) {
  const [data, setData] = useState<{
    reviewers: { id: number; name: string }[];
    matrix: MatrixRow[];
  } | null>(null);

  useEffect(() => {
    setData(null);
    fetch(`/api/admin/evaluate/matrix?taskId=${taskId}`).then((r) => r.json()).then((d) => d.ok && setData(d));
  }, [taskId]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <TaskSelector taskId={taskId} onChange={onChangeTask} />
        <div className="flex gap-2">
          <a
            href={`/api/admin/evaluate/export?taskId=${taskId}&type=raw`}
            className="btn-outline text-xs"
          >
            원점수 CSV
          </a>
        </div>
      </div>

      {!data ? (
        <Loading />
      ) : data.matrix.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">이 과제에 지원 기업이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="sticky left-0 bg-white px-3 py-2 font-semibold text-slate-600">기업명</th>
                {data.reviewers.map((r) => (
                  <th key={r.id} className="whitespace-nowrap px-3 py-2 text-center font-semibold text-slate-600">
                    {r.name}
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-semibold text-slate-600">평균</th>
              </tr>
            </thead>
            <tbody>
              {data.matrix.map((row) => (
                <tr key={row.submissionId} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="sticky left-0 bg-white px-3 py-2.5 font-medium text-navy-800">
                    {row.companyName}
                  </td>
                  {row.scores.map((s) => (
                    <td key={s.reviewerId} className="px-3 py-2.5 text-center tabular-nums">
                      {s.isFinal ? (
                        <span className="font-semibold text-navy-800">{s.totalScore}</span>
                      ) : s.totalScore > 0 ? (
                        <span className="text-amber-600">{s.totalScore}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-center tabular-nums font-semibold">
                    {row.average !== null ? (
                      <span className={row.average < 60 ? "text-red-600" : "text-navy-800"}>
                        {row.average}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-400">
            굵은 숫자 = 최종제출, 주황 = 임시저장, - = 미입력. 평균은 최종제출된 점수만 반영.
          </p>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 3. 정규화 결과
// ──────────────────────────────────────────────────────────────
function NormalizedPanel({ taskId, onChangeTask }: { taskId: number; onChangeTask: (id: number) => void }) {
  const [data, setData] = useState<{
    reviewers: { id: number; name: string }[];
    results: NormResult[];
  } | null>(null);

  useEffect(() => {
    setData(null);
    fetch(`/api/admin/evaluate/normalized?taskId=${taskId}`).then((r) => r.json()).then((d) => d.ok && setData(d));
  }, [taskId]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <TaskSelector taskId={taskId} onChange={onChangeTask} />
        <div className="flex gap-2">
          <a
            href={`/api/admin/evaluate/export?taskId=${taskId}&type=normalized`}
            className="btn-outline text-xs"
          >
            정규화 CSV
          </a>
        </div>
      </div>

      {!data ? (
        <Loading />
      ) : data.results.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">이 과제에 지원 기업이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="px-3 py-2 font-semibold text-slate-600">순위</th>
                <th className="sticky left-0 bg-white px-3 py-2 font-semibold text-slate-600">기업명</th>
                {data.reviewers.map((r) => (
                  <th key={r.id} className="whitespace-nowrap px-3 py-2 text-center font-semibold text-slate-600">
                    {r.name}
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-semibold text-navy-700">최종점수</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((row) => (
                <tr key={row.submissionId} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2.5 text-center font-bold text-navy-800">{row.rank}</td>
                  <td className="sticky left-0 bg-white px-3 py-2.5 font-medium text-navy-800">
                    {row.companyName}
                  </td>
                  {data.reviewers.map((r) => {
                    const rs = row.reviewerScores.find((s) => s.reviewerId === r.id);
                    return (
                      <td key={r.id} className="px-3 py-2.5 text-center tabular-nums text-slate-700">
                        {rs ? rs.convertedScore.toFixed(2) : "-"}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-center tabular-nums font-bold text-navy-800">
                    {row.finalScore.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 4. 위원 관리
// ──────────────────────────────────────────────────────────────
function ReviewersPanel() {
  const [reviewers, setReviewers] = useState<ReviewerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  function load() {
    fetch("/api/admin/evaluate/reviewers")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setReviewers(d.reviewers);
        setLoading(false);
      });
  }

  useEffect(() => { load(); }, []);

  function copyLink(r: ReviewerInfo) {
    if (!r.magicLink) return;
    const full = `${window.location.origin}${r.magicLink}`;
    navigator.clipboard.writeText(full).then(() => {
      setCopiedId(r.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  if (loading) return <Loading />;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="px-3 py-2 font-semibold text-slate-600">이름</th>
              <th className="px-3 py-2 font-semibold text-slate-600">소속</th>
              <th className="px-3 py-2 font-semibold text-slate-600">기관</th>
              <th className="px-3 py-2 font-semibold text-slate-600">이메일</th>
              <th className="px-3 py-2 font-semibold text-slate-600">매직링크</th>
            </tr>
          </thead>
          <tbody>
            {reviewers.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2.5 font-medium text-navy-800">{r.name}</td>
                <td className="px-3 py-2.5">
                  <span className="badge bg-slate-100 text-slate-600">
                    {groupLabel[r.affiliation_group] || r.affiliation_group}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-slate-600">{r.org || "-"}</td>
                <td className="px-3 py-2.5 text-slate-600">{r.email || "-"}</td>
                <td className="px-3 py-2.5">
                  {r.magicLink ? (
                    <button
                      onClick={() => copyLink(r)}
                      className="btn-outline text-xs"
                    >
                      {copiedId === r.id ? "복사됨!" : "링크 복사"}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">미발급</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-200 border-t-navy-700" />
    </div>
  );
}
