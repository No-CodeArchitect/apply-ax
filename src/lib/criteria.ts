import { getDb } from "./db";

export interface CriteriaRow {
  id: number;
  code: string;
  label: string;
  max_score: number;
  sort_order: number;
  description: string | null;
}

export function getAllCriteria(): CriteriaRow[] {
  return getDb()
    .prepare("SELECT * FROM evaluation_criteria ORDER BY sort_order")
    .all() as CriteriaRow[];
}

export function getCriteriaById(id: number): CriteriaRow | undefined {
  return getDb()
    .prepare("SELECT * FROM evaluation_criteria WHERE id = ?")
    .get(id) as CriteriaRow | undefined;
}

export const TOTAL_MAX_SCORE = 100;
