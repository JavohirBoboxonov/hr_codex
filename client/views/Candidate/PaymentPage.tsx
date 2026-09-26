import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DollarSign, CreditCard, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Language, User } from '../../types';
import * as tariffsService from '../../services/tariffsService';
import * as paymentService from '../../services/paymentService';
import type { Tariff } from '../../types';

interface PaymentPageProps {
  language: Language;
  user: User;
  onPaymentSuccess?: () => void;
}

const PAYMENT_TEXTS = {
  [Language.UZ]: {
    title: "Suhbatlar sotib olish",
    subtitle: "Suhbatlar sotib oling",
    successTitle: "To'lov muvaffaqiyatli yuborildi!",
    successDefault: "Admin tekshirgandan keyin suhbatlar hisobingizga qo'shiladi.",
    checkClickStatus: "Click to'lov holati tekshirilmoqda...",
    noTariff: "Tarif tanlanishi shart",
    loadTariffsError: "Tariflarni yuklashda xatolik",
    clickCompleted: "Click to'lovi muvaffaqiyatli yakunlandi. Suhbatlar hisobingizga qo'shildi.",
    clickPending: "To'lov qabul qilindi va tekshirilmoqda. Bir necha soniyadan so'ng yangilanadi.",
    clickFailed: "Click to'lovi yakunlanmadi. Qaytadan urinib ko'ring.",
    clickStatusError: "Click to'lov holatini tekshirishda xatolik",
    clickStartError: "Click to'lov boshlanishida xatolik",
    paymeStartError: "Payme to'lov boshlanishida xatolik",
    tariffsTitle: "Mavjud tariflar",
    tariffsEmpty: "Hozircha tariflar mavjud emas",
    price: "Narx",
    interviews: "Suhbatlar",
    payTitle: "To'lov qilish",
    selectedTariff: "Tanlangan tarif:",
    paymentMethod: "To'lov usuli",
    clickInfo: "ℹ️ Click orqali xavfsiz to'lov. Kartangiz ma'lumotlari himoyalangan.",
    paymeInfo: "ℹ️ Payme orqali xavfsiz to'lov. To'lov Payme sahifasida amalga oshiriladi.",
    loading: "Yuklanmoqda...",
    payWithClick: "Click orqali to'lash",
    payWithPayme: "Payme orqali to'lash",
    chooseTariff: "Tarif tanlang",
    interviewsUnit: "suhbat",
    countUnit: "ta",
    currency: "so'm",
    oneTimeName: "Bir martalik suhbat",
    oneTimeDesc: "1 ta intervyu uchun to'lov (5 000 so'm)",
    monthlyName: "Oylik tarif",
    monthlyDesc: "Oyiga 50 000 so'm — 10 ta intervyu krediti",
  },
  [Language.RU]: {
    title: "Купить интервью",
    subtitle: "Приобретите интервью",
    successTitle: "Платеж успешно отправлен!",
    successDefault: "После проверки администратором интервью будут добавлены на ваш баланс.",
    checkClickStatus: "Проверяем статус оплаты Click...",
    noTariff: "Необходимо выбрать тариф",
    loadTariffsError: "Ошибка при загрузке тарифов",
    clickCompleted: "Оплата через Click успешно завершена. Интервью добавлены на ваш баланс.",
    clickPending: "Платеж принят и обрабатывается. Статус обновится через несколько секунд.",
    clickFailed: "Оплата через Click не завершена. Попробуйте снова.",
    clickStatusError: "Ошибка при проверке статуса оплаты Click",
    clickStartError: "Ошибка при запуске оплаты Click",
    paymeStartError: "Ошибка при запуске оплаты Payme",
    tariffsTitle: "Доступные тарифы",
    tariffsEmpty: "Пока нет доступных тарифов",
    price: "Цена",
    interviews: "Интервью",
    payTitle: "Оплата",
    selectedTariff: "Выбранный тариф:",
    paymentMethod: "Способ оплаты",
    clickInfo: "ℹ️ Безопасная оплата через Click. Данные карты защищены.",
    paymeInfo: "ℹ️ Безопасная оплата через Payme. Оплата выполняется на странице Payme.",
    loading: "Загрузка...",
    payWithClick: "Оплатить через Click",
    payWithPayme: "Оплатить через Payme",
    chooseTariff: "Выберите тариф",
    interviewsUnit: "интервью",
    countUnit: "шт",
    currency: "сум",
    oneTimeName: "Разовый тариф",
    oneTimeDesc: "Оплата за 1 интервью (5 000 сум)",
    monthlyName: "Месячный тариф",
    monthlyDesc: "50 000 сум в месяц — 10 интервью",
  },
  [Language.EN]: {
    title: "Buy Interviews",
    subtitle: "Purchase interview credits",
    successTitle: "Payment submitted successfully!",
    successDefault: "After admin verification, interviews will be added to your balance.",
    checkClickStatus: "Checking Click payment status...",
    noTariff: "Please select a tariff",
    loadTariffsError: "Failed to load tariffs",
    clickCompleted: "Click payment completed successfully. Interview credits were added to your balance.",
    clickPending: "Payment accepted and being processed. Status will update in a few seconds.",
    clickFailed: "Click payment was not completed. Please try again.",
    clickStatusError: "Failed to check Click payment status",
    clickStartError: "Failed to start Click payment",
    paymeStartError: "Failed to start Payme payment",
    tariffsTitle: "Available tariffs",
    tariffsEmpty: "No tariffs available yet",
    price: "Price",
    interviews: "Interviews",
    payTitle: "Make payment",
    selectedTariff: "Selected tariff:",
    paymentMethod: "Payment method",
    clickInfo: "ℹ️ Secure payment via Click. Your card details are protected.",
    paymeInfo: "ℹ️ Secure payment via Payme. Payment is completed on the Payme page.",
    loading: "Loading...",
    payWithClick: "Pay via Click",
    payWithPayme: "Pay via Payme",
    chooseTariff: "Select a tariff",
    interviewsUnit: "interviews",
    countUnit: "pcs",
    currency: "UZS",
    oneTimeName: "One-time interview",
    oneTimeDesc: "Payment for 1 interview (5,000 UZS)",
    monthlyName: "Monthly plan",
    monthlyDesc: "50,000 UZS per month — 10 interview credits",
  },
} as const;

