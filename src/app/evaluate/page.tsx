"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

interface ReviewerInfo {
  name: string;
  group: string;
  org: string | null;
}

const GROUP_LABEL: Record<string, string> = {
  snu: "서울대학교",
  airforce: "대한민국 공군",
  aihub: "AI허브",
};

const NDA_ITEMS = [
  "본 평가와 관련하여 취득한 모든 정보(제안서, 발표 내용, 평가 점수 등)를 외부에 누설하지 않겠습니다.",
  "평가 대상 업체의 기술 정보, 사업 계획 등 영업 비밀에 해당하는 정보를 부당하게 사용하지 않겠습니다.",
  "개인적 이해관계를 배제하고 공정하고 객관적으로 평가하겠습니다.",
  "위 서약을 위반하여 발생하는 모든 법적 책임을 부담할 것을 확인합니다.",
];

function EvaluateEntry() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reviewer, setReviewer] = useState<ReviewerInfo | null>(null);
  const [nda, setNda] = useState([false, false, false, false]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/evaluate/auth?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setReviewer(data.reviewer);
          setLoading(false);
        } else {
          setError(data.message || "인증에 실패했습니다.");
          setLoading(false);
        }
      })
      .catch(() => {
        setError("서버 오류가 발생했습니다.");
        setLoading(false);
      });
  }, [token]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const res = await fetch("/api/evaluate/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ndaAgreed: true }),
      });
      const data = await res.json();
      if (data.ok) {
        router.replace("/evaluate/tasks");
      } else {
        setError(data.message || "인증에 실패했습니다.");
        setConfirming(false);
      }
    } catch {
      setError("서버 오류가 발생했습니다.");
      setConfirming(false);
    }
  };

  if (token && loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-navy-200 border-t-navy-700" />
          <p className="mt-4 text-sm text-slate-600">인증 중입니다...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="card mx-4 max-w-md p-8 text-center">
          <div className="text-3xl">&#x26A0;&#xFE0F;</div>
          <h1 className="mt-3 text-lg font-bold text-navy-800">접속 오류</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <p className="mt-4 text-xs text-slate-400">
            문제가 지속되면 사무국에 문의해 주세요.
          </p>
        </div>
      </div>
    );
  }

  if (reviewer) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="card mx-4 w-full max-w-md p-8">
          <h1 className="text-center text-lg font-bold text-navy-800">
            심사위원 본인 확인
          </h1>
          <p className="mt-2 text-center text-sm text-slate-500">
            2026년 민군협력 AI 연구개발사업 서면평가
          </p>

          <div className="mt-6 rounded-lg border border-navy-100 bg-navy-50/50 p-5">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">성명</dt>
                <dd className="font-semibold text-navy-800">{reviewer.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">소속 구분</dt>
                <dd className="font-semibold text-navy-800">
                  {GROUP_LABEL[reviewer.group] || reviewer.group}
                </dd>
              </div>
              {reviewer.org && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">소속 기관</dt>
                  <dd className="font-semibold text-navy-800">{reviewer.org}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-sm font-bold text-amber-900">
              비밀유지 및 공정평가 서약
            </h2>
            <p className="mt-1 text-xs text-amber-700">
              평가를 시작하기 전에 아래 항목을 모두 확인하고 동의해 주세요.
            </p>

            <ul className="mt-4 space-y-3">
              {NDA_ITEMS.map((item, i) => (
                <li key={i}>
                  <label className="flex cursor-pointer gap-3 text-sm leading-relaxed text-slate-700">
                    <input
                      type="checkbox"
                      checked={nda[i]}
                      onChange={() =>
                        setNda((prev) => prev.map((v, j) => (j === i ? !v : v)))
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 accent-navy-700"
                    />
                    <span>{item}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={handleConfirm}
            disabled={confirming || !nda.every(Boolean)}
            className="btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-40"
          >
            {confirming ? "접속 중..." : "위 사항에 동의하며 평가를 시작합니다"}
          </button>

          <p className="mt-4 text-center text-xs text-slate-400">
            본인이 아니거나 정보가 다른 경우, 사무국에 문의해 주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="card mx-4 max-w-md p-8 text-center">
        <h1 className="text-lg font-bold text-navy-800">심사위원 평가 시스템</h1>
        <p className="mt-2 text-sm text-slate-600">
          이메일로 받으신 평가 링크를 통해 접속해 주세요.
        </p>
        <p className="mt-4 text-xs text-slate-400">
          링크를 받지 못하셨다면 사무국에 문의해 주세요.
        </p>
      </div>
    </div>
  );
}

export default function EvaluatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-navy-200 border-t-navy-700" />
        </div>
      }
    >
      <EvaluateEntry />
    </Suspense>
  );
}
