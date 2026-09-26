/**
 * 4 ta 100% shkaladagi ko'rsatkichlardan umumiy status hisoblash.
 * Rezyume: skillsScore, experienceScore, relevanceScore, overallScore (0–100).
 * Intervyu: technicalScore, communicationScore, problemSolvingScore, overallScore (1–10 → *10).
 * Natija: A'lo, Yaxshi, O'rta, Yomon.
 */

function to100(v) {
  if (v == null) return 0;
  if (v <= 1) return v * 100;
  if (v <= 10) return v * 10;
  return Math.min(100, Math.max(0, v));
}

/**
 * Rezyume va/yoki intervyu dan 4 ta 100% shkaladagi o'rtacha.
 * Ikkalasi bo'lsa: 50% rezyume + 50% intervyu.
 * @returns {number|null} 0–100
 */
function getAggregateScore100(analysis, evaluation) {
  let resumeAvg = null;
  let interviewAvg = null;

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
 * @param {object} analysis - application.analysis
 * @param {object} evaluation - session.evaluation
 * @returns {'A\'lo'|'Yaxshi'|'O\'rta'|'Yomon'|null}
 */
function getCandidateScoreStatus(analysis, evaluation) {
  const avg = getAggregateScore100(analysis, evaluation);
  if (avg == null) return null;
  if (avg >= 75) return "A'lo";
  if (avg >= 50) return 'Yaxshi';
  if (avg >= 25) return "O'rta";
  return 'Yomon';
}

export {
  getAggregateScore100,
  getCandidateScoreStatus,
};
