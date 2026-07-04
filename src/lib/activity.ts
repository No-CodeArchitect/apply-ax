import { getDb, nowIso } from "./db";

// 관리자 활동 로그 기록 (누가, 언제, 무엇을)
export function logAdminActivity(opts: {
  adminId: number | null;
  username: string | null;
  action: string;
  targetId?: number | null;
  detail?: string | null;
}) {
  getDb()
    .prepare(
      `INSERT INTO admin_activity_log (admin_id, username, action, target_id, detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      opts.adminId ?? null,
      opts.username ?? null,
      opts.action,
      opts.targetId ?? null,
      opts.detail ?? null,
      nowIso()
    );
}
