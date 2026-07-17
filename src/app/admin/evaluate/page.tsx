import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { canAccessEvaluation } from "@/lib/admin";
import AdminNav from "../AdminNav";
import EvaluateAdmin from "./EvaluateAdmin";

export const dynamic = "force-dynamic";

export default async function AdminEvaluatePage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.mustChange) redirect("/admin/change-password");
  if (!canAccessEvaluation(session.username)) redirect("/admin");

  return (
    <div>
      <AdminNav orgLabel={session.orgLabel} username={session.username} canEval={canAccessEvaluation(session.username)} />
      <EvaluateAdmin />
    </div>
  );
}
