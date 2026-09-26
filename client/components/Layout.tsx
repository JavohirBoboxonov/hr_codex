
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, UserRole, Language } from '../types';
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  LogOut, 
  PlusCircle, 
  BarChart3,
  Languages,
  Home,
  ExternalLink,
  ShieldCheck,
  Sun,
  Moon,
  Menu,
  X,
  DollarSign,
  CreditCard,
  ShoppingCart,
  UserCircle,
  FileText
} from 'lucide-react';
import { UI_STRINGS } from '../translations';

interface LayoutProps {
  user: User | null;
  onLogout: () => void;
  language: Language;
  setLanguage: (l: Language) => void;
  children: React.ReactNode;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, language, setLanguage, children, theme, toggleTheme }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) return <>{children}</>;

  const strings = UI_STRINGS[language];
  const buyCreditsLabel = language === Language.RU
    ? 'Купить интервью'
    : language === Language.EN
      ? 'Buy Interviews'
      : 'Suhbatlar sotib olish';
  const themeLabel = language === Language.RU
    ? 'Тема'
    : language === Language.EN
      ? 'Theme'
      : 'Mavzu';
  const languageLabel = language === Language.RU
    ? 'Язык'
    : language === Language.EN
      ? 'Language'
      : 'Til';
  const switchToDarkLabel = language === Language.RU
    ? 'Переключить на тёмную тему'
    : language === Language.EN
      ? 'Switch to dark mode'
      : 'Tungi mavzuga o‘tish';
  const switchToLightLabel = language === Language.RU
    ? 'Переключить на светлую тему'
    : language === Language.EN
      ? 'Switch to light mode'
      : 'Kunduzgi mavzuga o‘tish';

  const partnerLabel = language === Language.RU
    ? 'Партнерство'
    : language === Language.EN
      ? 'Affiliate'
      : 'Hamkorlik';

  const hrLinks = [
    { name: strings.hr.dashboard, path: '/hr-dashboard', icon: LayoutDashboard },
    { name: strings.hr.myJobs, path: '/hr-jobs', icon: Briefcase },
    { name: strings.hr.createJob, path: '/create-job', icon: PlusCircle },
    { name: buyCreditsLabel, path: '/buy-credits', icon: ShoppingCart },
    { name: strings.hr.analytics, path: '/hr-analytics', icon: BarChart3 },
    { name: partnerLabel, path: '/partner-dashboard', icon: Users },
  ];

  const adminLinks = [
    { name: strings.admin.stats, path: '/admin-dashboard', icon: BarChart3 },
    { name: strings.admin.tariffsNav, path: '/admin-tariffs', icon: DollarSign },
    { name: strings.admin.paymentsNav, path: '/admin-payments', icon: CreditCard },
  ];

  const candidateLinks = [
    { name: strings.candidate.recommended, path: '/candidate-dashboard', icon: Briefcase },
    { name: strings.candidate.myApplications, path: '/my-applications', icon: FileText },
    { name: strings.candidate.profile, path: '/profile', icon: UserCircle },
    { name: partnerLabel, path: '/partner-dashboard', icon: Users },
  ];

  const links = user.role === UserRole.ADMIN ? adminLinks : (user.role === UserRole.HR ? hrLinks : candidateLinks);

  const SidebarContent = () => (
    <div className="p-6 md:p-8 flex flex-col h-full">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
            <span className="text-white font-bold text-xl">L</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">HR LODEX</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 text-slate-500">
          <X size={24} />
        </button>
      </div>

      <nav className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar pr-2">
        <button
          onClick={() => { navigate('/'); setIsMobileMenuOpen(false); }}
          className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white mb-4 border border-slate-100 dark:border-slate-800 group`}
        >
          <div className="flex items-center gap-3">
            <Home size={20} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-bold">{strings.common.backToHome}</span>
          </div>
          <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <button
              key={link.path}
              onClick={() => { navigate(link.path); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${
                isActive 
                  ? 'bg-indigo-600 text-white font-bold shadow-lg' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="text-sm">{link.name}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              <ShieldCheck size={14} />
              <span>{themeLabel}</span>
            </div>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleTheme();
              }}
              className="p-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
              aria-label={theme === 'light' ? switchToDarkLabel : switchToLightLabel}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
          
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pt-2 border-t border-slate-100 dark:border-slate-700">
            <Languages size={14} />
            <span>{languageLabel}</span>
          </div>
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {[Language.RU, Language.EN, Language.UZ].map(l => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-lg transition-all ${
                  language === l ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-500'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold text-lg">
              {user.name[0]}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{user.role}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all font-medium"
          >
            <LogOut size={20} />
            <span className="text-sm">{strings.common.logout}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col sticky top-0 h-screen transition-colors duration-300">
        <SidebarContent />
      </aside>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-80 bg-white dark:bg-slate-900 shadow-2xl animate-in slide-in-from-left duration-300">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">L</div>
            <span className="font-bold dark:text-white">HR LODEX</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-8 lg:p-12 overflow-y-auto overflow-x-hidden">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
