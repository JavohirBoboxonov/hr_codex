import React, { useState, useEffect } from 'react';
import { FileText, Loader2, X, ChevronDown, ChevronUp, Briefcase } from 'lucide-react';
import { Language } from '../../types';
import { UI_STRINGS } from '../../translations';
import * as applicationsService from '../../services/applicationsService';
import type { MyApplicationItem } from '../../services/applicationsService';
import { getCandidateScoreStatus, getStatusLabel } from '../../utils/candidateStatus';
import type { CandidateScoreStatus } from '../../utils/candidateStatus';

interface MyApplicationsProps {
  language: Language;
}

const MyApplications: React.FC<MyApplicationsProps> = ({ language }) => {
  const t = UI_STRINGS[language].candidate || {};
  const hr = UI_STRINGS[language].hr || {};
  const [items, setItems] = useState<MyApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    applicationsService.getMyApplications().then(data => {
      if (!cancelled) setItems(data);
    }).catch(() => { if (!cancelled) setItems([]); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <FileText className="text-indigo-600 dark:text-indigo-400" size={36} />
          {t.myApplicationsTitle || 'Mening arizalarim'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">
          {t.myApplicationsDesc}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-12 text-center">
          <Briefcase className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
          <p className="text-slate-500 dark:text-slate-400 font-medium">{t.noApplications}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const { application, job, session } = item;
            const scoreStatus: CandidateScoreStatus | null = getCandidateScoreStatus(application.analysis, session?.evaluation);
            const label = scoreStatus ? getStatusLabel(scoreStatus, hr) : '—';
            const isExpanded = expandedId === application.id;

            const badgeClass = scoreStatus === "A'lo"
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
              : scoreStatus === 'Yaxshi'
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                : scoreStatus === "O'rta"
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';

            return (
              <div
                key={application.id}
                className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : application.id)}
                  className="w-full p-6 md:p-8 flex flex-col sm:flex-row sm:items-center gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white truncate">
                      {job?.title || application.jobId}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">
                      {job?.department || '—'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {application.status}
                    </span>
                    {scoreStatus && (
                      <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border ${badgeClass}`}>
                        {label}
                      </span>
                    )}
                    {session?.evaluation?.overallScore != null && (
                      <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                        {session.evaluation.overallScore}/10
                      </span>
                    )}
                    {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-6 md:p-10 bg-slate-50/50 dark:bg-slate-800/20 space-y-8">
                    {session?.status !== 'Completed' && (!application.analysis && !session?.evaluation) ? (
                      <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-2xl border border-amber-200 dark:border-amber-800/50">
                        <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                          {hr.interviewNotCompleted || hr.noEvaluation}
                        </p>
                      </div>
                    ) : null}

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-lg font-bold text-slate-700 dark:text-slate-300 italic">
                        "{application.analysis?.summary || session?.evaluation?.summary || '—'}"
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">{hr.scoreMatrix}</h4>
                        <div className="space-y-4">
                          {(application.analysis
                            ? [
                                { l: hr.skillsMatch, v: application.analysis?.skillsScore, unit: '%' },
                                { l: hr.relevance, v: application.analysis?.relevanceScore, unit: '%' },
                              ]
                            : session?.evaluation
                              ? [
                                  { l: hr.technical, v: (session.evaluation.technicalScore ?? 0) * 10, unit: '%' },
                                  { l: hr.communication, v: (session.evaluation.communicationScore ?? 0) * 10, unit: '%' },
                                  { l: hr.overall, v: (session.evaluation.overallScore ?? 0) * 10, unit: '%' },
                                ]
                              : []
                          ).map((m, i) => (
                            <div key={i} className="space-y-1">
                              <div className="flex justify-between text-[10px] font-black text-slate-700 dark:text-slate-300">
                                <span>{m.l}</span>
                                <span>{m.v}{m.unit}</span>
                              </div>
                              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, m.v)}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                        {session?.evaluation?.overallRecommendation && (
                          <p className="mt-4 text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                            {session.evaluation.overallRecommendation}
                          </p>
                        )}
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
                          {application.analysis ? hr.detectedSkills : hr.strengthsWeaknesses}
                        </h4>
                        {application.analysis?.detectedSkills?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {application.analysis.detectedSkills.map((s, i) => (
                              <span key={i} className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : session?.evaluation ? (
                          <div className="space-y-4">
                            {session.evaluation.strengths?.length ? (
                              <div>
                                <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">{hr.strengths}</p>
                                <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                                  {session.evaluation.strengths.map((s, i) => (
                                    <li key={i}>• {s}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                            {session.evaluation.weaknesses?.length ? (
                              <div>
                                <p className="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-2">{hr.weaknesses}</p>
                                <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                                  {session.evaluation.weaknesses.map((w, i) => (
                                    <li key={i}>• {w}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-slate-400 dark:text-slate-500 text-sm">—</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyApplications;
