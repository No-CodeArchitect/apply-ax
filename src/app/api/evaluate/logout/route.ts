import { NextResponse } from "next/server";
import { clearReviewerSession } from "@/lib/reviewerSession";

export async function POST() {
  await clearReviewerSession();
  return NextResponse.json({ ok: true });
}
