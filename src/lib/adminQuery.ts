import { getDb } from "./db";
import { taskTitle } from "./tasks";

export interface SubmissionListRow {
  id: number;
  task_id: number;
  biz_reg_no: string;
  company_name: string;
  ceo_name: string;
  applicant_name: string;
  phone: string;
  email: string;
  reason: string;
  tech_experience: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ListFilters {
  task?: number | null;
  from?: string | null; // ISO or YYYY-MM-DD
  to?: string | null;
}

/** 필터 조건에 맞는 접수 목록 조회 (관리자 전용) */
export function querySubmissions(filters: ListFilters): SubmissionListRow[] {
  const where: string[] = [];
  const args: unknown[] = [];

  if (filters.task && [1, 2, 3].includes(filters.task)) {
    where.push("task_id = ?");
    args.push(filters.task);
  }
  if (filters.from) {
    where.push("created_at >= ?");
    args.push(new Date(filters.from).toISOString());
  }
  if (filters.to) {
    // to 는 해당일 23:59:59 까지 포함
    const d = new Date(filters.to);
    if (/^\d{4}-\d{2}-\d{2}$/.test(filters.to)) d.setHours(23, 59, 59, 999);
    where.push("created_at <= ?");
    args.push(d.toISOString());
  }

  const sql =
    "SELECT * FROM submissions" +
    (where.length ? " WHERE " + where.join(" AND ") : "") +
    " ORDER BY created_at DESC";
  return getDb().prepare(sql).all(...args) as SubmissionListRow[];
}

export function taskCounts(): Record<number, number> {
  const rows = getDb()
    .prepare("SELECT task_id, COUNT(*) as c FROM submissions GROUP BY task_id")
    .all() as { task_id: number; c: number }[];
  const out: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  for (const r of rows) out[r.task_id] = r.c;
  return out;
}

export function attachmentsFor(submissionId: number) {
  return getDb()
    .prepare("SELECT * FROM attachments WHERE submission_id = ? ORDER BY file_type")
    .all(submissionId) as {
    id: number;
    file_name: string;
    file_path: string;
    file_type: string;
    size: number;
    uploaded_at: string;
  }[];
}

export { taskTitle };
