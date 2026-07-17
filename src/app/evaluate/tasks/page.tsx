"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import EvalNav from "../EvalNav";

interface TaskSummary {
  id: number;
  title: string;
  short: string;
  totalSubmissions: number;
  completedByMe: number;
}

export default function TaskListPage() {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [reviewer, setReviewer] = useState<{ name: string; group: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/evaluate/tasks")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setTasks(data.tasks);
          setReviewer(data.reviewer);
        }
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-navy-200 border-t-navy-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {reviewer && <EvalNav name={reviewer.name} group={reviewer.group} />}
      <div className="container-page py-8">
        <h1 className="text-2xl font-bold text-navy-800">서면평가</h1>
        <p className="mt-1 text-sm text-slate-500">평가할 과제를 선택하세요.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {tasks.map((t) => {
            const allDone = t.totalSubmissions > 0 && t.completedByMe === t.totalSubmissions;
            return (
              <Link
                key={t.id}
                href={`/evaluate/tasks/${t.id}`}
                className="card group p-6 transition hover:border-navy-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <span className="badge bg-navy-100 text-navy-700">과제 {t.id}</span>
                  {allDone && (
                    <span className="badge bg-green-100 text-green-700">완료</span>
                  )}
                </div>
                <h2 className="mt-3 text-sm font-bold text-navy-800 group-hover:text-navy-600">
                  {t.title}
                </h2>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>평가 진행</span>
                    <span className="font-semibold text-navy-700">
                      {t.completedByMe} / {t.totalSubmissions}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-navy-600 transition-all"
                      style={{
                        width: t.totalSubmissions
                          ? `${(t.completedByMe / t.totalSubmissions) * 100}%`
                          : "0%",
                      }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
