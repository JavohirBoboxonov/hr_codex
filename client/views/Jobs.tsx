import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Briefcase,
  ArrowRight,
  Loader2,
  Sun,
  Moon,
  MapPin,
  Clock,
  BarChart2,
  Home,
} from 'lucide-react';
import { Job, Language } from '../types';
import { UI_STRINGS } from '../translations';
import * as publicService from '../services/publicService';

interface JobsProps {
  language: Language;
  setLanguage: (l: Language) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

import { useMeta } from '../utils/useMeta';

const Jobs: React.FC<JobsProps> = ({ language, setLanguage, theme, toggleTheme }) => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const strings = UI_STRINGS[language];
  const t = strings.jobs ?? {
    title: 'Ishlar',
    sub: "Ochiq vakansiyalar.",
    empty: "Vakansiyalar yo'q.",
    apply: "Ariza yuborish",
    department: "Bo'lim",
    experience: "Tajriba",
    deadline: "Muddat",
    backToHome: "Bosh sahifaga",
  };

  const metaTitles: Record<string, string> = {
    uz: "Ochiq Vakansiyalar — HR LODEX | O'zbekiston",
    ru: "Открытые Вакансии — HR LODEX | Узбекистан",
    en: "Open Job Listings — HR LODEX | Uzbekistan",
  };
  const metaDescs: Record<string, string> = {
    uz: "HR LODEX'dagi ochiq vakansiyalarni ko'ring. AI intervyu orqali ariza yuboring va ish toping.",
    ru: "Смотрите открытые вакансии на HR LODEX. Подайте заявку через AI-интервью и найдите работу в Узбекистане.",
    en: "Browse open job listings on HR LODEX. Apply via AI interview and find your next opportunity in Uzbekistan.",
  };
  const lang = language === 'ru' ? 'ru' : language === 'en' ? 'en' : 'uz';
  useMeta(metaTitles[lang], metaDescs[lang]);

  useEffect(() => {
    publicService.getPublicJobs().then(setJobs).catch(() => setJobs([])).finally(() => setLoading(false));
  }, []);

  // Inject JobPosting structured data for all public jobs
  useEffect(() => {
    if (jobs.length === 0) return;
    const existingScript = document.getElementById('job-posting-ld');
    if (existingScript) existingScript.remove();

    const schema = {
      '@context': 'https://schema.org',
      '@graph': jobs.map((job) => ({
        '@type': 'JobPosting',
        title: job.title,
        description: job.description || `${job.role} — ${job.department}`,
        hiringOrganization: {
          '@type': 'Organization',
          name: 'HR LODEX',
          sameAs: 'https://hrlodex.uz',
        },
        jobLocation: {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressCountry: 'UZ',
            addressLocality: job.department || 'Uzbekistan',
          },
        },
        employmentType: 'FULL_TIME',
        datePosted: job.createdAt ? new Date(job.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        ...(job.deadline ? { validThrough: new Date(job.deadline).toISOString().split('T')[0] } : {}),
        url: `https://hrlodex.uz/apply/${job.id}`,
      })),
    };
    const script = document.createElement('script');
    script.id = 'job-posting-ld';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      document.getElementById('job-posting-ld')?.remove();
    };
  }, [jobs]);

  const experienceLabel: Record<string, string> = {
    Junior: language === 'uz' ? 'Junior' : language === 'ru' ? 'Джуниор' : 'Junior',
    Mid: language === 'uz' ? 'O\'rta' : language === 'ru' ? 'Мидл' : 'Mid',
    Senior: language === 'uz' ? 'Senior' : language === 'ru' ? 'Сеньор' : 'Senior',
    Lead: language === 'uz' ? 'Lead' : language === 'ru' ? 'Лид' : 'Lead',
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
      <nav className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 z-50 h-16 md:h-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-lg md:text-xl">L</span>
            </div>
            <span className="text-lg md:text-2xl font-black tracking-tight">HR LODEX</span>
          </Link>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {(['ru', 'en', 'uz'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLanguage(l as Language)}
                  className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${
                    language === l ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button onClick={toggleTheme} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-all">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <Link
              to="/"
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              <Home size={16} /> <span className="hidden sm:inline">{t.backToHome}</span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-28 md:pt-36 pb-20 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">{t.title}</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">{t.sub}</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={48} />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-20 px-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
              <Briefcase className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={56} />
              <p className="text-slate-500 dark:text-slate-400 font-medium">{t.empty}</p>
              <Link to="/" className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all">
                <Home size={18} /> {t.backToHome}
              </Link>
            </div>
          ) : (
            <ul className="space-y-6">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="block p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl md:rounded-3xl shadow-sm hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:shadow-md transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-2">{job.title}</h2>
                      <p className="text-indigo-600 dark:text-indigo-400 font-bold text-sm mb-3">{job.role}</p>
                      <div className="flex flex-wrap gap-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        {job.department && (
                          <span className="flex items-center gap-1.5">
                            <MapPin size={12} /> {job.department}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <BarChart2 size={12} /> {experienceLabel[job.experienceLevel] ?? job.experienceLevel}
                        </span>
                        {job.deadline && (
                          <span className="flex items-center gap-1.5">
                            <Clock size={12} /> {new Date(job.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {job.description && (
                        <p className="mt-4 text-slate-600 dark:text-slate-300 text-sm leading-relaxed line-clamp-3">
                          {job.description}
                        </p>
                      )}
                      {job.requiredSkills?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {job.requiredSkills.slice(0, 5).map((s, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Link
                      to={`/apply/${job.id}`}
                      className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition-all"
                    >
                      {t.apply} <ArrowRight size={18} />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
};

export default Jobs;