function getLocalizedTariff(tariff: Tariff, language: Language, tPay: (typeof PAYMENT_TEXTS)[Language]) {
  if (tariff.price === 5000 && tariff.interviews === 1) {
    return {
      name: tPay.oneTimeName,
      description: tPay.oneTimeDesc,
    };
  }

  if (tariff.price === 50000 && tariff.interviews === 10) {
    return {
      name: tPay.monthlyName,
      description: tPay.monthlyDesc,
    };
  }

  return {
    name: tariff.name,
    description: tariff.description,
  };
}

const PaymentPage: React.FC<PaymentPageProps> = ({ language, user, onPaymentSuccess }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const tPay = PAYMENT_TEXTS[language] || PAYMENT_TEXTS[Language.UZ];
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'click' | 'payme'>('click');
  const [uploading, setUploading] = useState(false);
  const [checkingClickStatus, setCheckingClickStatus] = useState(false);
  const [clickStatusMessage, setClickStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadTariffs();
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const clickPaymentId = query.get('click_payment_id');
    if (!clickPaymentId) return;

    const checkStatus = async () => {
      try {
        setCheckingClickStatus(true);
        setError('');
        const payment = await paymentService.checkClickPaymentStatus(clickPaymentId);

        if (payment.status === 'Approved') {
          setSuccess(true);
          setClickStatusMessage(tPay.clickCompleted);
          if (onPaymentSuccess) {
            setTimeout(() => {
              onPaymentSuccess();
            }, 1000);
          }
        } else if (payment.status === 'Pending') {
          setClickStatusMessage(tPay.clickPending);
        } else if (payment.status === 'Cancelled' || payment.status === 'Rejected') {
          setError(tPay.clickFailed);
        }
      } catch (statusError: any) {
        setError(statusError.message || tPay.clickStatusError);
      } finally {
        setCheckingClickStatus(false);
        navigate(location.pathname, { replace: true });
      }
    };

    checkStatus();
  }, [location.pathname, location.search, navigate, onPaymentSuccess]);

  const loadTariffs = async () => {
    try {
      setLoading(true);
      const data = await tariffsService.getActiveTariffs();
      setTariffs(data);
    } catch (error) {
      console.error('Error loading tariffs:', error);
      setError(tPay.loadTariffsError);
    } finally {
      setLoading(false);
    }
  };

  // Click payment handler
  const handleClickPayment = async () => {
    if (!selectedTariff) {
      setError(tPay.noTariff);
      return;
    }

    try {
      setUploading(true);
      setError('');
      const response = await paymentService.initiateClickPayment({
        tariffId: selectedTariff.id,
        amount: selectedTariff.price,
      });

      // Redirect to Click payment page
      window.location.href = response.paymentUrl;
    } catch (error: any) {
      setError(error.message || tPay.clickStartError);
      setUploading(false);
    }
  };

  const handlePaymePayment = async () => {
    if (!selectedTariff) {
      setError(tPay.noTariff);
      return;
    }

    try {
      setUploading(true);
      setError('');
      const response = await paymentService.initiatePaymePayment(selectedTariff.id);
      window.location.href = response.payUrl;
    } catch (paymeError: any) {
      setError(paymeError.message || tPay.paymeStartError);
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="text-indigo-600 animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 duration-500 animate-in fade-in">
      <div>
        <h2 className="flex items-center gap-3 text-4xl font-black tracking-tight text-slate-900 dark:text-white">
          <CreditCard className="text-indigo-600 dark:text-indigo-400" />
          {tPay.title}
        </h2>
        <p className="mt-2 font-medium text-slate-500 dark:text-slate-400">
          {tPay.subtitle}
        </p>
      </div>

      {success && (
        <div className="p-6 border bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 rounded-2xl">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={24} />
            <div>
              <p className="font-black text-emerald-900 dark:text-emerald-100">
                {tPay.successTitle}
              </p>
              <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                {clickStatusMessage || tPay.successDefault}
              </p>
            </div>
          </div>
        </div>
      )}

      {checkingClickStatus && (
        <div className="p-6 border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 rounded-2xl">
          <div className="flex items-center gap-3">
            <Loader2 className="text-blue-600 animate-spin dark:text-blue-400" size={24} />
            <p className="font-bold text-blue-900 dark:text-blue-100">{tPay.checkClickStatus}</p>
          </div>
        </div>
      )}

      {clickStatusMessage && !success && !checkingClickStatus && (
        <div className="p-6 border border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-800 rounded-2xl">
          <p className="font-bold text-indigo-900 dark:text-indigo-100">{clickStatusMessage}</p>
        </div>
      )}

      {error && (
        <div className="p-6 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-2xl">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
            <p className="font-bold text-red-900 dark:text-red-100">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Tariflar ro'yxati */}
        <div className="space-y-4 lg:col-span-2">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">
            {tPay.tariffsTitle}
          </h3>
          {tariffs.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800 rounded-2xl">
              <p className="text-slate-500 dark:text-slate-400">
                {tPay.tariffsEmpty}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {tariffs.map((tariff) => (
                <div
                  key={tariff.id}
                  onClick={() => setSelectedTariff(tariff)}
                  className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${selectedTariff?.id === tariff.id
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="mb-2 text-xl font-black text-slate-900 dark:text-white">
                        {getLocalizedTariff(tariff, language, tPay).name}
                      </h4>
                      {getLocalizedTariff(tariff, language, tPay).description && (
                        <p className="mb-4 text-slate-600 dark:text-slate-400">
                          {getLocalizedTariff(tariff, language, tPay).description}
                        </p>
                      )}
                      <div className="flex gap-6">
                        <div>
                          <p className="mb-1 text-xs font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400">
                            {tPay.price}
                          </p>
                          <p className="text-2xl font-black text-slate-900 dark:text-white">
                            {tariff.price.toLocaleString()} {tPay.currency}
                          </p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400">
                            {tPay.interviews}
                          </p>
                          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                            {tariff.interviews} {tPay.countUnit}
                          </p>
                        </div>
                      </div>
                    </div>
                    {selectedTariff?.id === tariff.id && (
                      <div className="flex items-center justify-center w-6 h-6 bg-indigo-600 rounded-full">
                        <CheckCircle2 className="text-white" size={16} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* To'lov formasi */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm sticky top-8">
            <h3 className="mb-6 text-2xl font-black text-slate-900 dark:text-white">
              {tPay.payTitle}
            </h3>

            {selectedTariff ? (
              <div className="space-y-6">
                {/* Selected Tariff Info */}
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                  <p className="mb-2 text-sm font-bold text-slate-600 dark:text-slate-400">
                    {tPay.selectedTariff}
                  </p>
                  <p className="text-lg font-black text-slate-900 dark:text-white">
                    {getLocalizedTariff(selectedTariff, language, tPay).name}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {selectedTariff.price.toLocaleString()} {tPay.currency} • {selectedTariff.interviews} {tPay.interviewsUnit}
                  </p>
                </div>

                <div>
                  <label className="block mb-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                    {tPay.paymentMethod}
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('click')}
                      className={`px-4 py-3 rounded-lg font-bold transition-all ${paymentMethod === 'click'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                    >
                      💳 Click
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('payme')}
                      className={`px-4 py-3 rounded-lg font-bold transition-all ${paymentMethod === 'payme'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                    >
                      💜 Payme
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {paymentMethod === 'click' && (
                    <>
                      <div className="p-4 border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 rounded-xl">
                        <p className="text-xs font-bold text-blue-800 dark:text-blue-300">
                          {tPay.clickInfo}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleClickPayment}
                        disabled={!selectedTariff || uploading}
                        className="flex items-center justify-center w-full gap-2 px-6 py-4 font-black text-white transition-all bg-linear-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="animate-spin" size={20} />
                            {tPay.loading}
                          </>
                        ) : (
                          <>
                            <CreditCard size={20} />
                            {tPay.payWithClick}
                          </>
                        )}
                      </button>
                    </>
                  )}

                  {paymentMethod === 'payme' && (
                    <>
                      <div className="p-4 border rounded-xl border-fuchsia-200 bg-fuchsia-50 dark:bg-fuchsia-900/20 dark:border-fuchsia-800">
                        <p className="text-xs font-bold text-fuchsia-800 dark:text-fuchsia-300">
                          {tPay.paymeInfo}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handlePaymePayment}
                        disabled={!selectedTariff || uploading}
                        className="flex items-center justify-center w-full gap-2 px-6 py-4 font-black text-white transition-all rounded-xl bg-linear-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="animate-spin" size={20} />
                            {tPay.loading}
                          </>
                        ) : (
                          <>
                            <CreditCard size={20} />
                            {tPay.payWithPayme}
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <DollarSign className="mx-auto mb-4 text-slate-400" size={48} />
                <p className="text-slate-500 dark:text-slate-400">
                  {tPay.chooseTariff}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
