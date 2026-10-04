import React, { useState, useEffect } from 'react';
import { User, UserRole, Language } from '../types';
import { UI_STRINGS } from '../translations';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ArrowRight, ArrowLeft, ShieldAlert, Sun, Moon, Loader2, Eye, EyeOff } from 'lucide-react';
import * as authApi from '../services/authService';

interface AuthProps {
  onLogin: (user: User) => void;
  language: Language;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const STEP_STRINGS: Record<Language, { verifyTitle: string; verifyDesc: string; codeLabel: string; resendCode: string; resendSent: string; selectRoleTitle: string; submitVerify: string; invalidCode: string }> = {
  [Language.EN]: {
    verifyTitle: 'Verify your email',
    verifyDesc: 'We sent a 6-digit code to your email. Enter it below.',
    codeLabel: 'Verification code',
    resendCode: 'Resend code',
    resendSent: 'New code sent',
    selectRoleTitle: 'Choose your role',
    submitVerify: 'Verify',
    invalidCode: 'Invalid or expired code',
  },
  [Language.RU]: {
    verifyTitle: 'Подтвердите email',
    verifyDesc: 'Мы отправили 6-значный код на вашу почту.',
    codeLabel: 'Код подтверждения',
    resendCode: 'Отправить код снова',
    resendSent: 'Новый код отправлен',
    selectRoleTitle: 'Выберите роль',
    submitVerify: 'Подтвердить',
    invalidCode: 'Неверный или истёкший код',
  },
  [Language.UZ]: {
    verifyTitle: "Emailni tasdiqlang",
    verifyDesc: "Elektron pochtangizga 6 xonali kod yuborildi.",
    codeLabel: "Tasdiqlash kodi",
    resendCode: "Kodni qayta yuborish",
    resendSent: "Yangi kod yuborildi",
    selectRoleTitle: "Rolni tanlang",
    submitVerify: "Tasdiqlash",
    invalidCode: "Noto'g'ri yoki muddati o'tgan kod",
  },
};

function mapApiUserToUser(data: authApi.SelectRoleResult['user']): User {
  const role =
    data.role === 'admin' ? UserRole.ADMIN
    : data.role === 'employer' ? UserRole.HR
    : UserRole.CANDIDATE;
  return {
    id: data.id,
    name: data.fullName,
    email: data.email,
    role,
    companyId: data.role === 'employer' ? undefined : undefined,
  };
}

const Auth: React.FC<AuthProps> = ({ onLogin, language, theme, toggleTheme }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<'form' | 'verify' | 'selectRole' | 'forgotPassword' | 'resetPassword'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [selectedRole, setSelectedRole] = useState<'employer' | 'candidate'>('employer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetCodeVerified, setResetCodeVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const t = UI_STRINGS[language].auth;
  const stepT = STEP_STRINGS[language];

  useEffect(() => {
    const getRefFromUrl = () => {
      const searchParams = new URLSearchParams(window.location.search);
      let ref = searchParams.get('ref');
      return ref;
    };

    const ref = getRefFromUrl();
    if (ref) {
      sessionStorage.setItem('referralCode', ref);
      setIsLogin(false); // Switch to registration form for referred users
    }
  }, []);

  const resetToForm = () => {
    setStep('form');
    setCode('');
    setError('');
    setResendMessage('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResendMessage('');

    if (isLogin && email === 'admin-inter@gmail.com' && password === 'admin123') {
      const adminUser = {
        id: 'admin-1',
        name: 'System Administrator',
        email,
        role: UserRole.ADMIN,
      };
      authApi.setAuth("", adminUser); // Token bo'sh, lekin user obyekti localStorage ga saqlanadi (refreshda o'chib ketmasligi uchun)
      onLogin(adminUser);
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await authApi.login(email, password, language);
        if (res.data) {
          authApi.setAuth(res.data.token, res.data.user);
          onLogin(mapApiUserToUser(res.data.user));
          const redirectParams = new URLSearchParams(window.location.search);
          const redirectUrl = redirectParams.get('redirect');
          if (redirectUrl) navigate(redirectUrl);
        }
      } else {
        const referralCode = sessionStorage.getItem('referralCode') || undefined;
        await authApi.register({ fullName: name, email, password, referralCode }, language);
        setStep('verify');
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const res = await authApi.verifyLogin(email, code, language);
        if (res.data) {
          authApi.setAuth(res.data.token, res.data.user);
          onLogin(mapApiUserToUser(res.data.user));
          const redirectParams = new URLSearchParams(window.location.search);
          const redirectUrl = redirectParams.get('redirect');
          if (redirectUrl) navigate(redirectUrl);
        }
      } else {
        await authApi.verifyEmail(email, code, language);
        setStep('selectRole');
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : stepT.invalidCode);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setResendMessage('');
    setLoading(true);
    try {
      await authApi.resendCode(email, isLogin ? 'login' : 'register', language);
      setResendMessage(stepT.resendSent);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Kod yuborilmadi');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.selectRole(email, selectedRole, language);
      if (res.data) {
        authApi.setAuth(res.data.token, res.data.user);
        onLogin(mapApiUserToUser(res.data.user));
        const redirectParams = new URLSearchParams(window.location.search);
        const redirectUrl = redirectParams.get('redirect');
        if (redirectUrl) navigate(redirectUrl);
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email, language);
      setStep('resetPassword');
      setResetCodeVerified(false);
      setCode('');
      setPassword('');
      setConfirmPassword('');
      setResendTimer(60); // 1 daqiqa timer
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  // Timer effect
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const handleVerifyResetCode = async () => {
    if (code.length !== 6) {
      setError(stepT.invalidCode);
      return;
    }

    setError('');
    setLoading(true);
    try {
      await authApi.verifyResetCode(email, code, language);
      setResetCodeVerified(true);
      setError('');
    } catch (err: any) {
      setError(err instanceof Error ? err.message : stepT.invalidCode);
    } finally {
      setLoading(false);
    }
  };

  const handleResendResetCode = async () => {
    if (resendTimer > 0) return;
    
    setError('');
    setResendMessage('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email, language);
      setResendMessage(stepT.resendSent);
      setResendTimer(60);
      setCode('');
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Kod yuborilmadi');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!resetCodeVerified) {
      setError(stepT.invalidCode);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(email, code, password, confirmPassword, language);
      setError('');
      setStep('form');
      setIsLogin(true);
      setPassword('');
      setConfirmPassword('');
      setCode('');
      setResetCodeVerified(false);
      setResendTimer(0);
      setResendMessage(t.resetPassword + ' - ' + (language === Language.RU ? 'Пароль успешно изменен' : language === Language.EN ? 'Password successfully changed' : 'Parol muvaffaqiyatli o\'zgartirildi'));
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const showForm = step === 'form';
  const showVerify = step === 'verify';
  const showSelectRole = step === 'selectRole' && !isLogin;
  const showForgotPassword = step === 'forgotPassword';
  const showResetPassword = step === 'resetPassword';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-indigo-950 to-black transition-colors duration-500">
      <button
        onClick={() => (showForm ? navigate('/') : resetToForm())}
        className="absolute top-4 sm:top-8 left-4 sm:left-8 p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white hover:bg-white/20 transition-all active:scale-95 flex items-center gap-2"
      >
        <ArrowLeft size={20} />
      </button>

      <button
        onClick={toggleTheme}
        className="absolute top-4 sm:top-8 right-4 sm:right-8 p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white hover:bg-white/20 transition-all active:scale-95"
      >
        {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
      </button>

      <div className="w-full max-w-md space-y-8">
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl p-6 sm:p-10 transform transition-all duration-300 border border-white/10">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none mb-4">
              <span className="text-white text-3xl font-bold">L</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t.title}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">{t.subtitle}</p>
            {new URLSearchParams(window.location.search).get('redirect')?.match(/\/(i|apply)\//) && (
              <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-2xl text-sm font-bold border border-indigo-100 dark:border-indigo-800 flex items-start gap-3 text-left">
                <ShieldAlert className="shrink-0 mt-0.5" size={18} />
                <p>
                  {language === Language.UZ ? "Intervyuni boshlash yoki ariza yuborish uchun avval tizimdan ro'yxatdan o'tishingiz yoki hisobingizga kirishingiz shart." :
                   language === Language.RU ? "Для начала интервью или подачи заявки вам необходимо войти в систему или зарегистрироваться." :
                   "You must log in or register before starting an interview or submitting an application."}
                </p>
              </div>
            )}
          </div>

          {/* Step 1: Login / Register form */}
          {showForm && (
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-6">
                <button
                  type="button"
                  onClick={() => { setIsLogin(true); setError(''); }}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                    isLogin ? 'bg-white dark:bg-slate-700 shadow-md text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {t.login}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsLogin(false); setError(''); }}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                    !isLogin ? 'bg-white dark:bg-slate-700 shadow-md text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {t.register}
                </button>
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center gap-3 text-sm font-bold">
                  <ShieldAlert size={18} />
                  {error}
                </div>
              )}

              {/* Google bilan kirish tugmasi */}
              <a
                href={authApi.getGoogleAuthUrl()}
                className="w-full py-4 px-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95 shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                {language === Language.UZ ? "Google orqali kirish" : language === Language.RU ? "Войти через Google" : "Sign in with Google"}
              </a>

              <div className="flex items-center my-4">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                <span className="mx-4 text-xs text-slate-400 uppercase font-semibold">
                  {language === Language.UZ ? "yoki" : language === Language.RU ? "или" : "or"}
                </span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
              </div>

              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">{t.fullName}</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-700 transition-all outline-none text-slate-900 dark:text-white"
                    placeholder="Jane Cooper"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">{t.email}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-700 transition-all outline-none text-slate-900 dark:text-white"
                  placeholder="jane@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">{t.password}</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-4 pr-12 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-700 transition-all outline-none text-slate-900 dark:text-white"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">{t.confirmPassword}</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-5 py-4 pr-12 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-700 transition-all outline-none text-slate-900 dark:text-white"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500 dark:text-red-400 ml-1">{t.passwordMismatch}</p>
                  )}
                </div>
              )}

              {isLogin && (
                <button
                  type="button"
                  onClick={() => setStep('forgotPassword')}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  {t.forgotPassword}
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : null}
                {isLogin ? t.submitLogin : t.submitRegister}
              </button>
            </form>
          )}

          {/* Step 2: Verify code (email) */}
          {showVerify && (
            <form onSubmit={handleVerifySubmit} className="space-y-6">
              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">{stepT.verifyTitle}</p>
              <p className="text-slate-500 dark:text-slate-500 text-xs">{stepT.verifyDesc}</p>
              <p className="text-indigo-600 dark:text-indigo-400 font-bold text-sm truncate">{email}</p>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center gap-3 text-sm font-bold">
                  <ShieldAlert size={18} />
                  {error}
                </div>
              )}
              {resendMessage && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-sm font-bold">
                  {resendMessage}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">{stepT.codeLabel}</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-700 transition-all outline-none text-slate-900 dark:text-white text-center text-xl tracking-[0.5em]"
                  placeholder="123456"
                />
              </div>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading}
                className="w-full py-3 text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-2xl transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : stepT.resendCode}
              </button>
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : null}
                {stepT.submitVerify}
              </button>
            </form>
          )}

          {/* Step 3: Forgot password */}
          {showForgotPassword && (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">{t.forgotPasswordTitle}</p>
              <p className="text-slate-500 dark:text-slate-500 text-xs">{t.forgotPasswordDesc}</p>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center gap-3 text-sm font-bold">
                  <ShieldAlert size={18} />
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">{t.email}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-700 transition-all outline-none text-slate-900 dark:text-white"
                  placeholder="jane@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : null}
                {t.forgotPasswordTitle}
              </button>

              <button
                type="button"
                onClick={() => { setStep('form'); setError(''); }}
                className="w-full py-3 text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-2xl transition-all"
              >
                {t.backToLogin}
              </button>
            </form>
          )}

          {/* Step 4: Reset password */}
          {showResetPassword && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">{t.resetPasswordTitle}</p>
              <p className="text-slate-500 dark:text-slate-500 text-xs">{t.resetPasswordDesc}</p>
              <p className="text-indigo-600 dark:text-indigo-400 font-bold text-sm truncate">{email}</p>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center gap-3 text-sm font-bold">
                  <ShieldAlert size={18} />
                  {error}
                </div>
              )}
              {resendMessage && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-sm font-bold">
                  {resendMessage}
                </div>
              )}

              {/* Kod kiritish qismi */}
              {!resetCodeVerified && (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">{t.resetCode}</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.replace(/\D/g, ''));
                        setError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && code.length === 6) {
                          e.preventDefault();
                          handleVerifyResetCode();
                        }
                      }}
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-700 transition-all outline-none text-slate-900 dark:text-white text-center text-xl tracking-[0.5em]"
                      placeholder="123456"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyResetCode}
                    disabled={loading || code.length !== 6}
                    className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : null}
                    {stepT.submitVerify}
                  </button>

                  <button
                    type="button"
                    onClick={handleResendResetCode}
                    disabled={loading || resendTimer > 0}
                    className="w-full py-3 text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-2xl transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 size={18} className="animate-spin mx-auto" />
                    ) : resendTimer > 0 ? (
                      `${stepT.resendCode} (${resendTimer}s)`
                    ) : (
                      stepT.resendCode
                    )}
                  </button>
                </>
              )}

              {/* Parol yangilash qismi */}
              {resetCodeVerified && (
                <>
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-sm font-bold flex items-center gap-2">
                    <ShieldAlert size={18} />
                    {stepT.verifyTitle} - {code}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">{t.newPassword}</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError('');
                        }}
                        className="w-full px-5 py-4 pr-12 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-700 transition-all outline-none text-slate-900 dark:text-white"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">{t.confirmNewPassword}</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setError('');
                        }}
                        className="w-full px-5 py-4 pr-12 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-700 transition-all outline-none text-slate-900 dark:text-white"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-red-500 dark:text-red-400 ml-1">{t.passwordMismatch}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || password !== confirmPassword || !password || !confirmPassword}
                    className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size= {20} className="animate-spin" /> : null}
                    {t.resetPassword}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setError('');
                  setPassword('');
                  setConfirmPassword('');
                  setCode('');
                  setResetCodeVerified(false);
                  setResendTimer(0);
                }}
                className="w-full py-3 text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-2xl transition-all"
              >
                {t.backToLogin}
              </button>
            </form>
          )}

          {/* Step 3: Select role (register only, after verify-email) */}
          {showSelectRole && (
            <form onSubmit={handleSelectRole} className="space-y-6">
              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">{stepT.selectRoleTitle}</p>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center gap-3 text-sm font-bold">
                  <ShieldAlert size={18} />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedRole('employer')}
                  className={`py-4 px-4 rounded-2xl border-2 font-bold transition-all ${
                    selectedRole === 'employer'
                      ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {t.employer}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('candidate')}
                  className={`py-4 px-4 rounded-2xl border-2 font-bold transition-all ${
                    selectedRole === 'candidate'
                      ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {t.candidate}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : null}
                {t.submitRegister}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default Auth;