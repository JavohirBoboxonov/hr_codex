
import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Briefcase, 
  Clock, 
  TrendingUp, 
  Plus, 
  Share2, 
  Copy, 
  Check, 
  X, 
  FileText, 
  Star, 
  MessageSquare, 
  ThumbsUp, 
  BarChart,
  Play,
  Download,
  Calendar,
  Shield,
  Zap,
  CheckCircle2,
  AlertCircle,
  Video,
  ListOrdered,
  Layers,
  ArrowRight,
  Target,
  Search,
  Eye,
  File,
  Send,
  ExternalLink,
  Filter,
  Pause,
  Archive,
  XCircle,
  Loader2,
  CreditCard,
  ShoppingCart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Job, InterviewSession, InterviewMode, Language, CandidateApplication, ChatMessage, JobStatus } from '../../types';
import { UI_STRINGS } from '../../translations';
import { getCandidateScoreStatus, getStatusLabel, getAggregateScore100 } from '../../utils/candidateStatus';
import { buildCopyText } from '../../utils/copyLinkText';
import * as sessionsService from '../../services/sessionsService';

type ApplicationStatus = CandidateApplication["status"];

interface DashboardProps {
  jobs: Job[];
  sessions: InterviewSession[];
  applications: CandidateApplication[];
  messages: ChatMessage[];
  onSendMessage: (appId: string, text: string) => void;
  onUpdateJob: (job: Job) => void;
  onUpdateApplicationStatus?: (applicationId: string, status: ApplicationStatus) => void;
  dataLoading?: boolean;
  language: Language;
  user?: { interviews?: number; freeJobsUsed?: number };
}

