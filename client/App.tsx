
import "./index.css"

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { 
  Sparkles, 
  Terminal, 
  Activity, 
  ArrowLeft,
  ArrowRight, 
  KeyRound, 
  Search, 
  Globe, 
  Lock, 
  MoreVertical, 
  Edit3, 
  Pause, 
  Play, 
  Archive, 
  Trash2,
  Users,
  CheckCircle2,
  BarChart2,
  Languages,
  Fingerprint,
  Loader2,
  ShieldCheck,
  Trophy,
  Home,
  Copy,
  Check,
  Video,
  AlertTriangle,
  Briefcase,
  Sun,
  Moon,
  LayoutDashboard,
  XCircle,
  Share2,
  AlertCircle,
  ShoppingCart
} from 'lucide-react';
import { User, UserRole, Job, InterviewSession, InterviewType, InterviewMode, JobVisibility, JobStatus, Language, InterviewCategory, CandidateApplication, ChatMessage } from './types';
import * as authApi from './services/authService';
import * as jobsService from './services/jobsService';
import * as applicationsService from './services/applicationsService';
import * as sessionsService from './services/sessionsService';
import * as chatService from './services/chatService';
import * as publicService from './services/publicService';
import * as profileService from './services/profileService';
import Layout from './components/Layout';
import { buildCopyText } from './utils/copyLinkText';
import Landing from './views/Landing';
import Auth from './views/Auth';
import HRDashboard from './views/HR/Dashboard';
import HRAnalytics from './views/HR/Analytics';
import CreateJob from './views/HR/CreateJob';
import InterviewRoom from './views/Candidate/InterviewRoom';
import ApplicationForm from './views/Candidate/ApplicationForm';
import AdminDashboard from './views/Admin/Dashboard';
import Tariffs from './views/Admin/Tariffs';
import Payments from './views/Admin/Payments';
import PaymentPage from './views/Candidate/PaymentPage';
import Profile from './views/Candidate/Profile';
import MyApplications from './views/Candidate/MyApplications';
import Jobs from './views/Jobs';
import CandidateProfileView from './views/HR/CandidateProfileView';
import PartnerDashboard from './views/PartnerDashboard';

import { UI_STRINGS } from "./translations";

