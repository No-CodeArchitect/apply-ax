import { getDb } from "./db";
import { getAllCriteria } from "./criteria";

export interface RawScoreRow {
  reviewerId: number;
  reviewerName: string;
  submissionId: number;
  companyName: string;
  totalScore: number;
}

export interface NormalizedResult {
  submissionId: number;
  companyName: string;
  reviewerScores: {
    reviewerId: number;
    reviewerName: string;
    rawScore: number;
    zScore: number;
    convertedScore: number;
  }[];
  finalScore: number;
  rank: number;
}

export function getRawMatrix(taskId: number) {
  const db = getDb();
  const criteria = getAllCriteria();

  const reviewers = db
    .prepare("SELECT id, name FROM reviewers ORDER BY id")
    .all() as { id: number; name: string }[];

  const submissions = db
    .prepare("SELECT id, company_name FROM submissions WHERE task_id = ? ORDER BY id")
    .all(taskId) as { id: number; company_name: string }[];

  const allEvals = db
    .prepare(
      `SELECT e.reviewer_id, e.submission_id, e.criteria_id, e.score
       FROM evaluations e
       JOIN submissions s ON e.submission_id = s.id
       WHERE s.task_id = ?`
    )
    .all(taskId) as { reviewer_id: number; submission_id: number; criteria_id: number; score: number | null }[];

  const submitStates = db
    .prepare(
      `SELECT es.reviewer_id, es.submission_id, es.is_final, es.comment
       FROM evaluation_submits es
       JOIN submissions s ON es.submission_id = s.id
       WHERE s.task_id = ?`
    )
    .all(taskId) as { reviewer_id: number; submission_id: number; is_final: number; comment: string | null }[];

  type ScoreDetail = { criteriaId: number; score: number | null };
  const scoreMap = new Map<string, ScoreDetail[]>();
  for (const e of allEvals) {
    const key = `${e.reviewer_id}-${e.submission_id}`;
    if (!scoreMap.has(key)) scoreMap.set(key, []);
    scoreMap.get(key)!.push({ criteriaId: e.criteria_id, score: e.score });
  }

  const submitMap = new Map<string, { isFinal: boolean; comment: string | null }>();
  for (const s of submitStates) {
    submitMap.set(`${s.reviewer_id}-${s.submission_id}`, {
      isFinal: s.is_final === 1,
      comment: s.comment,
    });
  }

  return { reviewers, submissions, criteria, scoreMap, submitMap };
}

export function computeNormalization(taskId: number): NormalizedResult[] {
  const { reviewers, submissions, scoreMap } = getRawMatrix(taskId);

  if (submissions.length === 0) return [];

  // 1) 위원별 원점수
  const rawScores = new Map<string, number>();
  for (const r of reviewers) {
    for (const s of submissions) {
      const key = `${r.id}-${s.id}`;
      const details = scoreMap.get(key) || [];
      const total = details.reduce((sum, d) => sum + (d.score ?? 0), 0);
      rawScores.set(key, total);
    }
  }

  // 지원기업 1개뿐이면 정규화 건너뜀
  if (submissions.length <= 1) {
    return submissions.map((s) => {
      const reviewerScores = reviewers.map((r) => {
        const raw = rawScores.get(`${r.id}-${s.id}`) ?? 0;
        return {
          reviewerId: r.id,
          reviewerName: r.name,
          rawScore: raw,
          zScore: 0,
          convertedScore: raw,
        };
      });
      const scores = reviewerScores.map((rs) => rs.convertedScore);
      const finalScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return { submissionId: s.id, companyName: s.company_name, reviewerScores, finalScore, rank: 1 };
    });
  }

  // 2) 위원별 평균·표준편차
  const reviewerStats = new Map<number, { mean: number; stdev: number }>();
  for (const r of reviewers) {
    const vals = submissions.map((s) => rawScores.get(`${r.id}-${s.id}`) ?? 0);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, v) => a + (v - mean) ** 2, 0) / (vals.length - 1);
    const stdev = Math.sqrt(variance);
    reviewerStats.set(r.id, { mean, stdev });
  }

  // 3) 전체 평균·표준편차
  const allRaw: number[] = [];
  for (const r of reviewers) {
    for (const s of submissions) {
      allRaw.push(rawScores.get(`${r.id}-${s.id}`) ?? 0);
    }
  }
  const overallMean = allRaw.reduce((a, b) => a + b, 0) / allRaw.length;
  const overallVariance = allRaw.reduce((a, v) => a + (v - overallMean) ** 2, 0) / (allRaw.length - 1);
  const overallStdev = Math.sqrt(overallVariance);

  // 4) 정규화 계산
  const results: NormalizedResult[] = submissions.map((s) => {
    const reviewerScores = reviewers.map((r) => {
      const raw = rawScores.get(`${r.id}-${s.id}`) ?? 0;
      const stats = reviewerStats.get(r.id)!;
      const z = stats.stdev === 0 ? 0 : (raw - stats.mean) / stats.stdev;
      const converted = overallMean + z * overallStdev;
      return {
        reviewerId: r.id,
        reviewerName: r.name,
        rawScore: raw,
        zScore: Math.round(z * 1000) / 1000,
        convertedScore: Math.round(converted * 100) / 100,
      };
    });

    const scores = reviewerScores.map((rs) => rs.convertedScore);
    const finalScore = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
      : 0;

    return { submissionId: s.id, companyName: s.company_name, reviewerScores, finalScore, rank: 0 };
  });

  // 5) 순위
  results.sort((a, b) => b.finalScore - a.finalScore);
  let currentRank = 1;
  for (let i = 0; i < results.length; i++) {
    if (i > 0 && results[i].finalScore < results[i - 1].finalScore) {
      currentRank = i + 1;
    }
    results[i].rank = currentRank;
  }

  return results;
}
