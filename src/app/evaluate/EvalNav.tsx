"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function EvalNav({ name, group }: { name: string; group: string }) {
  const router = useRouter();
  const groupLabel: Record<string, string> = {
    snu: "서울대",
    airforce: "공군",
    aihub: "AI허브",
  };

  async function handleLogout() {
    await fetch("/api/evaluate/logout", { method: "POST" });
    router.push("/evaluate");
  }

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="container-page flex h-14 items-center justify-between">
        <Link href="/evaluate/tasks" className="flex items-center gap-2 text-sm font-bold text-navy-800">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-navy-700 text-xs font-bold text-white">
            AX
          </span>
          서면평가 시스템
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {name} <span className="badge bg-navy-100 text-navy-700">{groupLabel[group] || group}</span>
          </span>
          <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-slate-600">
            로그아웃
          </button>
        </div>
      </div>
    </nav>
  );
}
