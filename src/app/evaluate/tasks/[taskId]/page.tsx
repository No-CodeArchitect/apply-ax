"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import EvalNav from "../../EvalNav";

interface SubRow {
  id: number;
  companyName: string;
  status: "not_started" | "in_progress" | "completed";
}

const statusConfig = {
  not_started: { label: "미평가", cls: "bg-slate-100 text-slate-500" },
  in_progress: { label: "작성중", cls: "bg-amber-100 text-amber-700" },
  completed: { label: "제출완료", cls: "bg-green-100 text-green-700" },
};

export default function TaskSubmissionsPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewer, setReviewer] = useState<{ name: string; group: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/evaluate/tasks/${taskId}/submissions`).then((r) => r.json()),
      fetch("/api/evaluate/tasks").then((r) => r.json()),
    ]).then(([subData, taskData]) => {
      if (subData.ok) setSubs(subData.submissions);
      if (taskData.ok) setReviewer(taskData.reviewer);
      setLoading(false);
    });
  }, [taskId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-navy-200 border-t-navy-700" />
      </div>
    );
  }

  const taskNames: Record<string, string> = {
    "1": "AI 기반 ADTO 전투계획 작성 모델",
    "2": "AI 기반 이동표적(TEL) 위치추적 모델",
    "3": "AI 기반 표적 자동식별 모델",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {reviewer && <EvalNav name={reviewer.name} group={reviewer.group} />}
      <div className="container-page py-8">
        <div className="mb-1 text-sm text-slate-500">
          <Link href="/evaluate/tasks" className="hover:underline">
            과제 목록
          </Link>{" "}
          &rsaquo; 과제 {taskId}
        </div>
        <h1 className="text-xl font-bold text-navy-800">
          {taskNames[taskId] || `과제 ${taskId}`}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          지원기업 {subs.length}개 · 평가완료{" "}
          {subs.filter((s) => s.status === "completed").length}개
        </p>

        <div className="mt-6 space-y-3">
          {subs.map((s) => {
            const sc = statusConfig[s.status];
            return (
              <Link
                key={s.id}
                href={`/evaluate/tasks/${taskId}/${s.id}`}
                className="card flex items-center justify-between p-5 transition hover:border-navy-300 hover:shadow-md"
              >
                <div>
                  <h2 className="text-sm font-semibold text-navy-800">{s.companyName}</h2>
                </div>
                <span className={`badge ${sc.cls}`}>{sc.label}</span>
              </Link>
            );
          })}
          {subs.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-400">
              이 과제에 지원한 기업이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
