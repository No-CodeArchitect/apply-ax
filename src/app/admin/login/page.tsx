import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  // 이미 유효한 관리자 세션이 있으면 로그인 폼을 다시 보여주지 않고 바로 이동한다.
  // (상단 '관리자' 링크로 들어와도 로그아웃된 것처럼 보이지 않게 하기 위함)
  const session = await getAdminSession();
  if (session) {
    redirect(session.mustChange ? "/admin/change-password" : "/admin");
  }
  return <LoginForm />;
}
