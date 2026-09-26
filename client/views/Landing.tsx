
import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight,
  Video,
  Cpu,
  ShieldCheck,
  Globe,
  BarChart2,
  MessageSquare,
  Sparkles,
  Search,
  Users,
  CheckCircle2,
  FileSearch,
  Languages,
  LayoutDashboard,
  Zap,
  Target,
  FileText,
  Lock,
  Mail,
  Scale,
  PlusCircle,
  ListOrdered,
  LogIn,
  Sun,
  Moon,
  Menu,
  Briefcase
} from 'lucide-react';
import { Language, User, UserRole } from '../types';
import { UI_STRINGS } from '../translations';
interface LandingProps {
  user: User | null;
  language: Language;
  setLanguage: (l: Language) => void;
  onVisit: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}



import { useMeta } from '../utils/useMeta';

const Landing: React.FC<LandingProps> = ({ user, language, setLanguage, onVisit, theme, toggleTheme }) => {
  const navigate = useNavigate();
  const t = UI_STRINGS[language].landing;

  const metaTitles: Record<string, string> = {
    uz: "HR LODEX — Sun'iy Intellekt bilan Intervyu Platformasi | O'zbekiston",
    ru: "HR LODEX — AI Платформа для Интервью и Подбора Персонала | Узбекистан",
    en: "HR LODEX — AI-Powered Interview & Recruitment Platform | Uzbekistan",
  };
  const metaDescs: Record<string, string> = {
    uz: "HR LODEX — O'zbekistondagi yetakchi AI HR platformasi. Sun'iy intellekt yordamida video va matnli intervyular o'tkazing, rezyumeni avtomatik tahlil qiling.",
    ru: "HR LODEX — ведущая AI HR платформа в Узбекистане. Проводите видео и текстовые интервью с помощью ИИ, автоматически анализируйте резюме и находите лучших кандидатов.",
    en: "HR LODEX — Uzbekistan's leading AI HR platform. Run AI-powered video and text interviews, auto-analyze resumes, and find the best candidates.",
  };
  const lang = language === 'ru' ? 'ru' : language === 'en' ? 'en' : 'uz';
  useMeta(metaTitles[lang], metaDescs[lang]);

  useEffect(() => {
    onVisit();
  }, []);

  const handleEmployerCTA = () => {
    if (user) {
      if (user.role === UserRole.ADMIN) navigate('/admin-dashboard');
      else if (user.role === UserRole.HR) navigate('/hr-dashboard');
      else navigate('/candidate-dashboard');
    } else {
      navigate('/auth');
    }
  };

  const handleCandidateCTA = () => {
    if (user) {
      navigate('/candidate-dashboard');
    } else {
      navigate('/auth?redirect=/candidate-dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white selection:bg-indigo-100 selection:dark:bg-indigo-900 overflow-x-hidden transition-colors duration-300">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 z-50 h-16 md:h-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 dark:shadow-none">
              <span className="text-white font-black text-lg md:text-xl">L</span>
            </div>
            <span className="text-lg md:text-2xl font-black tracking-tight">HR LODEX</span>
          </div>

          <div className="flex items-center gap-2 md:gap-6">
            <div className="hidden sm:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {[Language.RU, Language.EN, Language.UZ].map(l => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${language === l ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 md:p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              onClick={() => navigate(user ? '/partner-dashboard' : '/auth?redirect=/partner-dashboard')}
              className="hidden sm:flex items-center gap-2 px-3 md:px-4 py-2 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <Users size={16} /> {language === Language.RU ? 'Стать партнером' : language === Language.EN ? 'Become Partner' : 'Hamkor bo\'lish'}
            </button>
            <Link
              to="/jobs"
              className="hidden sm:flex items-center gap-2 px-3 md:px-4 py-2 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              <Briefcase size={16} /> {UI_STRINGS[language].jobs.title}
            </Link>
            <div className="flex items-center gap-1 md:gap-3">
              {user ? (
                <button
                  onClick={handleEmployerCTA}
                  className="px-3 md:px-4 py-1.5 md:py-2 bg-indigo-600 text-white rounded-md md:rounded-lg font-bold text-[11px] md:text-xs shadow-md hover:bg-indigo-700 transition-all flex items-center gap-1.5"
                >
                  <LayoutDashboard size={12} className="shrink-0" />
                  <span className="hidden sm:inline">{t.goToDashboard}</span>
                  <span className="sm:hidden">Dash</span>
                </button>
              ) : (
                <button
                  onClick={() => navigate('/auth')}
                  className="px-3 md:px-4 py-1.5 md:py-2 bg-indigo-600 text-white rounded-md md:rounded-lg font-bold text-[11px] md:text-xs shadow-md hover:bg-indigo-700 transition-all flex items-center gap-1.5"
                >
                  <LogIn size={12} className="shrink-0" />
                  <span>{t.login}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 md:pt-44 pb-20 md:pb-32 px-4 md:px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 rounded-full text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-6 md:mb-10 animate-in fade-in slide-in-from-bottom-2">
            <Sparkles size={14} /> AI-Powered Recruitment Platform
          </div>
          <h1 className="text-4xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.95] mb-6 md:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {t.heroTitle}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base sm:text-2xl font-medium max-w-3xl mx-auto leading-relaxed mb-10 md:mb-12">
            {t.heroSub}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleEmployerCTA}
              className="w-full sm:w-auto px-8 md:px-10 py-4 md:py-5 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl md:rounded-[1.5rem] font-black text-base md:text-lg hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 shadow-xl group"
            >
              {t.forEmployers} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={handleCandidateCTA}
              className="w-full sm:w-auto px-8 md:px-10 py-4 md:py-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl md:rounded-[1.5rem] font-black text-base md:text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-md"
            >
              <Video size={20} className="text-indigo-600 dark:text-indigo-400" /> {t.startInterview}
            </button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-24 px-4 md:px-6 bg-slate-50 dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-20">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">{t.howItWorksTitle}</h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">{t.howItWorksSub}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {[
              { title: t.step1, desc: t.step1Desc, icon: PlusCircle },
              { title: t.step2, desc: t.step2Desc, icon: Globe },
              { title: t.step3, desc: t.step3Desc, icon: Cpu },
              { title: t.step4, desc: t.step4Desc, icon: CheckCircle2 }
            ].map((step, i) => (
              <div key={i} className="relative p-6 md:p-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-4">
                  <step.icon size={24} />
                </div>
                <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">{step.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features Grid */}
      <section className="py-20 md:py-32 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 md:mb-24">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">{t.featuresTitle}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[
              { title: t.f1, desc: t.f1Desc, icon: Video, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
              { title: t.f2, desc: t.f2Desc, icon: Target, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              { title: t.f3, desc: t.f3Desc, icon: FileSearch, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
              { title: t.f4, desc: t.f4Desc, icon: Languages, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
              { title: t.f5, desc: t.f5Desc, icon: ListOrdered, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { title: t.f6, desc: t.f6Desc, icon: Lock, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-900/20' }
            ].map((f, i) => (
              <div key={i} className="p-8 md:p-10 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-all group">
                <div className={`w-12 h-12 md:w-14 md:h-14 ${f.bg} ${f.color} rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-transform`}>
                  <f.icon size={28} />
                </div>
                <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Employers Section */}
      <section className="py-20 md:py-24 px-4 md:px-6 bg-slate-950 dark:bg-black text-white rounded-[3rem] md:rounded-[5rem] mx-2 md:mx-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 md:w-[500px] h-64 md:h-[500px] bg-indigo-600/10 blur-[120px] rounded-full -mr-32 -mt-32" />
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 md:gap-20">
          <div className="lg:w-1/2 space-y-8 md:space-y-10 text-center lg:text-left">
            <div className="space-y-4">
              <h2 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none">{t.employersTitle}</h2>
              <p className="text-indigo-400 font-bold uppercase text-[10px] tracking-[0.3em]">{t.employersSub}</p>
            </div>
            <ul className="space-y-4 md:space-y-6 inline-block text-left">
              {[t.empPoint1, t.empPoint2, t.empPoint3, t.empPoint4, t.empPoint5].map((point, i) => (
                <li key={i} className="flex items-center gap-4 text-slate-300">
                  <CheckCircle2 className="text-indigo-400 shrink-0" size={24} />
                  <span className="text-base md:text-lg font-medium">{point}</span>
                </li>
              ))}
            </ul>
            <div className="pt-4">
              <button
                onClick={handleEmployerCTA}
                className="w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl hover:bg-indigo-700 transition-all shadow-2xl active:scale-95"
              >
                {t.empBtn}
              </button>
            </div>
          </div>
          <div className="lg:w-1/2 w-full relative bg-white/5 border border-white/10 p-2 md:p-4 rounded-[2rem] md:rounded-[3rem] backdrop-blur-sm">
            <div className="bg-slate-900 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-xs">LODEX</div>
                  <p className="font-bold text-sm md:text-base">HR LODEX Dashboard</p>
                </div>
                <BarChart2 size={20} className="text-slate-500" />
              </div>
              <div className="space-y-3">
                {[88, 72, 95].map((score, i) => (
                  <div key={i} className="p-4 bg-white/5 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700" />
                      <div className="h-2 w-16 md:w-24 bg-slate-800 rounded-full" />
                    </div>
                    <span className="text-emerald-400 font-black text-[10px] md:text-xs">{score}% Match</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 md:py-24 px-4 md:px-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 mt-12 md:mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-sm">L</span>
              </div>
              <span className="text-xl font-black tracking-tight dark:text-white">HR LODEX</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs leading-relaxed font-medium">
              {t.footerDesc}
            </p>
            <div className="pt-4 flex flex-col gap-2 text-sm font-bold text-slate-400 dark:text-slate-500">
              <div className="flex items-center gap-2">
                <Mail size={16} /> <a href="mailto:lodexgroups@gmail.com">lodexgroups@gmail.com</a>
              </div>
              <p>AI Hiring Platform © 2026</p>
              <p>Ba'zan keraksizdek ko'ringan insonlar noan'anaviy ishlarni amalga oshiradi.</p>

            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 md:gap-12 w-full md:w-auto">
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform</p>
              <ul className="space-y-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                <li><button onClick={handleEmployerCTA} className="hover:text-indigo-600">Employers</button></li>
                <li><button onClick={handleCandidateCTA} className="hover:text-indigo-600">Candidates</button></li>
                <li><a href="#" className="hover:text-indigo-600">Enterprise</a></li>
                <li><a href="#" className="hover:text-indigo-600">Pricing</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Support</p>
              <ul className="space-y-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                <li><a href="#" className="hover:text-indigo-600">Privacy</a></li>
                <li><a href="#" className="hover:text-indigo-600">Terms</a></li>
                <li><a href="#" className="hover:text-indigo-600">API Docs</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Language</p>
              <div className="flex flex-col gap-2">
                {[Language.RU, Language.EN, Language.UZ].map(l => (
                  <button key={l} onClick={() => setLanguage(l)} className={`text-sm font-bold text-left ${language === l ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>
                    {l === Language.RU ? '🇷🇺 RU' : l === Language.EN ? '🇺🇸 EN' : '🇺🇿 UZ'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
