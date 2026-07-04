import { redirect } from "next/navigation";

// /edit 직접 접근 시 조회 페이지로 유도
export default function EditIndex() {
  redirect("/lookup");
}