const HRDashboard: React.FC<DashboardProps> = ({ jobs, sessions, applications, messages, onSendMessage, onUpdateJob, onUpdateApplicationStatus, dataLoading, language, user }) => {
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedShareId, setExpandedShareId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [filterJobId, setFilterJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Analysis' | 'Interview' | 'Chat'>('Analysis');
  const [messageInput, setMessageInput] = useState('');
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordingLoading, setRecordingLoading] = useState(false);
  const recordingUrlRef = useRef<string | null>(null);
  const [candidateHistory, setCandidateHistory] = useState<InterviewSession[]>([]);
  const [candidateHistoryLoading, setCandidateHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const strings = UI_STRINGS[language];
  const t = strings.hr;
  const buyCreditsLabel = language === Language.RU
    ? 'Купить интервью'
    : language === Language.EN
      ? 'Buy Interviews'
      : 'Suhbatlar sotib olish';

  const translateRecommendation = (rec: string): string => {
    if (rec === 'Strong Hire') return t.recommendationStrongHire;
    if (rec === 'Hire') return t.recommendationHire;
    if (rec === 'Maybe') return t.recommendationMaybe;
    if (rec === 'Reject') return t.recommendationReject;
    return rec;
  };

  const translateStatus = (status: string): string => {
    if (status === 'Completed') return t.statusCompleted;
    if (status === 'Started') return t.statusStarted;
    if (status === 'In Progress') return t.statusInProgress;
    if (status === 'Not Started') return t.statusNotStarted;
    if (status === 'Terminated') return t.statusTerminated;
    return status;
  };

  const interviews = user?.interviews || 0;
  const freeJobsUsed = user?.freeJobsUsed || 0;
  const FREE_JOBS_LIMIT = 3;
  const freeJobsRemaining = Math.max(0, FREE_JOBS_LIMIT - freeJobsUsed);
  const hasFreeJobs = freeJobsRemaining > 0;
  const needsInterviews = !hasFreeJobs && interviews < 1;

  // useEffect hook'larini early return dan oldin chaqirish kerak (React qoidasi)
  // Lekin selectedProfile ni hisoblash uchun avval boshqa kod kerak
  // Shuning uchun useEffect ni conditional qilamiz
  useEffect(() => {
    if (dataLoading || !selectedProfileId) return;
    
    const getSessionForApp = (appId: string) => sessions.find(s => s.applicationId === appId);
    const appProfiles = applications.map(app => ({
      app,
      session: getSessionForApp(app.id),
      totalScore: (app.analysis?.overallScore || 0) + ((getSessionForApp(app.id)?.evaluation?.overallScore || 0) * 10)
    }));
    
    const orphanSessions = sessions.filter(s => !s.applicationId);
    const sessionProfiles = orphanSessions.map(session => ({
      app: {
        id: 'session-' + session.id,
        jobId: session.jobId,
        name: session.candidateName || session.candidateId,
        email: '',
        phone: '',
        experienceYears: 0,
        resumeFileName: '',
        resumeMimeType: '',
        resumeBase64: '',
        analysis: undefined,
        status: 'Completed' as const,
        appliedAt: session.startedAt || '',
      } as CandidateApplication,
      session,
      totalScore: (session.evaluation?.overallScore || 0) * 10
    }));
    
    const unifiedProfiles = [...appProfiles, ...sessionProfiles].sort((a, b) => b.totalScore - a.totalScore);
    const selectedProfile = unifiedProfiles.find(p => p.app.id === selectedProfileId);
    
    if (!selectedProfile?.session?.hasRecording) {
      if (recordingUrlRef.current && recordingUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(recordingUrlRef.current);
      }
      recordingUrlRef.current = null;
      setRecordingUrl(null);
      return;
    }
    
    setRecordingLoading(true);
    const sessionId = selectedProfile.session.id;
    sessionsService.getRecordingUrl(sessionId).then((url) => {
      setRecordingLoading(false);
      // Revoke any previous object URL (only needed for legacy blob URLs)
      if (recordingUrlRef.current && recordingUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(recordingUrlRef.current);
      }
      recordingUrlRef.current = url;
      setRecordingUrl(url);
    }).catch(() => {
      setRecordingLoading(false);
      setRecordingUrl(null);
      recordingUrlRef.current = null;
    });
    
    return () => {
      if (recordingUrlRef.current && recordingUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(recordingUrlRef.current);
        recordingUrlRef.current = null;
      }
    };
  }, [selectedProfileId, sessions, applications, dataLoading]);

  // Kandidatning oldingi suhbatlari (pipeline profil ochilganda)
  useEffect(() => {
    if (!selectedProfileId) {
      setCandidateHistory([]);
      return;
    }
    const isSessionOnly = selectedProfileId.startsWith('session-');
    const sessionId = isSessionOnly ? selectedProfileId.replace(/^session-/, '') : undefined;
    const applicationId = isSessionOnly ? undefined : selectedProfileId;
    setCandidateHistoryLoading(true);
    sessionsService.getCandidateHistory({ applicationId, sessionId })
      .then(setCandidateHistory)
      .catch(() => setCandidateHistory([]))
      .finally(() => setCandidateHistoryLoading(false));
  }, [selectedProfileId]);

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  const getSessionForApp = (appId: string) => sessions.find(s => s.applicationId === appId);

  // Ariza bilan sessiyalar
  const appProfiles = applications.map(app => ({
    app,
    session: getSessionForApp(app.id),
    totalScore: (app.analysis?.overallScore || 0) + ((getSessionForApp(app.id)?.evaluation?.overallScore || 0) * 10)
  }));

  // Sessiyalar arizasiz (to'g'ridan-to'g'ri invite orqali)
  const orphanSessions = sessions.filter(s => !s.applicationId);
  const sessionProfiles = orphanSessions.map(session => ({
    app: {
      id: 'session-' + session.id,
      jobId: session.jobId,
      name: session.candidateName || session.candidateId,
      email: '',
      phone: '',
      experienceYears: 0,
      resumeFileName: '',
      resumeMimeType: '',
      resumeBase64: '',
      analysis: undefined,
      status: 'Completed' as const,
      appliedAt: session.startedAt || '',
    } as CandidateApplication,
    session,
    totalScore: (session.evaluation?.overallScore || 0) * 10
  }));

  const unifiedProfiles = [...appProfiles, ...sessionProfiles].sort((a, b) => b.totalScore - a.totalScore);

  /** Jadval va modalda ko‘rsatiladigan ism: ariza/sessiya ismi yoki ID fallback */
  const getDisplayName = (p: (typeof unifiedProfiles)[0]) =>
    (p.app.name && !p.app.name.startsWith('CAND-')) ? p.app.name : (p.session?.candidateName && !p.session.candidateName.startsWith('CAND-')) ? p.session.candidateName : p.app.name || p.session?.candidateId || p.app.id;

  const filteredProfiles = unifiedProfiles.filter(p => {
    if (filterJobId && p.app.jobId !== filterJobId) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = getDisplayName(p)?.toLowerCase() || '';
      const email = p.app.email?.toLowerCase() || '';
      const phone = p.app.phone?.toLowerCase() || '';
      const candId = p.session?.candidateId?.toLowerCase() || '';
      return name.includes(q) || email.includes(q) || phone.includes(q) || candId.includes(q);
    }
    return true;
  });

  const selectedProfile = unifiedProfiles.find(p => p.app.id === selectedProfileId);
  const profileMessages = messages.filter(m => m.applicationId === selectedProfileId);

  const handleSend = () => {
    if (!messageInput.trim() || !selectedProfileId) return;
    onSendMessage(selectedProfileId, messageInput);
    setMessageInput('');
  };

  const handleCopyLink = (job: Job, type: 'interview' | 'apply') => {
    const token = type === 'interview' ? job.shareToken! : job.id;
    const baseUrl = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin;
    const url = type === 'interview'
      ? `${baseUrl}/i/${token}`
      : `${baseUrl}/apply/${token}`;
    const text = buildCopyText(type, url, job.title, job.inviteCode || '', t);
    navigator.clipboard.writeText(text);
    setCopiedId(token + type);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStatusChange = (job: Job, newStatus: JobStatus) => {
    onUpdateJob({ ...job, status: newStatus });
  };

  const toggleShare = (id: string) => {
    setExpandedShareId(expandedShareId === id ? null : id);
  };

  const getJobTitle = (jobId: string) => jobs.find(j => j.id === jobId)?.title || t.unknownPosition;

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      {/* Interviews Banner */}
      {needsInterviews && (
        <div className="p-4 sm:p-6 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-800 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <AlertCircle className="text-yellow-600 dark:text-yellow-400 shrink-0" size={24} />
            <div>
              <p className="font-black text-yellow-900 dark:text-yellow-100">
                {t.creditsRequired || 'Suhbatlar talab qilinadi'}
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                {t.creditsRequiredDesc || `Bepul ishlar tugadi. Yangi ishlar yaratish uchun suhbatlar kerak. Hozir sizda ${interviews} ta suhbat bor.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/buy-credits')}
            className="self-start sm:self-auto w-full sm:w-auto shrink-0 px-6 py-3 bg-yellow-600 text-white rounded-xl font-black hover:bg-yellow-700 transition-all flex items-center justify-center gap-2"
          >
            <ShoppingCart size={20} />
            {buyCreditsLabel}
          </button>
        </div>
      )}

      {/* Credits & Free Tier Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Free Tier Card */}
        <div className={`p-5 sm:p-8 rounded-[2rem] sm:rounded-[3rem] text-white shadow-2xl ${
          hasFreeJobs 
            ? 'bg-gradient-to-r from-emerald-600 to-teal-600' 
            : 'bg-gradient-to-r from-slate-600 to-slate-700'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-white/80 mb-2">
                {t.freeTierTitle || 'BEPUL REJA'}
              </p>
              <p className="text-3xl sm:text-5xl font-black mb-2">{freeJobsRemaining}</p>
              <p className="text-sm text-white/90">
                {hasFreeJobs 
                  ? (t.freeJobsRemaining || `Bepul ishlar qoldi`) 
                  : (t.freeTierDesc || 'Bepul ishlar tugadi')}
              </p>
              {!hasFreeJobs && (
                <p className="text-xs text-white/70 mt-2">
                  {t.freeJobsUsed || 'Bepul ishlar'}: {freeJobsUsed}/{FREE_JOBS_LIMIT}
                </p>
              )}
            </div>
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Zap size={40} />
            </div>
          </div>
        </div>

        {/* Interviews Card */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 sm:p-8 rounded-[2rem] sm:rounded-[3rem] text-white shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-indigo-200 mb-2">{t.interviewsTitle || 'SUHBATLAR'}</p>
              <p className="text-3xl sm:text-5xl font-black mb-2">{interviews}</p>
              <p className="text-sm text-indigo-200">
                {needsInterviews ? (t.creditsRequired || 'Suhbatlar sotib oling') : (t.interviewsDesc || 'Ish yaratish va suhbatlar uchun')}
              </p>
            </div>
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <CreditCard size={40} />
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">{t.hiringDashboardTitle}</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">{t.hiringDashboardSub}</p>
        </div>
        <button 
          onClick={() => navigate('/create-job')}
          disabled={needsInterviews}
          className={`self-start sm:self-auto shrink-0 flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-black transition-all shadow-xl shadow-indigo-100 dark:shadow-none ${
            needsInterviews 
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
          title={needsInterviews ? (t.creditsRequired || 'Suhbatlar yetarli emas') : ''}
        >
          <Plus size={20} />
          {t.launchJob}
        </button>
      </div>

      {/* Quick Access Channels */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Layers size={24} className="text-indigo-600 dark:text-indigo-400" />
            {t.recruitmentChannels}
          </h3>
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{jobs.length} {t.activePositionsCount}</span>
        </div>
        <div className="grid grid-cols-1 gap-6">
          {jobs.map(job => (
            <div key={job.id} className="p-5 sm:p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col gap-4 sm:gap-6 hover:shadow-lg transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <Briefcase size={24} />
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900 dark:text-white">{job.title}</p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{job.department} • {t.inviteCodeLabel}: <span className="text-indigo-600 dark:text-indigo-400">{job.inviteCode}</span></p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {/* Share Toggle */}
                  <button 
                    onClick={() => toggleShare(job.id)}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 border ${
                      expandedShareId === job.id 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-600'
                    }`}
                  >
                    <Share2 size={16} />
                    {strings.common.share}
                  </button>

                  {/* Status Switcher */}
                  <div className="flex items-center gap-3">
                     <div className="flex items-center bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        {[
                          { s: 'Active', icon: Play, color: 'text-emerald-500', label: strings.common.active },
                          { s: 'Paused', icon: Pause, color: 'text-orange-500', label: strings.common.paused },
                          { s: 'Archived', icon: Archive, color: 'text-slate-500', label: strings.common.archived },
                          { s: 'Closed', icon: XCircle, color: 'text-red-500', label: strings.common.closed }
                        ].map(({ s, icon: Icon, color, label }) => (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(job, s as JobStatus)}
                            title={label}
                            className={`p-2 rounded-xl transition-all ${
                              job.status === s 
                                ? 'bg-slate-100 dark:bg-slate-800 shadow-inner ' + color 
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                          >
                            <Icon size={18} />
                          </button>
                        ))}
                     </div>
                  </div>
                </div>
              </div>

              {expandedShareId === job.id && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 shadow-inner">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.formLink}</p>
                      {copiedId === job.id + 'apply' && <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">{t.copied}</span>}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" readOnly value={`${import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin}/apply/${job.id}`} className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-[10px] font-mono outline-none text-slate-600 dark:text-slate-400" />
                      <button 
                        onClick={() => handleCopyLink(job, 'apply')}
                        className={`p-3 rounded-xl transition-all ${copiedId === job.id + 'apply' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600'}`}
                      >
                        {copiedId === job.id + 'apply' ? <Check size={18}/> : <Copy size={18}/>}
                      </button>
                    </div>
                  </div>
                  <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-100 dark:border-indigo-900 space-y-3 shadow-inner">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t.liveRoom}</p>
                      {copiedId === job.shareToken + 'interview' && <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">{t.copied}</span>}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" readOnly value={`${import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin}/i/${job.shareToken}`} className="flex-1 bg-slate-50 dark:bg-slate-800 border border-indigo-50 dark:border-indigo-950 rounded-xl px-4 py-2.5 text-[10px] font-mono outline-none text-slate-600 dark:text-slate-400" />
                      <button 
                        onClick={() => handleCopyLink(job, 'interview')}
                        className={`p-3 rounded-xl transition-all ${copiedId === job.shareToken + 'interview' ? 'bg-emerald-500 text-white' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-400 hover:text-indigo-600'}`}
                      >
                        {copiedId === job.shareToken + 'interview' ? <Check size={18}/> : <Video size={18}/>}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Talent Pipeline Table */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Star className="text-orange-500" />
            {t.pipelineTitle}
          </h3>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder={language === Language.RU ? "Поиск..." : language === Language.EN ? "Search..." : "Qidirish..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-600 w-full sm:w-[220px]"
              />
            </div>
            <div className="flex items-center gap-3">
              <select
                value={filterJobId ?? ''}
                onChange={(e) => setFilterJobId(e.target.value === '' ? null : e.target.value)}
                className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-600 min-w-[160px]"
              >
                <option value="">{t.allVacancies}</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} {job.department ? `(${job.department})` : ''}
                  </option>
                ))}
              </select>
              <span className="text-slate-400 dark:text-slate-500 text-xs font-bold whitespace-nowrap">
                {filteredProfiles.length} / {unifiedProfiles.length}
              </span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <th className="pb-4 text-left px-4">{t.tableCandidate}</th>
                <th className="pb-4 text-left px-4">{t.tableStage}</th>
                <th className="pb-4 text-center px-4">{t.tableResult}</th>
                <th className="pb-4 text-center px-4">{t.tableInterview}</th>
                <th className="pb-4 text-right px-4">{t.tableActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredProfiles.map((p) => (
                <tr key={p.app.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => setSelectedProfileId(p.app.id)}>
                  <td className="py-6 px-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center font-black text-indigo-700 dark:text-indigo-400">{(getDisplayName(p) || '?')[0]}</div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white">{getDisplayName(p)}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{getJobTitle(p.app.jobId)}</p>
                        {(p.session?.candidateId && p.session.candidateId.startsWith('CAND-')) && (
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">ID: {p.session.candidateId}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-4">
                    <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                      {p.app.status}
                    </span>
                  </td>
                  <td className="py-6 px-4 text-center">
                    {(() => {
                      const status = getCandidateScoreStatus(p.app.analysis, p.session?.evaluation);
                      if (!status) return <span className="text-slate-400 dark:text-slate-500 text-sm">—</span>;
                      const label = getStatusLabel(status, t);
                      const badgeClass =
                        status === "A'lo"
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : status === 'Yaxshi'
                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                            : status === "O'rta"
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
                      return (
                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border ${badgeClass}`}>
                          {label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-6 px-4 text-center font-black text-indigo-600 dark:text-indigo-400 text-sm">
                    {(() => {
                      const score100 = getAggregateScore100(p.app.analysis, p.session?.evaluation);
                      if (score100 == null) return '—';
                      return `${score100}%`;
                    })()}
                  </td>
                  <td className="py-6 px-4 text-right">
                    <button className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all text-slate-400">
                       <ArrowRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profile Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-xl">
          <div className="bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[95vh] overflow-hidden rounded-[1.5rem] sm:rounded-[3rem] shadow-2xl flex flex-col transition-colors">
            <div className="p-4 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center gap-3 shrink-0">
              <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-600 rounded-xl sm:rounded-[1.5rem] shrink-0 flex items-center justify-center text-white text-xl sm:text-2xl font-black">{(getDisplayName(selectedProfile) || '?')[0]}</div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white truncate">{getDisplayName(selectedProfile)}</h3>
                  <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-widest mt-0.5 truncate">
                    {getJobTitle(selectedProfile.app.jobId)}
                  </p>
                  {(selectedProfile.session?.candidateId && selectedProfile.session.candidateId.startsWith('CAND-')) && (
                    <p className="text-slate-400 dark:text-slate-500 font-mono text-xs mt-1">ID: {selectedProfile.session.candidateId}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => {
                    navigate(`/candidate-profile/${selectedProfile.app.id}`);
                  }}
                  className="hidden sm:flex px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl sm:rounded-2xl transition-all text-xs sm:text-sm font-bold uppercase tracking-widest items-center gap-2"
                  title={t.viewProfile}
                >
                  <ExternalLink size={16} />
                  {t.viewProfile}
                </button>
                <button onClick={() => setSelectedProfileId(null)} className="p-2 sm:p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400 dark:text-slate-500"><X size={22}/></button>
              </div>
            </div>

            <div className="flex shrink-0 border-b border-slate-100 dark:border-slate-800 px-2 sm:px-8 overflow-x-auto no-scrollbar bg-white dark:bg-slate-900 relative z-10">
              {[
                { id: 'Analysis', label: t.profileAnalysis },
                { id: 'Interview', label: t.profileInterview },
                { id: 'Chat', label: t.profileChat }
              ].map((tab) => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 sm:px-8 py-3 sm:py-5 text-xs font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
              {/* Kandidatning oldingi suhbatlari va natijalari */}
              <div className="mb-10 pb-8 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">{t.previousInterviews ?? "Oldingi suhbatlar"}</h4>
                {candidateHistoryLoading ? (
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm"><Loader2 className="animate-spin" size={18} /> {t.loading ?? "Yuklanmoqda..."}</div>
                ) : candidateHistory.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t.noPreviousInterviews ?? "Oldingi suhbatlar yo'q."}</p>
                ) : (
                  <div className="overflow-x-auto -mx-1">
                    <table className="w-full text-sm min-w-[360px]">
                      <thead>
                        <tr className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                          <th className="pb-3 text-left pr-3">{t.vacancyColumn ?? "Vakansiya"}</th>
                          <th className="pb-3 text-left pr-3 whitespace-nowrap">{t.dateColumn ?? "Sana"}</th>
                          <th className="pb-3 text-center pr-3 whitespace-nowrap">{t.resultColumn ?? "Natija"}</th>
                          <th className="pb-3 text-left whitespace-nowrap">{t.statusColumn ?? "Holat"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {candidateHistory.map((s) => (
                          <tr key={s.id} className="text-slate-700 dark:text-slate-300">
                            <td className="py-3 pr-3 font-bold text-xs">{s.jobTitle ?? getJobTitle(s.jobId)}{s.jobDepartment ? ` (${s.jobDepartment})` : ''}</td>
                            <td className="py-3 pr-3 text-slate-600 dark:text-slate-400 whitespace-nowrap text-xs">{s.completedAt ? new Date(s.completedAt).toLocaleDateString() : (s.startedAt ? new Date(s.startedAt).toLocaleDateString() : '—')}</td>
                            <td className="py-3 pr-3 text-center">
                              {s.evaluation?.overallScore != null ? (
                                <span className="font-black text-indigo-600 dark:text-indigo-400 text-xs">{s.evaluation.overallScore}/10</span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3">
                              <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{translateStatus(s.status)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {activeTab === 'Analysis' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                   {selectedProfile.session?.status !== 'Completed' || (!selectedProfile.app.analysis && !selectedProfile.session?.evaluation) ? (
                     <div className="bg-amber-50 dark:bg-amber-900/20 p-8 rounded-[2.5rem] border border-amber-200 dark:border-amber-800/50">
                       <p className="text-lg font-bold text-amber-800 dark:text-amber-200">
                         {selectedProfile.session?.status === 'Started' || selectedProfile.session?.status === 'In Progress'
                           ? t.interviewNotCompleted
                           : t.noEvaluation}
                       </p>
                     </div>
                   ) : null}
                   <div className="bg-orange-50 dark:bg-orange-900/10 p-8 rounded-[2.5rem] border border-orange-100 dark:border-orange-900/30">
                     <p className="text-xl font-bold text-slate-700 dark:text-slate-300 italic">&quot;{selectedProfile.app.analysis?.summary || selectedProfile.session?.evaluation?.summary || '—'}&quot;</p>
                   </div>
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700">
                         <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-6">{t.scoreMatrix}</h4>
                         <div className="space-y-4">
                            {(selectedProfile.app.analysis
                              ? [
                                  { l: t.skillsMatch, v: selectedProfile.app.analysis?.skillsScore, unit: '%' },
                                  { l: t.relevance, v: selectedProfile.app.analysis?.relevanceScore, unit: '%' }
                                ]
                              : selectedProfile.session?.evaluation
                              ? [
                                  { l: t.technical, v: (selectedProfile.session.evaluation.technicalScore || 0) * 10, unit: '%' },
                                  { l: t.communication, v: (selectedProfile.session.evaluation.communicationScore || 0) * 10, unit: '%' },
                                  { l: t.overall, v: (selectedProfile.session.evaluation.overallScore || 0) * 10, unit: '%' }
                                ]
                              : []
                            ).map((m, i) => (
                              <div key={i} className="space-y-1">
                                <div className="flex justify-between text-[10px] font-black dark:text-slate-300"><span>{m.l}</span><span>{m.v}{m.unit}</span></div>
                                <div className="h-2 bg-white dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full" style={{ width: `${m.v}%` }} /></div>
                              </div>
                            ))}
                         </div>
                         {selectedProfile.session?.evaluation?.overallRecommendation && (
                           <p className="mt-4 text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{translateRecommendation(selectedProfile.session.evaluation.overallRecommendation)}</p>
                         )}
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700">
                         <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-6">{selectedProfile.app.analysis ? t.detectedSkills : t.strengthsWeaknesses}</h4>
                         {selectedProfile.app.analysis?.detectedSkills?.length ? (
                           <div className="flex flex-wrap gap-2">
                             {selectedProfile.app.analysis.detectedSkills.map((s, i) => (
                               <span key={i} className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{s}</span>
                             ))}
                           </div>
                         ) : selectedProfile.session?.evaluation ? (
                           <div className="space-y-4">
                             {selectedProfile.session.evaluation.strengths?.length ? (
                               <div>
                                 <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">{t.strengths}</p>
                                 <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">{selectedProfile.session.evaluation.strengths.map((s, i) => <li key={i}>• {s}</li>)}</ul>
                               </div>
                             ) : null}
                             {selectedProfile.session.evaluation.weaknesses?.length ? (
                               <div>
                                 <p className="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-2">{t.weaknesses}</p>
                                 <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">{selectedProfile.session.evaluation.weaknesses.map((w, i) => <li key={i}>• {w}</li>)}</ul>
                               </div>
                             ) : null}
                           </div>
                         ) : (
                           <p className="text-slate-400 text-sm">—</p>
                         )}
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 'Interview' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                  {selectedProfile.session ? (
                    <>
                       {selectedProfile.session.hasRecording && (
                         <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-slate-700">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">{t.profileRecording}</h4>
                           {recordingLoading ? (
                             <div className="aspect-video bg-slate-800 rounded-2xl flex items-center justify-center">
                               <Loader2 className="animate-spin text-indigo-500" size={40} />
                             </div>
                           ) : recordingUrl ? (
                             <video src={recordingUrl} controls className="w-full aspect-video rounded-2xl bg-black outline-none" />
                           ) : (
                             <p className="text-slate-500 text-sm py-8 text-center">{t.recordingNotLoaded}</p>
                           )}
                         </div>
                       )}
                       <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white">
                         <p className="text-xl font-bold italic">"{selectedProfile.session.evaluation?.summary}"</p>
                       </div>
                       <div className="space-y-6">
                         {selectedProfile.session.answers.map((ans, i) => (
                           <div key={i} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                             <p className="font-black text-slate-900 dark:text-white mb-2">{t.questionLabel} {ans.questionText}</p>
                             <p className="text-slate-600 dark:text-slate-400 italic">"{t.answerLabel} {ans.text}"</p>
                             <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-[10px] font-black">
                               <span className="text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{t.scoreLabel}: {ans.score}/10</span>
                               <span className="text-slate-400 dark:text-slate-500">{ans.feedback}</span>
                             </div>
                           </div>
                         ))}
                       </div>
                    </>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem]">
                      <Video size={48} className="mb-4 opacity-20" />
                      <p className="font-bold uppercase text-xs tracking-widest">{t.interviewPending}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'Chat' && (
                <div className="flex flex-col h-[320px] sm:h-[500px] animate-in fade-in slide-in-from-bottom-2">
                   <div className="flex-1 overflow-y-auto space-y-4 p-4 custom-scrollbar">
                      {selectedProfile?.app.id?.startsWith('session-') ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 text-center">
                          <MessageSquare size={40} className="mb-4 opacity-10" />
                          <p className="text-xs font-black uppercase tracking-widest max-w-[280px]">{strings.hr.chatUnavailable}</p>
                        </div>
                      ) : profileMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 text-center">
                          <MessageSquare size={40} className="mb-4 opacity-10" />
                          <p className="text-xs font-black uppercase tracking-widest max-w-[200px]">{t.chatEmptyState}</p>
                        </div>
                      ) : (
                        profileMessages.map((msg) => (
                          <div key={msg.id} className="flex flex-col items-end">
                             <div className="bg-indigo-600 text-white p-4 rounded-[2rem] rounded-tr-none max-w-[80%] shadow-lg">
                               <p className="text-sm font-medium">{msg.text}</p>
                             </div>
                             <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 mt-2 uppercase tracking-widest">
                               {new Date(msg.timestamp).toLocaleTimeString()} • {msg.senderName}
                             </span>
                          </div>
                        ))
                      )}
                   </div>
                   {!selectedProfile?.app.id?.startsWith('session-') && (
                   <div className="p-6 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 rounded-[2rem] flex items-center gap-4 mt-4">
                      <input 
                        type="text" 
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={t.chatPlaceholder}
                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-400 transition-all dark:text-white"
                      />
                      <button 
                        onClick={handleSend}
                        className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
                      >
                        <Send size={20} />
                      </button>
                   </div>
                   )}
                </div>
              )}
            </div>

            <div className="p-4 sm:p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end">
               <button onClick={() => setSelectedProfileId(null)} className="px-6 sm:px-10 py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-xl sm:rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-slate-700 transition-all">
                {t.closeDossier}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRDashboard;
