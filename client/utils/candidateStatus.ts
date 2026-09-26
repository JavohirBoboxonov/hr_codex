/**
 * 4 ta 100% shkaladagi ko'rsatkichlardan umumiy status hisoblash.
 * Resume: skillsScore, experienceScore, relevanceScore, overallScore (0–100).
 * Intervyu: technicalScore, communicationScore, problemSolvingScore, overallScore (1–10 → *10).
 */
import type { ResumeAnalysis } from '../types';
import type { Evaluation } from '../types';

export type CandidateScoreStatus = "A'lo" | 'Yaxshi' | "O'rta" | 'Yomon';

function to100(v: number | undefined | null): number {
  if (v == null) return 0;
  if (v <= 1) return v * 100; // 0–1 → 0–100
  if (v <= 10) return v * 10;  // 1–10 → 10–100
  return Math.min(100, Math.max(0, v));
}

/**
 * Rezyume va/yoki intervyu dan 4 ta 100% shkaladagi o'rtacha.
 * Ikkalasi bo'lsa: 50% rezyume + 50% intervyu (past intervyu yuqori rezyumeni bosib ketmasin).
 */
export function getAggregateScore100(
  analysis?: ResumeAnalysis | null,
  evaluation?: Evaluation | null
): number | null {
  let resumeAvg: number | null = null;
  let interviewAvg: number | null = null;

  if (analysis) {
    const r = [
      to100(analysis.skillsScore),
      to100(analysis.experienceScore),
      to100(analysis.relevanceScore),
      to100(analysis.overallScore),
    ];
    resumeAvg = r.reduce((a, b) => a + b, 0) / r.length;
  }

  if (evaluation) {
    const e = [
      to100(evaluation.technicalScore),
      to100(evaluation.communicationScore),
      to100(evaluation.problemSolvingScore),
      to100(evaluation.overallScore),
    ];
    interviewAvg = e.reduce((a, b) => a + b, 0) / e.length;
  }

  if (resumeAvg != null && interviewAvg != null) {
    return Math.round((resumeAvg + interviewAvg) / 2);
  }
  if (resumeAvg != null) return Math.round(resumeAvg);
  if (interviewAvg != null) return Math.round(interviewAvg);
  return null;
}

/**
 * 0–100 o'rtacha balldan status: A'lo, Yaxshi, O'rta, Yomon.
 */
export function getCandidateScoreStatus(
  analysis?: ResumeAnalysis | null,
  evaluation?: Evaluation | null
): CandidateScoreStatus | null {
  const avg = getAggregateScore100(analysis, evaluation);
  if (avg == null) return null;
  if (avg >= 75) return "A'lo";
  if (avg >= 50) return 'Yaxshi';
  if (avg >= 25) return "O'rta";
  return 'Yomon';
}

export type StatusLabels = {
  statusAlo: string;
  statusYaxshi: string;
  statusOrta: string;
  statusYomon: string;
};

export function getStatusLabel(status: CandidateScoreStatus, labels: StatusLabels): string {
  switch (status) {
    case "A'lo": return labels.statusAlo;
    case 'Yaxshi': return labels.statusYaxshi;
    case "O'rta": return labels.statusOrta;
    case 'Yomon': return labels.statusYomon;
    default: return status;
  }
}
