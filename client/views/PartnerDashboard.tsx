import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { Users, Link2, Copy, Check, Award, AlertTriangle, Loader2, Calendar, DollarSign, TrendingUp, PhoneCall } from 'lucide-react';
import * as partnerService from '../services/partnerService';

interface PartnerDashboardProps {
  language: Language;
}

const STRINGS = {
  [Language.UZ]: {
    title: "Hamkorlik Dasturi",
    desc: "HR LODEX oilasiga qo'shiling va do'stlaringizni taklif qilib pul ishlang!",
    notActiveTitle: "Hamkorlik dasturi faol emas",
    notActiveDesc: "Tizimni faollashtiring va o'zingizning unikal referal havolangizni oling. Taklif qilgan a'zolaringiz soni haqida to'liq hisobotni kuzatib boring.",
    activateBtn: "Hamkorlikni faollashtirish",
    linkTitle: "Sizning taklif havolangiz",
    copyBtn: "Nusxalash",
    copied: "Nusxalandi!",
    statsTitle: "Sizning statistikaingiz",
    totalReferrals: "Taklif qilingan a'zolar",
    totalSpent: "Referallar sarflagan",
    totalEarnings: "Sizning daromadingiz (50%)",
    referralsListTitle: "Taklif qilingan a'zolar ro'yxati",
    emptyReferrals: "Hozircha hech kim ro'yxatdan o'tmagan.",
    tableName: "Ism familiya",
    tableEmail: "Elektron pochta",
    tableDate: "Ro'yxatdan o'tgan sana",
    tableStatus: "Holati",
    tableSpent: "Sarflagan miqdori",
    statusActive: "Faol",
    statusPending: "Kutilmoqda",
    loading: "Yuklanmoqda...",
    errorTitle: "Xatolik yuz berdi",
    cardDesc: "Havolangiz orqali kimdir ro'yxatdan o'tsa, u sizning taklif etilgan a'zolaringiz safiga qo'shiladi.",
    withdrawTitle: "Daromadni yechib olish",
    withdrawDesc: "Yig'ilgan daromadingizni yechib olish uchun admin bilan bog'laning. Admin sizning daromadingizni tekshirib, to'lovni amalga oshiradi.",
    withdrawNote: "Eslatma: ko'rsatilgan daromad — referallaringizning tasdiqlangan to'lovlaridan hisoblangan umumiy miqdorning 50% i. Bu brutto daromad hisoblanadi.",
    contactAdmin: "Admin bilan bog'lanish",
    currency: "so'm",
  },
  [Language.RU]: {
    title: "Партнерская Программа",
    desc: "Присоединяйтесь к семье HR LODEX и зарабатывайте, приглашая друзей!",
    notActiveTitle: "Партнерская программа не активна",
    notActiveDesc: "Активируйте систему и получите свою уникальную реферальную ссылку. Следите за количеством приглашенных вами пользователей.",
    activateBtn: "Активировать партнерство",
    linkTitle: "Ваша реферальная ссылка",
    copyBtn: "Копировать",
    copied: "Скопировано!",
    statsTitle: "Ваша статистика",
    totalReferrals: "Приглашенные пользователи",
    totalSpent: "Потрачено рефералами",
    totalEarnings: "Ваш доход (50%)",
    referralsListTitle: "Список приглашенных",
    emptyReferrals: "Пока никто не зарегистрировался.",
    tableName: "Имя и фамилия",
    tableEmail: "Электронная почта",
    tableDate: "Дата регистрации",
    tableStatus: "Статус",
    tableSpent: "Потрачено",
    statusActive: "Активный",
    statusPending: "В ожидании",
    loading: "Загрузка...",
    errorTitle: "Произошла ошибка",
    cardDesc: "Когда кто-то регистрируется по вашей ссылке, он добавляется в список ваших рефералов.",
    withdrawTitle: "Вывод заработка",
    withdrawDesc: "Для вывода накопленного дохода обратитесь к администратору. Администратор проверит ваш доход и произведёт выплату.",
    withdrawNote: "Примечание: показанный доход — это 50% от суммы подтверждённых платежей ваших рефералов (валовой доход).",
    contactAdmin: "Связаться с администратором",
    currency: "сум",
  },
  [Language.EN]: {
    title: "Affiliate Program",
    desc: "Join the HR LODEX family and earn by inviting your friends!",
    notActiveTitle: "Affiliate Program is inactive",
    notActiveDesc: "Activate the system and get your unique referral link. Keep track of the number of users you invite.",
    activateBtn: "Activate Partnership",
    linkTitle: "Your referral link",
    copyBtn: "Copy",
    copied: "Copied!",
    statsTitle: "Your Statistics",
    totalReferrals: "Invited Referrals",
    totalSpent: "Spent by Referrals",
    totalEarnings: "Your Earnings (50%)",
    referralsListTitle: "Invited Referrals List",
    emptyReferrals: "No one has registered yet.",
    tableName: "Full Name",
    tableEmail: "Email Address",
    tableDate: "Registration Date",
    tableStatus: "Status",
    tableSpent: "Amount Spent",
    statusActive: "Active",
    statusPending: "Pending",
    loading: "Loading...",
    errorTitle: "An error occurred",
    cardDesc: "When someone registers through your link, they are added to your referrals list.",
    withdrawTitle: "Withdraw Earnings",
    withdrawDesc: "To withdraw your accumulated earnings, contact the admin. The admin will verify your earnings and process the payment.",
    withdrawNote: "Note: the earnings shown are 50% of the total approved payments made by your referrals (gross earnings).",
    contactAdmin: "Contact Admin",
    currency: "UZS",
  }
};

