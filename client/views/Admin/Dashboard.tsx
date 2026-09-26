
import React, { useState } from 'react';
import { 
  Users, 
  Video, 
  UserPlus, 
  Globe, 
  Settings, 
  ShieldCheck, 
  Key, 
  Mail, 
  BarChart, 
  Activity, 
  Database, 
  Trash2,
  Lock,
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';
import { Language } from '../../types';
import { UI_STRINGS } from '../../translations';

interface AdminDashboardProps {
  hrCount: number;
  jobsCount: number;
  candidateCount: number;
  visitorCount: number;
  language: Language;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ hrCount, jobsCount, candidateCount, visitorCount, language }) => {
  const t = UI_STRINGS[language].admin;
  
  const [adminEmail, setAdminEmail] = useState('admin-inter@gmail.com');
  const [adminPass, setAdminPass] = useState('admin123');

  const stats = [
    { label: t.hrAccounts, val: hrCount, icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: t.totalInterviews, val: jobsCount, icon: Video, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { label: t.totalCandidates, val: candidateCount, icon: UserPlus, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: t.visitors, val: visitorCount, icon: Globe, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' }
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-500 transition-colors">
      <div>
        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">{t.title}</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">{t.platformSubtitle}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-5 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className={`w-12 h-12 ${s.bg} ${s.color} rounded-2xl flex items-center justify-center`}>
                <s.icon size={24} />
              </div>
              <div className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400 font-black text-xs">
                <TrendingUp size={14} />
                +12%
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-1">{s.val.toLocaleString()}</p>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Section */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
          <div className="flex items-center gap-3">
             <Settings className="text-indigo-600 dark:text-indigo-400" />
             <h3 className="text-xl font-black text-slate-900 dark:text-white">{t.settings}</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t.changeEmail}</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                <input 
                  type="email" 
                  value={adminEmail} 
                  onChange={e => setAdminEmail(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-700 transition-all"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t.changePass}</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                <input 
                  type="password" 
                  value={adminPass} 
                  onChange={e => setAdminPass(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-400 focus:bg-white dark:focus:bg-slate-700 transition-all"
                />
              </div>
            </div>
          </div>
          
          <div className="pt-4">
            <button className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none active:scale-95">
              {t.updateBtn}
            </button>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-slate-900 dark:bg-black p-5 sm:p-10 rounded-[2rem] sm:rounded-[3rem] text-white space-y-8 border border-white/5">
           <div className="flex items-center gap-3">
              <Activity className="text-indigo-400" />
              <h3 className="text-xl font-black">{t.systemLogs}</h3>
           </div>
           
           <div className="space-y-4">
              {[
                { msg: 'HR Account Created: tech-hire-uz', time: '2m ago' },
                { msg: 'Interview Session Started: INV-F2', time: '14m ago' },
                { msg: 'Admin Credentials Updated', time: '1h ago' },
                { msg: 'Database Backup Successful', time: '2h ago' }
              ].map((log, i) => (
                <div key={i} className="flex justify-between items-center py-4 border-b border-white/5">
                  <p className="text-sm font-medium text-slate-400">{log.msg}</p>
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{log.time}</span>
                </div>
              ))}
           </div>
           
           <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] space-y-4">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-slate-500">Node Cluster Load</span>
                <span className="text-indigo-400">Stable</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 w-1/3 rounded-full" />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
