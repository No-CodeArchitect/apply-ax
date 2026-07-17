import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { getApplicationWindow, getSetting } from "@/lib/settings";
import { toDatetimeLocalKST } from "@/lib/format";
import { TASKS } from "@/lib/tasks";
import { canAccessEvaluation } from "@/lib/admin";
import AdminNav from "../AdminNav";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.mustChange) redirect("/admin/change-password");

  const win = getApplicationWindow();
  const guides = TASKS.map((t) => ({
    id: t.id,
    title: t.title,
    guide: getSetting(`task${t.id}_guide`) || "",
  }));

  return (
    <div>
      <AdminNav orgLabel={session.orgLabel} username={session.username} canEval={canAccessEvaluation(session.username)} />
      <div className="container-page py-8">
        <h1 className="text-2xl font-bold text-navy-800">접수 설정</h1>
        <p className="mt-1 text-sm text-slate-500">접수 시작/마감 일시와 과제 안내 문구를 관리합니다. (시간대: KST)</p>
        <SettingsForm
          start={toDatetimeLocalKST(win.start)}
          end={toDatetimeLocalKST(win.end)}
          guides={guides}
        />
      </div>
    </div>
  );
}