const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ language }) => {
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<partnerService.PartnerStatsResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const t = STRINGS[language] || STRINGS[Language.UZ];

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await partnerService.getPartnerStats();
      setStats(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleActivate = async () => {
    try {
      setActivating(true);
      setError('');
      await partnerService.activatePartner();
      await fetchStats();
    } catch (err: any) {
      setError(err.message || 'Faollashtirishda xatolik');
    } finally {
      setActivating(false);
    }
  };

  const handleCopyLink = () => {
    if (!stats?.referralCode) return;
    const baseUrl = window.location.origin + window.location.pathname;
    const url = `${baseUrl}#/auth?ref=${stats.referralCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        <p className="font-bold text-slate-500 dark:text-slate-400">{t.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-3xl max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertTriangle size={24} />
          <h3 className="text-xl font-bold">{t.errorTitle}</h3>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">{error}</p>
        <button onClick={fetchStats} className="px-6 py-2.5 font-bold bg-slate-200 dark:bg-slate-700 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
          Qayta urinish
        </button>
      </div>
    );
  }

  // Hamkorlik dasturi hali faol bo'lmasa
  if (!stats || !stats.isPartner) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 p-12 md:p-16 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20 blur-2xl" />
          <div className="relative z-10 space-y-8 max-w-2xl">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <Award size={36} className="text-amber-300" />
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none">{t.title}</h1>
              <p className="text-lg md:text-xl text-indigo-100 opacity-90">{t.desc}</p>
            </div>
            <p className="text-sm md:text-base text-indigo-200">{t.notActiveDesc}</p>
            <button
              onClick={handleActivate}
              disabled={activating}
              className="px-8 py-4 bg-white text-indigo-600 hover:bg-indigo-50 font-black rounded-2xl transition-all shadow-xl active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-75"
            >
              {activating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users size={20} />}
              {t.activateBtn}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Hamkorlik dasturi faol bo'lsa
  const referralLink = `${window.location.origin}${window.location.pathname}#/auth?ref=${stats.referralCode}`;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">{t.title}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t.desc}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Referral link generator block */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 space-y-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Link2 size={20} />
              <h3 className="font-bold text-lg">{t.linkTitle}</h3>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">{t.cardDesc}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-mono outline-none text-slate-600 dark:text-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <button
              onClick={handleCopyLink}
              className={`px-6 py-4 font-black rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-100 dark:shadow-none'
              }`}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              <span>{copied ? t.copied : t.copyBtn}</span>
            </button>
          </div>
        </div>

        {/* Stats Summary Card */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-xl">
          <div className="space-y-2">
            <p className="text-[10px] uppercase font-black tracking-widest text-indigo-400">{t.statsTitle}</p>
            <h3 className="font-bold text-lg text-slate-300">{t.totalReferrals}</h3>
          </div>
          <div className="py-6 flex items-baseline gap-2">
            <span className="text-6xl font-black tracking-tight text-white">{stats.referralsCount}</span>
            <span className="text-indigo-400 font-bold text-sm">ta</span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Users size={14} className="text-indigo-400" />
            <span>Havolangiz orqali ro'yxatdan o'tganlar</span>
          </div>
        </div>
      </div>

      {/* Earnings Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <TrendingUp size={18} />
            <p className="text-xs font-black uppercase tracking-widest">{t.totalSpent}</p>
          </div>
          <p className="text-3xl font-black text-slate-800 dark:text-white">
            {(stats.totalSpent ?? 0).toLocaleString()} <span className="text-base font-bold text-slate-400">{t.currency}</span>
          </p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[2.5rem] p-8 shadow-xl space-y-4 text-white">
          <div className="flex items-center gap-2 text-emerald-100">
            <DollarSign size={18} />
            <p className="text-xs font-black uppercase tracking-widest">{t.totalEarnings}</p>
          </div>
          <p className="text-3xl font-black">
            {(stats.totalEarnings ?? 0).toLocaleString()} <span className="text-base font-bold text-emerald-200">{t.currency}</span>
          </p>
        </div>
      </div>

      {/* Referrals table list */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm space-y-6">
        <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="text-indigo-600" />
          {t.referralsListTitle}
        </h3>
        
        {stats.referrals.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500 font-medium">
            {t.emptyReferrals}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-4 px-4">{t.tableName}</th>
                  <th className="py-4 px-4">{t.tableEmail}</th>
                  <th className="py-4 px-4">{t.tableDate}</th>
                  <th className="py-4 px-4">{t.tableSpent}</th>
                  <th className="py-4 px-4">{t.tableStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {stats.referrals.map((referral, index) => (
                  <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-black text-xs uppercase">
                        {referral.fullName[0]}
                      </div>
                      {referral.fullName}
                    </td>
                    <td className="py-4 px-4 text-slate-500 dark:text-slate-400 text-sm font-medium">{referral.email}</td>
                    <td className="py-4 px-4 text-slate-400 dark:text-slate-500 text-xs font-bold">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        {new Date(referral.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm font-black text-slate-700 dark:text-slate-200">
                      {(referral.amountSpent ?? 0).toLocaleString()} <span className="text-xs font-bold text-slate-400">{t.currency}</span>
                    </td>
                    <td className="py-4 px-4 text-xs font-bold">
                      {referral.isEmailVerified ? (
                        <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                          {t.statusActive}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                          {t.statusPending}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Withdraw Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950 rounded-2xl flex items-center justify-center">
            <PhoneCall size={20} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">{t.withdrawTitle}</h3>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t.withdrawDesc}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 py-4 border border-slate-100 dark:border-slate-700">
          ⚠️ {t.withdrawNote}
        </p>
        <a
          href={import.meta.env.VITE_ADMIN_CONTACT_TG || 'https://t.me/mentor_lochinbek'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all active:scale-95 shadow-xl shadow-indigo-100 dark:shadow-none"
        >
          <PhoneCall size={18} />
          {t.contactAdmin}
        </a>
      </div>
    </div>
  );
};

export default PartnerDashboard;