function restoreUser(): User | null {
  const auth = authApi.getAuth();
  if (!auth?.user || typeof auth.user !== 'object') return null;
  const u = auth.user as { id: string; fullName: string; email: string; role: string; interviews?: number; freeJobsUsed?: number };
  const role =
    u.role === 'admin' ? UserRole.ADMIN
    : u.role === 'employer' ? UserRole.HR
    : UserRole.CANDIDATE;
  return {
    id: u.id,
    name: u.fullName,
    email: u.email,
    role,
    interviews: u.interviews || 0,
    freeJobsUsed: u.freeJobsUsed || 0,
  };
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(restoreUser);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    if (saved === 'ru') return Language.RU;
    if (saved === 'en') return Language.EN;
    if (saved === 'uz') return Language.UZ;
    return Language.RU; // default
  });
  
  // Language ni localStorage'ga saqlash
  useEffect(() => {
    const langCode = language === Language.RU ? 'ru' : (language === Language.EN ? 'en' : 'uz');
    localStorage.setItem('language', langCode);
  }, [language]);
  const [visitorCount, setVisitorCount] = useState(1240);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Subdomen asosida routing
  useEffect(() => {
    const hostname = window.location.hostname;
    const baseDomain = 'hrlodex.uz';
    const isProduction = hostname.endsWith(baseDomain);
    
    // Localhost yoki asosiy domenda bo'lsa mantiqni o'tkazib yuboramiz
    if (!isProduction || hostname === baseDomain || hostname === 'www.' + baseDomain) {
      return;
    }
    
    if (hostname.startsWith('admin.')) {
      if (!user) {
        if (window.location.pathname !== '/auth') window.location.href = '/auth';
      } else if (user.role !== UserRole.ADMIN) {
        window.location.href = `https://${baseDomain}/auth`;
      } else {
        if (window.location.pathname === '/' || window.location.pathname === '/auth') {
          window.location.href = '/admin-dashboard';
        }
      }
    } else if (hostname.startsWith('hr.')) {
      if (!user) {
        if (window.location.pathname !== '/auth') window.location.href = '/auth';
      } else if (user.role !== UserRole.HR) {
        window.location.href = `https://${baseDomain}/auth`;
      } else {
        if (window.location.pathname === '/' || window.location.pathname === '/auth') {
          window.location.href = '/hr-dashboard';
        }
      }
    } else if (hostname.startsWith('candidate.')) {
      if (!user) {
        if (window.location.pathname !== '/auth') window.location.href = '/auth';
      } else if (user.role !== UserRole.CANDIDATE) {
        window.location.href = `https://${baseDomain}/auth`;
      } else {
        if (window.location.pathname === '/' || window.location.pathname === '/auth') {
          window.location.href = '/candidate-dashboard';
        }
      }
    }
  }, [user]);

  // Dark mode ni qo'llash
  useEffect(() => {
    const root = document.documentElement;
    // Barcha mavjud dark class'larni olib tashlash
    root.classList.remove('dark');
    
    if (theme === 'dark') {
      root.classList.add('dark');
    }
    
    // Body elementga ham qo'llash
    document.body.classList.toggle('dark', theme === 'dark');
    
    localStorage.setItem('theme', theme);
  }, [theme]);

  // User interviews va freeJobsUsed ni yangilash (to'lovlar tasdiqlanganda)
  useEffect(() => {
    if (!user || user.role !== UserRole.HR) return;
    const interval = setInterval(async () => {
      try {
        const profile = await profileService.getProfile();
        const nextInterviews = profile.user.interviews ?? 0;
        const nextFreeJobsUsed = profile.user.freeJobsUsed ?? 0;
        setUser(prev => {
          if (!prev) return prev;
          if (
            (prev.interviews ?? 0) === nextInterviews &&
            (prev.freeJobsUsed ?? 0) === nextFreeJobsUsed
          ) {
            return prev;
          }
          return {
            ...prev,
            interviews: nextInterviews,
            freeJobsUsed: nextFreeJobsUsed,
          };
        });
      } catch (error) {
        // Ignore
      }
    }, 30000); // 30 soniyada bir marta tekshirish

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== UserRole.HR) return;
    let cancelled = false;

    (async () => {
      try {
        const profile = await profileService.getProfile();
        if (cancelled) return;
        setUser(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            interviews: profile.user.interviews ?? prev.interviews ?? 0,
            freeJobsUsed: profile.user.freeJobsUsed ?? prev.freeJobsUsed ?? 0,
          };
        });
      } catch {
        // Ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!user || (user.role !== UserRole.HR && user.role !== UserRole.ADMIN)) return;
    setDataLoading(true);
    Promise.all([
      jobsService.getJobs(),
      applicationsService.getApplications(),
      chatService.getChat(),
      sessionsService.getSessions(),
    ])
      .then(([jobsList, appsList, chatList, sessionsList]) => {
        setJobs(jobsList);
        setApplications(appsList);
        setMessages(chatList);
        setSessions(sessionsList);
      })
      .catch(() => {})
      .finally(() => setDataLoading(false));
  }, [user?.id, user?.role]);

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      // Darhol qo'llash (state o'zgarguncha kutmaslik uchun)
      const root = document.documentElement;
      if (newTheme === 'dark') {
        root.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        root.classList.remove('dark');
        document.body.classList.remove('dark');
      }
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  };

  const handleJobCreate = async (job: Job) => {
    try {
      const created = await jobsService.createJob({
      title: job.title,
      department: job.department,
      role: job.role,
      description: job.description,
      experienceLevel: job.experienceLevel,
      requiredSkills: job.requiredSkills,
      interviewType: job.interviewType,
      interviewCategory: job.interviewCategory,
      interviewMode: job.interviewMode,
      visibility: job.visibility,
      sourceLanguage: job.sourceLanguage,
      resumeRequired: job.resumeRequired,
      recordingEnabled: job.recordingEnabled,
      questions: job.questions,
      deadline: job.deadline,
      status: job.status,
    });
      setJobs(prev => [created, ...prev]);
      // Interviews va freeJobsUsed yangilandi bo'lsa, user ni yangilash
      if (user && user.role === UserRole.HR) {
        const response = created as any;
        setUser(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            interviews: response.interviews !== undefined ? response.interviews : prev.interviews ?? 0,
            freeJobsUsed: response.freeJobsUsed !== undefined ? response.freeJobsUsed : prev.freeJobsUsed ?? 0,
          };
        });
      }
      return created;
    } catch (error: any) {
      // Backend'dan kelgan error message ni to'g'ridan-to'g'ri ko'rsatish (backend allaqachon tarjima qilgan)
      if (error.message) {
        throw error; // Backend'dan kelgan message ni qaytarish
      }
      throw error;
    }
  };

  const handleJobUpdate = async (updatedJob: Job) => {
    await jobsService.updateJob(updatedJob.id, {
      title: updatedJob.title,
      department: updatedJob.department,
      role: updatedJob.role,
      description: updatedJob.description,
      experienceLevel: updatedJob.experienceLevel,
      requiredSkills: updatedJob.requiredSkills,
      interviewType: updatedJob.interviewType,
      interviewCategory: updatedJob.interviewCategory,
      interviewMode: updatedJob.interviewMode,
      visibility: updatedJob.visibility,
      sourceLanguage: updatedJob.sourceLanguage,
      resumeRequired: updatedJob.resumeRequired,
      questions: updatedJob.questions,
      deadline: updatedJob.deadline,
      status: updatedJob.status,
    });
    setJobs(prev => prev.map(j => (j.id === updatedJob.id ? updatedJob : j)));
  };

  const handleJobDelete = async (id: string) => {
    await jobsService.deleteJob(id);
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  const handleApply = (app: CandidateApplication) => setApplications(prev => [app, ...prev]);

  const handleSendMessage = async (applicationId: string, text: string) => {
    const msg = await chatService.sendMessage(applicationId, text);
    setMessages(prev => [...prev, msg]);
  };

  type StartParams = { code?: string; token?: string; applicationId?: string; language: Language };
  const handleStartSession = async (params: StartParams): Promise<{ job: Job; session: InterviewSession }> => {
    const candidateName = user?.role === UserRole.CANDIDATE && user?.name ? user.name : undefined;
    try {
      if (params.token) {
        const job = await publicService.getJobByToken(params.token);
        if (!job) throw new Error('Invalid link');
        const session = await publicService.startSession({
          jobId: job.id,
          applicationId: params.applicationId,
          language: params.language,
          candidateName,
        });
        return { job, session };
      }
      if (params.code) {
        const job = await publicService.validateInvite(params.code);
        if (!job) throw new Error('Invalid code');
        const session = await publicService.startSession({
          code: params.code,
          language: params.language,
          candidateName,
        });
        // Interviews va freeJobsUsed yangilandi bo'lsa, user ni yangilash
        if (user && user.role === UserRole.HR) {
          const response = session as any;
          setUser({ 
            ...user, 
            interviews: response.interviewsRemaining !== undefined ? response.interviewsRemaining : user.interviews || 0,
            freeJobsUsed: response.freeJobsUsed !== undefined ? response.freeJobsUsed : user.freeJobsUsed || 0,
          });
        }
        return { job, session };
      }
      throw new Error('Missing code or token');
    } catch (error: any) {
      // Backend'dan kelgan error message ni to'g'ridan-to'g'ri ko'rsatish (backend allaqachon tarjima qilgan)
      if (error.requiresPayment && error.message) {
        throw error; // Backend'dan kelgan message ni qaytarish
      }
      throw error;
    }
  };

  const handleInterviewComplete = async (session: InterviewSession) => {
    const completed = await publicService.completeSession(session.id, {
      answers: session.answers.map((a) => ({ questionId: a.questionId, questionText: a.questionText, text: a.text })),
      skipAiEvaluation: false,
    });
    setSessions(prev =>
      prev.map(s => (s.id === session.id ? { ...completed, applicationId: session.applicationId } : s))
    );
    if (session.applicationId) {
      setApplications(prev =>
        prev.map(app => (app.id === session.applicationId ? { ...app, status: 'Completed' } : app))
      );
    }
  };

  const handleUpdateApplicationStatus = async (
    applicationId: string,
    status: applicationsService.ApplicationStatus
  ) => {
    await applicationsService.updateApplicationStatus(applicationId, status);
    setApplications(prev =>
      prev.map(app => (app.id === applicationId ? { ...app, status } : app))
    );
  };

  const logout = () => {
    authApi.clearAuth();
    setUser(null);
  };
  const incrementVisitors = () => setVisitorCount(prev => prev + 1);

  return (
    <BrowserRouter>
      <Routes>

        <Route path="/i/:token" element={<InstantGuard user={user} language={language} setLanguage={setLanguage} onStart={handleStartSession} onComplete={handleInterviewComplete} messages={messages} theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/apply/:jobId" element={<ApplyGuard user={user} jobs={jobs} language={language} onApply={handleApply} theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/jobs" element={<Jobs language={language} setLanguage={setLanguage} theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/auth" element={<AuthRoute user={user} onLogin={setUser} language={language} theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/" element={<Landing user={user} language={language} setLanguage={setLanguage} onVisit={incrementVisitors} theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/*" element={
          user ? (
            <Layout user={user} onLogout={logout} language={language} setLanguage={setLanguage} theme={theme} toggleTheme={toggleTheme}>
              <Routes>
                <Route path="/partner-dashboard" element={<PartnerDashboard language={language} />} />
                {user.role === UserRole.ADMIN && (
                   <>
                    <Route path="/admin-dashboard" element={<AdminDashboard jobsCount={jobs.length} hrCount={32} candidateCount={applications.length} visitorCount={visitorCount} language={language} />} />
                    <Route path="/admin-tariffs" element={<Tariffs language={language} />} />
                    <Route path="/admin-payments" element={<Payments language={language} />} />
                    <Route path="*" element={<Navigate to="/admin-dashboard" />} />
                   </>
                )}
                {user.role === UserRole.HR && (
                  <>
                    <Route path="/hr-dashboard" element={<HRDashboard jobs={jobs} sessions={sessions} applications={applications} language={language} messages={messages} onSendMessage={handleSendMessage} onUpdateJob={handleJobUpdate} onUpdateApplicationStatus={handleUpdateApplicationStatus} dataLoading={dataLoading} user={user} />} />
                    <Route path="/hr-analytics" element={<HRAnalytics jobs={jobs} sessions={sessions} applications={applications} messages={messages} onSendMessage={handleSendMessage} language={language} />} />
                    <Route path="/create-job" element={<CreateJob onJobCreate={handleJobCreate} language={language} user={user} />} />
                    <Route path="/hr-jobs" element={<JobList jobs={jobs} language={language} onUpdate={handleJobUpdate} onDelete={handleJobDelete} />} />
                    <Route path="/candidate-profile/:applicationId" element={<CandidateProfileView language={language} />} />
                    <Route path="/buy-credits" element={<PaymentPage language={language} user={user} onPaymentSuccess={async () => { 
                      // User state ni yangilash - profile'dan yangi ma'lumotlarni olish
                      try {
                        const profile = await profileService.getProfile();
                        setUser(prev => prev ? { ...prev, interviews: profile.user.interviews, freeJobsUsed: profile.user.freeJobsUsed } : prev);
                      } catch (e) {
                        console.error('Failed to refresh user profile:', e);
                      }
                      window.location.href = '/hr-dashboard';
                    }} />} />
                    <Route path="*" element={<Navigate to="/hr-dashboard" />} />
                  </>
                )}
                {user.role === UserRole.CANDIDATE && (
                  <>
                    <Route path="/candidate-dashboard" element={<CandidateDashboard jobs={jobs} language={language} onStart={handleStartSession} onComplete={handleInterviewComplete} messages={messages} user={user} />} />
                    <Route path="/my-applications" element={<MyApplications language={language} />} />
                    <Route path="/profile" element={<Profile user={user!} language={language} onUpdateUser={setUser} />} />
                    <Route path="/buy-credits" element={<PaymentPage language={language} user={user!} onPaymentSuccess={async () => { 
                      // User state ni yangilash - profile'dan yangi ma'lumotlarni olish
                      try {
                        const profile = await profileService.getProfile();
                        setUser(prev => prev ? { ...prev, interviews: profile.user.interviews, freeJobsUsed: profile.user.freeJobsUsed } : prev);
                      } catch (e) {
                        console.error('Failed to refresh user profile:', e);
                      }
                      window.location.href = '/candidate-dashboard';
                    }} />} />
                    <Route path="*" element={<Navigate to="/candidate-dashboard" />} />
                  </>
                )}
              </Routes>
            </Layout>
          ) : <Navigate to="/auth" />
        } />
      </Routes>
    </BrowserRouter>
  );
};

type StartSessionFn = (params: { code?: string; token?: string; applicationId?: string; language: Language }) => Promise<{ job: Job; session: InterviewSession }>;

// Route guard: /i/:token — requires auth, preserves token in redirect
const InstantGuard: React.FC<{ user: User | null; language: Language; setLanguage: (l: Language) => void; onStart: StartSessionFn; onComplete: (s: InterviewSession) => void | Promise<void>; messages: ChatMessage[]; theme: 'light' | 'dark'; toggleTheme: () => void }> = ({ user, ...rest }) => {
  const { token } = useParams<{ token: string }>();
  if (!user) return <Navigate to={`/auth?redirect=${encodeURIComponent('/i/' + (token || ''))}`} replace />;
  return <InstantLanding {...rest} />;
};

// Route guard: /apply/:jobId — requires auth, preserves jobId in redirect
const ApplyGuard: React.FC<{ user: User | null; jobs: Job[]; language: Language; onApply: (app: CandidateApplication) => void; theme: 'light' | 'dark'; toggleTheme: () => void }> = ({ user, ...rest }) => {
  const { jobId } = useParams<{ jobId: string }>();
  if (!user) return <Navigate to={`/auth?redirect=${encodeURIComponent('/apply/' + (jobId || ''))}`} replace />;
  return <ApplicationForm user={user} {...rest} />;
};

// Auth page: redirects logged-in users to their dashboard or ?redirect= target
const AuthRoute: React.FC<{ user: User | null; onLogin: (u: User) => void; language: Language; theme: 'light' | 'dark'; toggleTheme: () => void }> = ({ user, onLogin, language, theme, toggleTheme }) => {
  const [searchParams] = useSearchParams();
  if (user) {
    const redirect = searchParams.get('redirect');
    const dest = redirect || (user.role === UserRole.ADMIN ? '/admin-dashboard' : user.role === UserRole.HR ? '/hr-dashboard' : '/candidate-dashboard');
    return <Navigate to={dest} replace />;
  }
  return <Auth onLogin={onLogin} language={language} theme={theme} toggleTheme={toggleTheme} />;
};

const InviteEntry: React.FC<{ language: Language; setLanguage: (l: Language) => void; onStart: StartSessionFn; onComplete: (s: InterviewSession) => void | Promise<void>; messages: ChatMessage[]; theme: 'light' | 'dark'; toggleTheme: () => void }> = ({ language, setLanguage, onStart, onComplete, messages, theme, toggleTheme }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [currentSession, setCurrentSession] = useState<InterviewSession | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeError, setCompleteError] = useState('');
  const t = UI_STRINGS[language].candidate;
  const navigate = useNavigate();

  const handleEnter = async () => {
    setError('');
    const cleanCode = code.includes('/i/') ? code.split('/i/').pop()?.split('/')[0]?.split('?')[0] || '' : code.trim();
    if (!cleanCode) {
      setError(t.errorInvalid);
      return;
    }
    setIsValidating(true);
    try {
      const { job, session } = await onStart({ code: cleanCode, language });
      if (job.status === 'Archived' || job.status === 'Paused' || job.status === 'Closed') {
        setError(t.errorInactive);
        return;
      }
      if (job.deadline && new Date(job.deadline) < new Date()) {
        setError(t.errorExpired);
        return;
      }
      setCurrentJob(job);
      setCurrentSession(session);
    } catch {
      setError(t.errorInvalid);
    } finally {
      setIsValidating(false);
    }
  };

  if (isDone && currentSession) return <SuccessScreen sessionId={currentSession.id} candidateId={currentSession.candidateId} language={language} />;
  if (isCompleting) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-6 text-center text-white bg-slate-950">
      <Loader2 className="text-indigo-500 animate-spin" size={64} />
      <h2 className="text-2xl font-bold">Saving interview & running AI evaluation...</h2>
    </div>
  );
  if (completeError) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-6 text-center text-white bg-slate-950">
      <div className="max-w-md bg-slate-900 p-10 rounded-[2rem] border border-red-500/20 space-y-6">
        <h2 className="text-xl font-bold text-red-400">Could not save interview</h2>
        <p className="text-sm text-slate-400">{completeError}</p>
        <div className="flex gap-3">
          <button onClick={() => navigate('/')} className="flex-1 py-4 font-bold bg-slate-800 rounded-2xl hover:bg-slate-700">Home</button>
          <button onClick={() => setCompleteError('')} className="flex-1 py-4 font-bold bg-indigo-600 rounded-2xl hover:bg-indigo-700">Try again</button>
        </div>
      </div>
    </div>
  );
  if (isValidating) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-6 text-center text-white bg-slate-950">
      <Loader2 className="text-indigo-500 animate-spin" size={64} />
      <h2 className="text-2xl font-bold">{t.validating}</h2>
    </div>
  );
  if (currentJob && currentSession) return (
    <InterviewRoom
      job={currentJob}
      initialLanguage={language}
      onComplete={async (s) => {
        setCompleteError('');
        setIsCompleting(true);
        try {
          await onComplete(s);
          setIsDone(true);
        } catch (e) {
          setCompleteError((e as Error)?.message ?? 'Failed to save interview');
        } finally {
          setIsCompleting(false);
        }
      }}
      session={currentSession}
      messages={messages.filter(m => m.applicationId === currentSession.applicationId)}
      theme={theme}
      toggleTheme={toggleTheme}
    />
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-6 text-white bg-slate-950">
      <button 
        onClick={() => navigate('/')}
        className="absolute flex items-center gap-2 p-3 text-white transition-all border top-8 left-8 bg-white/10 backdrop-blur-xl border-white/20 rounded-2xl hover:bg-white/20 active:scale-95"
      >
        <ArrowLeft size={20} />
      </button>

      <div className="max-w-md w-full bg-slate-900 p-12 rounded-[3rem] shadow-2xl border border-slate-800 text-center">
        <KeyRound className="mx-auto mb-10 text-indigo-500" size={48} />
        <h1 className="mb-4 text-4xl font-black">{t.joinTitle}</h1>
        <div className="space-y-4">
          <input 
            type="text" 
            value={code} 
            onChange={e => setCode(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleEnter()} 
            placeholder={t.placeholder} 
            className="w-full p-6 text-xl font-bold text-center transition-all border outline-none bg-slate-800 border-slate-700 rounded-3xl focus:ring-4 focus:ring-indigo-600/20 focus:border-indigo-600" 
          />
          {error && (
            <div className="flex items-center gap-2 p-4 text-sm font-bold text-red-400 border bg-red-500/10 border-red-500/20 rounded-2xl animate-in slide-in-from-top-2">
              <AlertTriangle size={18} />
              {error}
            </div>
          )}
          <button 
            onClick={handleEnter} 
            className="w-full py-6 text-xl font-black transition-all bg-indigo-600 shadow-xl rounded-3xl hover:bg-indigo-700 shadow-indigo-100 dark:shadow-none active:scale-95"
          >
            {t.validateBtn}
          </button>
        </div>
      </div>
    </div>
  );
};

const InstantLanding: React.FC<{ language: Language; setLanguage: (l: Language) => void; onStart: StartSessionFn; onComplete: (s: InterviewSession) => void | Promise<void>; messages: ChatMessage[]; theme: 'light' | 'dark'; toggleTheme: () => void }> = ({ language, setLanguage, onStart, onComplete, messages, theme, toggleTheme }) => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const applicationId = queryParams.get('appId') || undefined;
  const params = useParams();
  const token = params.token;
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [currentSession, setCurrentSession] = useState<InterviewSession | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeError, setCompleteError] = useState('');
  const t = UI_STRINGS[language].candidate;
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setError(t.errorInvalid);
      return;
    }
    publicService.getJobByToken(token).then((j) => {
      if (!j) setError(t.errorInvalid);
      else if (j.status !== 'Active') setError(t.errorInactive);
      else if (j.deadline && new Date(j.deadline) < new Date()) setError(t.errorExpired);
      else setJob(j);
    }).catch(() => setError(t.errorInvalid));
  }, [token, t.errorInvalid, t.errorInactive, t.errorExpired]);

  const handleStart = async () => {
    if (!token) return;
    setIsValidating(true);
    try {
      const { job: j, session } = await onStart({ token, applicationId, language });
      setJob(j);
      setCurrentSession(session);
    } catch {
      setError(t.errorInvalid);
    } finally {
      setIsValidating(false);
    }
  };

  if (error) return (
    <div className="flex items-center justify-center min-h-screen p-6 text-center text-white bg-slate-950">
      <div className="max-w-md w-full bg-slate-900 p-12 rounded-[3rem] border border-red-500/20 space-y-6">
        <AlertTriangle size={64} className="mx-auto mb-4 text-red-500" />
        <h1 className="text-3xl font-black">{error}</h1>
        <p className="font-medium text-slate-500">Please contact HR if you believe this is an error.</p>
        <button onClick={() => navigate('/')} className="w-full py-4 font-bold transition-all bg-slate-800 rounded-2xl hover:bg-slate-700">Go Back Home</button>
      </div>
    </div>
  );

  if (!job) return <div className="flex items-center justify-center min-h-screen text-white bg-slate-950"><Loader2 className="animate-spin" size={48} /></div>;
  if (isDone && currentSession) return <SuccessScreen sessionId={currentSession.id} candidateId={currentSession.candidateId} language={language} />;
  if (isCompleting) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-6 text-center text-white bg-slate-950">
      <Loader2 className="text-indigo-500 animate-spin" size={64} />
      <h2 className="text-2xl font-bold">Saving interview & running AI evaluation...</h2>
    </div>
  );
  if (completeError) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-6 text-center text-white bg-slate-950">
      <div className="max-w-md bg-slate-900 p-10 rounded-[2rem] border border-red-500/20 space-y-6">
        <h2 className="text-xl font-bold text-red-400">Could not save interview</h2>
        <p className="text-sm text-slate-400">{completeError}</p>
        <div className="flex gap-3">
          <button onClick={() => navigate('/')} className="flex-1 py-4 font-bold bg-slate-800 rounded-2xl hover:bg-slate-700">Home</button>
          <button onClick={() => setCompleteError('')} className="flex-1 py-4 font-bold bg-indigo-600 rounded-2xl hover:bg-indigo-700">Try again</button>
        </div>
      </div>
    </div>
  );
  if (currentSession) return (
    <InterviewRoom
      job={job}
      initialLanguage={language}
      onComplete={async (s) => {
        setCompleteError('');
        setIsCompleting(true);
        try {
          await onComplete(s);
          setIsDone(true);
        } catch (e) {
          setCompleteError((e as Error)?.message ?? 'Failed to save interview');
        } finally {
          setIsCompleting(false);
        }
      }}
      session={currentSession}
      messages={messages.filter(m => m.applicationId === applicationId)}
      theme={theme}
      toggleTheme={toggleTheme}
    />
  );

  return (
    <div className="flex items-center justify-center min-h-screen p-6 text-white bg-slate-950">
      <button 
        onClick={() => navigate('/')}
        className="absolute flex items-center gap-2 p-3 text-white transition-all border top-8 left-8 bg-white/10 backdrop-blur-xl border-white/20 rounded-2xl hover:bg-white/20 active:scale-95"
      >
        <ArrowLeft size={20} />
      </button>

      <div className="max-w-md w-full bg-slate-900 p-12 rounded-[3rem] shadow-2xl text-center border border-slate-800 space-y-8 animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-indigo-600 rounded-[1.5rem] mx-auto flex items-center justify-center shadow-2xl shadow-indigo-600/20">
          <Video size={40} />
        </div>
        <div>
          <h1 className="mb-2 text-3xl font-black tracking-tight">{job.title}</h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{job.department} • Live Session</p>
        </div>
        <button 
          onClick={handleStart}
          disabled={isValidating}
          className="flex items-center justify-center w-full py-6 text-xl font-black transition-all bg-indigo-600 shadow-xl rounded-3xl hover:bg-indigo-700 shadow-indigo-100 dark:shadow-none active:scale-95 disabled:opacity-70"
        >
          {isValidating ? <Loader2 className="animate-spin" size={24} /> : 'Start Interview'}
        </button>
      </div>
    </div>
  );
};

const SuccessScreen: React.FC<{ sessionId: string, candidateId: string, language: Language, onReturn?: () => void }> = ({ sessionId, candidateId, language, onReturn }) => {
  const t = UI_STRINGS[language].candidate;
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleFeedbackSubmit = async () => {
    if (rating === 0) return;
    setIsSending(true);
    try {
      await publicService.addCandidateFeedback(sessionId, rating, comment);
      setFeedbackSent(true);
    } catch(e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center text-white duration-700 bg-slate-950 animate-in fade-in">
      <Trophy size={80} className="text-emerald-500 mb-10 drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]" />
      <h2 className="mb-4 text-5xl font-black tracking-tighter">{t.congrats}</h2>
      <p className="max-w-sm mb-12 text-lg font-medium leading-relaxed text-slate-400">{t.finishMessage}</p>
      <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 mb-8 shadow-inner">
        <p className="text-xs text-slate-500 uppercase font-black tracking-[0.3em] mb-3">{t.idAssigned}</p>
        <p className="text-3xl font-black tracking-widest text-indigo-400">{candidateId}</p>
      </div>

      {!feedbackSent && (
        <div className="w-full max-w-md p-6 mb-8 bg-slate-900 border border-slate-800 rounded-3xl">
          <h3 className="text-xl font-bold mb-4">Intervyuni baholang</h3>
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => setRating(star)} className={`text-3xl ${rating >= star ? 'text-amber-400' : 'text-slate-600'} hover:scale-110 transition-transform`}>
                ★
              </button>
            ))}
          </div>
          <textarea 
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Qo'shimcha fikrlaringiz (ixtiyoriy)..."
            className="w-full p-4 mb-4 text-sm bg-slate-800 border border-slate-700 rounded-2xl outline-none focus:border-indigo-500 resize-none h-24"
          ></textarea>
          <button 
            onClick={handleFeedbackSubmit}
            disabled={rating === 0 || isSending}
            className="w-full py-3 font-bold bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSending ? 'Yuborilmoqda...' : 'Fikrni yuborish'}
          </button>
        </div>
      )}

      {feedbackSent && (
        <div className="w-full max-w-md p-6 mb-8 bg-emerald-900/20 border border-emerald-500/30 rounded-3xl text-emerald-400 font-bold">
          Fikringiz uchun rahmat!
        </div>
      )}
      
      <div className="flex flex-col w-full max-w-md gap-4 sm:flex-row">
        <button onClick={() => navigate('/')} className="flex items-center justify-center flex-1 gap-3 px-8 py-5 text-lg font-black transition-all bg-indigo-600 shadow-2xl rounded-3xl hover:bg-indigo-700 active:scale-95">
          <Home size={24} />
          {t.returnHome}
        </button>
        {onReturn && (
          <button onClick={onReturn} className="flex items-center justify-center flex-1 gap-3 px-8 py-5 text-lg font-black transition-all border bg-white/10 border-white/20 rounded-3xl hover:bg-white/20 active:scale-95">
            <LayoutDashboard size={24} />
            {t.returnDash}
          </button>
        )}
      </div>
    </div>
  );
};

const CandidateDashboard: React.FC<{ jobs: Job[]; language: Language; onStart: StartSessionFn; onComplete: (s: InterviewSession) => void | Promise<void>; messages: ChatMessage[]; user?: User }> = ({ jobs, language, onStart, onComplete, messages, user }) => {
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeError, setCompleteError] = useState('');
  const [inviteInput, setInviteInput] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const navigate = useNavigate();
  const t = UI_STRINGS[language].candidate;

  const handleJoin = async () => {
    const cleanCode = inviteInput.includes('/i/') ? inviteInput.split('/i/').pop()?.split('/')[0]?.split('?')[0] || '' : inviteInput.trim();
    if (!cleanCode) {
      setJoinError(t.errorInvalid);
      return;
    }
    setJoinError('');
    setJoinLoading(true);
    try {
      const { job, session } = await onStart({ code: cleanCode, language });
      if (job.status !== 'Active') {
        setJoinError(t.errorInactive);
        return;
      }
      setActiveJob(job);
      setActiveSession(session);
    } catch (error: any) {
      setJoinError(error.message || t.errorInvalid);
    } finally {
      setJoinLoading(false);
    }
  };

  if (isDone && activeSession) return <SuccessScreen sessionId={activeSession.id} candidateId={activeSession.candidateId} language={language} onReturn={() => { setIsDone(false); setActiveSession(null); setActiveJob(null); }} />;
  if (isCompleting) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
      <Loader2 className="text-indigo-600 animate-spin" size={48} />
      <p className="font-bold text-slate-600 dark:text-slate-400">{t.savingEvaluation}</p>
    </div>
  );
  if (completeError) return (
    <div className="space-y-6">
      <div className="p-6 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-2xl">
        <p className="font-bold text-red-700 dark:text-red-400">{t.saveError}</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{completeError}</p>
        <button onClick={() => { setCompleteError(''); setActiveSession(null); setActiveJob(null); }} className="px-6 py-3 mt-4 font-bold bg-slate-200 dark:bg-slate-700 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600">{t.backToDashboard}</button>
      </div>
    </div>
  );
  if (activeJob && activeSession) return (
    <InterviewRoom
      job={activeJob}
      initialLanguage={language}
      onComplete={async (s) => {
        setCompleteError('');
        setIsCompleting(true);
        try {
          await onComplete(s);
          setIsDone(true);
        } catch (e) {
          setCompleteError((e as Error)?.message ?? 'Failed to save interview');
        } finally {
          setIsCompleting(false);
        }
      }}
      session={activeSession}
      messages={messages.filter(m => m.applicationId === activeSession.applicationId)}
      theme="light"
      toggleTheme={() => {}}
    />
  );

  return (
    <div className="space-y-8">
      <div className="bg-indigo-600 p-12 rounded-[3rem] text-white shadow-2xl shadow-indigo-100 relative overflow-hidden">
        <div className="relative z-10">
          <div>
            <h2 className="mb-4 text-4xl font-black tracking-tight">{t.welcome}</h2>
            <p className="mb-10 text-lg text-indigo-100 opacity-80">{t.dashDesc}</p>
          </div>
          {joinError && <p className="mb-2 text-sm font-bold text-red-400">{joinError}</p>}
          <div className="flex max-w-md gap-3">
            <input 
              type="text" 
              value={inviteInput} 
              onChange={e => { setInviteInput(e.target.value); setJoinError(''); }} 
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder={t.placeholder} 
              className="flex-1 px-6 py-5 font-bold text-white transition-all border outline-none bg-white/10 border-white/20 rounded-2xl placeholder:text-indigo-200 focus:bg-white/20" 
            />
            <button onClick={handleJoin} disabled={joinLoading} className="flex items-center justify-center px-10 py-5 font-black text-indigo-600 transition-all bg-white shadow-xl rounded-2xl hover:bg-indigo-50 active:scale-95 disabled:opacity-70">
              {joinLoading ? <Loader2 size={20} className="animate-spin" /> : t.enterRoom}
            </button>
          </div>
        </div>
      </div>
      <div className="space-y-6">
        <h3 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
           <BarChart2 className="text-indigo-600" />
           {t.recommended}
        </h3>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {jobs.filter(j => j.visibility === JobVisibility.PUBLIC && j.status === 'Active').map(job => (
            <div key={job.id} className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-xl transition-all group">
              <div>
                <h4 className="mb-1 text-2xl font-black text-slate-900 dark:text-white">{job.title}</h4>
                <p className="mb-8 text-xs font-black tracking-widest uppercase text-slate-500">{job.department}</p>
              </div>
              <button 
                onClick={() => navigate(`/apply/${job.id}`)} 
                className="flex items-center justify-center w-full gap-3 py-5 font-black text-white transition-all bg-slate-900 dark:bg-indigo-600 rounded-2xl hover:bg-indigo-600"
              >
                Apply Now <ArrowRight size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const JobList: React.FC<{ jobs: Job[], language: Language, onUpdate: (j: Job) => void, onDelete: (id: string) => void }> = ({ jobs, onDelete, onUpdate, language }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedShareId, setExpandedShareId] = useState<string | null>(null);
  const strings = UI_STRINGS[language];
  const t = strings.hr;
  
  const handleCopyLink = (job: Job, type: 'interview' | 'apply') => {
    const token = type === 'interview' ? job.shareToken! : job.id;
    const baseUrl = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin;
    const url = type === 'interview' ? `${baseUrl}/i/${token}` : `${baseUrl}/apply/${token}`;
    const text = buildCopyText(type, url, job.title, job.inviteCode || '', t);
    navigator.clipboard.writeText(text);
    setCopiedId(token + type);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStatusChange = (job: Job, newStatus: JobStatus) => {
    onUpdate({ ...job, status: newStatus });
  };

  const toggleShare = (id: string) => {
    setExpandedShareId(expandedShareId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">{t.recruitmentChannels}</h2>
      <div className="space-y-4">
        {jobs.map(job => (
          <div key={job.id} className="bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-4 sm:gap-6 hover:shadow-md transition-all">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex items-center justify-center w-12 h-12 text-white bg-indigo-600 shadow-lg rounded-2xl shrink-0">
                  <Briefcase size={24} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-white truncate">{job.title}</h3>
                  <p className="text-xs font-bold tracking-widest uppercase text-slate-400 truncate">{job.department} • {t.inviteCodeLabel}: <span className="text-indigo-600">{job.inviteCode}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button 
                  onClick={() => toggleShare(job.id)}
                  title={strings.common.share}
                  className={`p-2.5 sm:p-3 rounded-xl transition-all border flex items-center gap-1.5 font-black uppercase text-[10px] ${
                    expandedShareId === job.id 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-600'
                  }`}
                >
                  <Share2 size={16} />
                  <span className="hidden sm:inline">{strings.common.share}</span>
                </button>
                <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
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
                      className={`p-2 rounded-lg transition-all ${
                        job.status === s 
                          ? 'bg-white dark:bg-slate-700 shadow-sm ' + color 
                          : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                    >
                      <Icon size={16} />
                    </button>
                  ))}
                </div>
                <button onClick={() => onDelete(job.id)} className="p-2.5 sm:p-3 text-red-500 transition-all hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl border border-transparent hover:border-red-100 dark:hover:border-red-900/30"><Trash2 size={16} /></button>
              </div>
            </div>
            
            {expandedShareId === job.id && (
              <div className="grid grid-cols-1 gap-4 duration-300 md:grid-cols-2 animate-in slide-in-from-top-2">
                <div className="p-5 space-y-3 border bg-slate-50 dark:bg-slate-800 rounded-2xl border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.formLink}</p>
                  <div className="flex gap-2">
                     <input type="text" readOnly value={`${import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin}/apply/${job.id}`} className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-[10px] font-mono outline-none text-slate-600 dark:text-slate-300" />
                     <button onClick={() => handleCopyLink(job, 'apply')} className={`p-3 rounded-xl transition-all ${copiedId === job.id + 'apply' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-600'}`}>{copiedId === job.id + 'apply' ? <Check size={18}/> : <Copy size={18}/>}</button>
                  </div>
                </div>
                <div className="p-5 space-y-3 border border-indigo-100 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl dark:border-indigo-900">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t.liveRoom}</p>
                  <div className="flex gap-2">
                     <input type="text" readOnly value={`${import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin}/i/${job.shareToken}`} className="flex-1 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900 rounded-xl px-4 py-2.5 text-[10px] font-mono outline-none text-slate-600 dark:text-slate-300" />
                     <button onClick={() => handleCopyLink(job, 'interview')} className={`p-3 rounded-xl transition-all ${copiedId === job.shareToken + 'interview' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 text-indigo-400 hover:text-indigo-600'}`}>{copiedId === job.shareToken + 'interview' ? <Check size={18}/> : <Video size={18}/>}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
