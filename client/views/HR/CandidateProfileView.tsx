import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Briefcase, FileText, UserCircle, Loader2, Calendar, MapPin, Shield, MessageCircle, GraduationCap } from 'lucide-react';
import { CandidateApplication, InterviewSession, Language, User } from '../../types';
import { UI_STRINGS } from '../../translations';
import * as applicationsService from '../../services/applicationsService';
import * as sessionsService from '../../services/sessionsService';
import * as profileService from '../../services/profileService';

interface CandidateProfileViewProps {
  language: Language;
}

const CandidateProfileView: React.FC<CandidateProfileViewProps> = ({ language }) => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<CandidateApplication | null>(null);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hrRating, setHrRating] = useState(0);
  const [hrComment, setHrComment] = useState('');
  const [isSubmittingHrFeedback, setIsSubmittingHrFeedback] = useState(false);

  const strings = UI_STRINGS[language];
  const t = strings.candidate || {};
  const tHr = strings.hr;

  useEffect(() => {
    if (!applicationId) {
      setError('Application ID not found');
      setLoading(false);
      return;
    }

    // Check if it's a session ID (starts with "session-")
    if (applicationId.startsWith('session-')) {
      const sessionId = applicationId.replace(/^session-/, '');
      // Load session details with raw application data
      Promise.all([
        sessionsService.getSessionDetailsRaw(sessionId).catch(() => null),
        sessionsService.getSessionDetails(sessionId).catch(() => null)
      ])
        .then(([sessionRaw, sessionMapped]) => {
          if (sessionMapped) {
            setSession(sessionMapped);
          }
          
          if (!sessionRaw && !sessionMapped) {
            setError('Session not found');
            setLoading(false);
            return;
          }
          
          // Get email from raw session data (application field)
          let emailToUse = '';
          if (sessionRaw?.application?.email) {
            emailToUse = sessionRaw.application.email;
            // Also set application from session data
            setApplication({
              id: sessionRaw.application.id,
              jobId: sessionRaw.jobId,
              name: sessionRaw.application.name,
              email: sessionRaw.application.email,
              phone: sessionRaw.application.phone || '',
              experienceYears: sessionRaw.application.experienceYears || 0,
              resumeFileName: sessionRaw.application.resumeFileName || '',
              resumeMimeType: '',
              resumeBase64: '',
              analysis: sessionRaw.application.analysis,
              status: 'Completed' as const,
              appliedAt: sessionRaw.startedAt,
            });
          } else if (sessionRaw?.applicationId) {
            // Fallback: try to load application by ID
            applicationsService.getApplications()
              .then((apps) => {
                const app = apps.find((a) => a.id === sessionRaw.applicationId);
                if (app) {
                  setApplication(app);
                  emailToUse = app.email;
                }
                // Load candidate profile by email
                if (emailToUse) {
                  return profileService.getCandidateProfileByEmail(emailToUse)
                    .then((profileRes) => {
                      setCandidateProfile(profileService.profileToUser(profileRes.user));
                    })
                    .catch(() => {
                      // Profile not found, but we have application/session data
                    });
                }
              })
              .catch(() => {
                // Application not found
              });
          }
          
          // Load candidate profile by email (if we got email from sessionRaw.application)
          if (emailToUse) {
            profileService.getCandidateProfileByEmail(emailToUse)
              .then((profileRes) => {
                setCandidateProfile(profileService.profileToUser(profileRes.user));
              })
              .catch(() => {
                // Profile not found, but we have application/session data
              });
          }
          
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message || 'Failed to load session');
          setLoading(false);
        });
    } else {
      // Regular application ID
      setLoading(true);
      applicationsService.getApplicationById(applicationId)
        .then((app) => {
          setApplication(app);
          const candidateEmail = app.email;
          // Load candidate profile by email
          if (candidateEmail) {
            profileService.getCandidateProfileByEmail(candidateEmail)
              .then((profileRes) => {
                setCandidateProfile(profileService.profileToUser(profileRes.user));
              })
              .catch(() => {
                // Profile not found, but we have application data
              });
          }
        })
        .catch((err) => {
          setError(err.message || 'Failed to load application');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [applicationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  if (error || (!application && !session)) {
    return (
      <div className="p-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        >
          <ArrowLeft size={20} />
          {strings.common.back}
        </button>
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl border border-red-200 dark:border-red-800">
          <p className="text-red-800 dark:text-red-200 font-bold">{error || 'Application not found'}</p>
        </div>
      </div>
    );
  }

  // Use candidate profile if available, otherwise fall back to application/session data
  const displayName = candidateProfile?.name || application?.name || session?.candidateName || session?.candidateId || 'Unknown';
  const displayEmail = candidateProfile?.email || application?.email || '';
  const displayPhone = application?.phone || '';
  const displayExperience = application?.experienceYears;
  const p = candidateProfile; // For compatibility with Profile component structure

  const downloadResume = () => {
    if (application?.resumeBase64) {
      const link = document.createElement('a');
      link.href = `data:${application.resumeMimeType};base64,${application.resumeBase64}`;
      link.download = application.resumeFileName || 'resume.pdf';
      link.click();
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft size={20} />
        {strings.common.back}
      </button>

      {/* Candidate Profile - Same as Profile component */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 md:p-10">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-28 h-28 rounded-2xl border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800 shrink-0">
              {p?.avatar ? (
                <img src={p.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="text-slate-400" size={48} />
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{displayName}</h3>
              {displayEmail && (
                <p className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Mail size={16} /> {displayEmail}
                </p>
              )}
              {displayPhone && (
                <p className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Phone size={16} /> {displayPhone}
                </p>
              )}
              {p?.dateOfBirth && (
                <p className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Calendar size={16} /> {p.dateOfBirth}
                </p>
              )}
              {p?.address && (
                <p className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <MapPin size={16} /> {p.address}
                </p>
              )}
              {p?.gender && (
                <p className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <UserCircle size={16} /> {p.gender === 'male' ? t.genderMale : p.gender === 'female' ? t.genderFemale : t.genderOther}
                </p>
              )}
              <p className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Shield size={16} /> {p?.role === 'CANDIDATE' ? t.roleCandidate : p?.role || 'Candidate'}
              </p>
              {typeof p?.interviews === 'number' && (
                <p className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
                  <MessageCircle size={16} /> {p.interviews} {t.interviewsUnit}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Education */}
        {p?.education && p.education.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 md:p-10">
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <GraduationCap size={22} /> {t.educationLabel}
            </h3>
            <ul className="space-y-4">
              {p.education.map((e, i) => (
                <li key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-white">{e.institution || '—'}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{e.degree} {e.field && ` • ${e.field}`}</p>
                  {(e.startYear || e.endYear) && (
                    <p className="text-xs text-slate-500">{e.startYear ?? '?'} – {e.endYear ?? '?'}</p>
                  )}
                  {e.description && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{e.description}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Work Experience */}
        {p?.workExperience && p.workExperience.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 md:p-10">
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Briefcase size={22} /> {t.workExperienceLabel}
            </h3>
            <ul className="space-y-4">
              {p.workExperience.map((w, i) => (
                <li key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-white">{w.company || '—'}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{w.position}</p>
                  <p className="text-xs text-slate-500">
                    {w.startYear && `${w.startYear}${w.startMonth ? `/${w.startMonth}` : ''}`}
                    {' – '}
                    {w.current ? (t.currentJob || 'Hozirgacha') : (w.endYear ? `${w.endYear}${w.endMonth ? `/${w.endMonth}` : ''}` : '—')}
                  </p>
                  {w.description && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{w.description}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Resume Download */}
        {application?.resumeFileName && (
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 md:p-10">
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <FileText size={22} /> Resume
            </h2>
            <button
              onClick={downloadResume}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all text-sm font-bold uppercase tracking-widest"
            >
              Download Resume
            </button>
          </div>
        )}

        {/* Interview Session */}
        {session && (
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 md:p-10">
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4">{tHr.profileInterview || 'Interview Session'}</h2>
            <div className="space-y-2">
              <p className="text-slate-600 dark:text-slate-400">
                <span className="font-bold">{tHr.statusLabel || 'Status'}:</span> {session.status}
              </p>
              {session.jobTitle && (
                <p className="text-slate-600 dark:text-slate-400">
                  <span className="font-bold">{tHr.vacancyColumn || 'Job'}:</span> {session.jobTitle}
                  {session.jobDepartment && ` (${session.jobDepartment})`}
                </p>
              )}
              {session.evaluation && (
                <div className="mt-4">
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">{tHr.strengthsWeaknesses || 'Evaluation Summary'}</p>
                  <p className="text-slate-700 dark:text-slate-300">{session.evaluation.summary}</p>
                  {session.evaluation.overallScore !== undefined && (
                    <p className="text-indigo-600 dark:text-indigo-400 font-bold mt-2">
                      {tHr.overall || 'Overall Score'}: {session.evaluation.overallScore}/10
                    </p>
                  )}
                </div>
              )}

              {session.candidateFeedback && (
                 <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                    <p className="font-bold text-slate-700 dark:text-slate-300">Nomzodning fikri: {session.candidateFeedback.rating}★</p>
                    {session.candidateFeedback.comment && <p className="text-slate-600 dark:text-slate-400 mt-1">{session.candidateFeedback.comment}</p>}
                 </div>
              )}

              {session.hrFeedback ? (
                 <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                    <p className="font-bold text-slate-700 dark:text-slate-300">HR bahosi: {session.hrFeedback.rating}★</p>
                    {session.hrFeedback.comment && <p className="text-slate-600 dark:text-slate-400 mt-1">{session.hrFeedback.comment}</p>}
                 </div>
              ) : (
                <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                  <h3 className="font-bold mb-4 text-slate-800 dark:text-slate-200">Intervyuni baholang (HR)</h3>
                  <div className="flex gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => setHrRating(star)} className={`text-2xl ${hrRating >= star ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'} hover:scale-110 transition-transform`}>
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea 
                    value={hrComment}
                    onChange={(e) => setHrComment(e.target.value)}
                    placeholder="Qo'shimcha fikrlaringiz (ixtiyoriy)..."
                    className="w-full p-4 mb-4 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 resize-none h-24 dark:text-white"
                  ></textarea>
                  <button 
                    onClick={async () => {
                      if (hrRating === 0) return;
                      setIsSubmittingHrFeedback(true);
                      try {
                        const updatedSession = await sessionsService.addHrFeedback(session.id, hrRating, hrComment);
                        setSession(updatedSession);
                      } catch(e) {
                        console.error(e);
                      } finally {
                        setIsSubmittingHrFeedback(false);
                      }
                    }}
                    disabled={hrRating === 0 || isSubmittingHrFeedback}
                    className="w-full py-3 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isSubmittingHrFeedback ? 'Yuborilmoqda...' : 'Fikrni yuborish'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Analysis */}
        {application?.analysis && (
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 md:p-10">
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4">{tHr.profileAnalysis || 'AI Analysis'}</h2>
            {application.analysis.summary && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">{tHr.strengthsWeaknesses || 'Summary'}</h3>
                <p className="text-slate-700 dark:text-slate-300">{application.analysis.summary}</p>
              </div>
            )}
            {application.analysis.detectedSkills && application.analysis.detectedSkills.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">{tHr.detectedSkills || 'Detected Skills'}</h3>
                <div className="flex flex-wrap gap-2">
                  {application.analysis.detectedSkills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-bold"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{tHr.skillsMatch || 'Skills Score'}</p>
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{application.analysis.skillsScore}%</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{tHr.relevance || 'Relevance Score'}</p>
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{application.analysis.relevanceScore}%</p>
              </div>
            </div>
          </div>
        )}

        {(!p?.education || p.education.length === 0) && (!p?.workExperience || p.workExperience.length === 0) && !application && !session && (
          <p className="text-slate-500 dark:text-slate-400 text-center py-6">{t.addEducationAndWorkHint || 'No additional information available'}</p>
        )}
      </div>
    </div>
  );
};

export default CandidateProfileView;
