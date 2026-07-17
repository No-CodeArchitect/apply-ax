"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/client";

export default function AdminNav({ orgLabel, username, canEval }: { orgLabel: string; username: string; canEval?: boolean }) {
  const router = useRouter();
  async function logout() {
    await postJson("/api/admin/logout", {});
    router.push("/admin/login");
    router.refresh();
  }
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="container-page flex h-14 items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <Link href="/admin" className="font-bold text-navy-800">접수 관리</Link>
          <Link href="/admin" className="text-slate-500 hover:text-navy-700">대시보드</Link>
          {canEval && <Link href="/admin/evaluate" className="text-slate-500 hover:text-navy-700">평가관리</Link>}
          <Link href="/admin/settings" className="text-slate-500 hover:text-navy-700">설정</Link>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">
            <span className="font-semibold text-navy-700">{orgLabel}</span> · {username}
          </span>
          <button onClick={logout} className="btn-ghost">로그아웃</button>
        </div>
      </div>
    </div>
  );
}
