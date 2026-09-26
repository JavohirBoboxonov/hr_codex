import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, XCircle, Clock, Eye, Loader2 } from 'lucide-react';
import { Language } from '../../types';
import { UI_STRINGS } from '../../translations';
import * as paymentService from '../../services/paymentService';
import type { Payment } from '../../types';

interface PaymentsProps {
  language: Language;
}

const Payments: React.FC<PaymentsProps> = ({ language }) => {
  const t = UI_STRINGS[language].admin || {};
  const commonCancel = UI_STRINGS[language].common.cancel;
  const localeMap: Record<string, string> = { ru: 'ru-RU', en: 'en-US', uz: 'uz-UZ' };
  const dateLocale = localeMap[language] ?? 'uz-UZ';
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
  }, [filter]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const data = await paymentService.getAllPayments(filter || undefined);
      setPayments(data);
    } catch (error) {
      console.error('Error loading payments:', error);
      alert(t.paymentsLoadError);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (payment: Payment) => {
    if (!confirm(t.confirmApproveMsg.replace('{n}', String(payment.interviews)))) return;
    
    try {
      setProcessing(payment.id);
      await paymentService.approvePayment(payment.id, adminNote || undefined);
      setAdminNote('');
      setSelectedPayment(null);
      loadPayments();
    } catch (error: any) {
      alert(error.message || t.generalError);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (payment: Payment) => {
    if (!adminNote.trim()) {
      alert(t.rejectNoteRequired);
      return;
    }
    if (!confirm(t.confirmRejectMsg)) return;
    
    try {
      setProcessing(payment.id);
      await paymentService.rejectPayment(payment.id, adminNote);
      setAdminNote('');
      setSelectedPayment(null);
      loadPayments();
    } catch (error: any) {
      alert(error.message || t.generalError);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusIcon = (status: Payment['status']) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle2 className="text-emerald-500" size={20} />;
      case 'Rejected':
        return <XCircle className="text-red-500" size={20} />;
      case 'Pending':
        return <Clock className="text-yellow-500" size={20} />;
      default:
        return <Clock className="text-slate-400" size={20} />;
    }
  };

  const getStatusText = (status: Payment['status']) => {
    switch (status) {
      case 'Approved': return t.statusApproved;
      case 'Rejected': return t.statusRejected;
      case 'Pending': return t.statusPending;
      case 'Cancelled': return t.statusCancelled;
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {t.paymentsTitle}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">
            {t.paymentsSubtitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              filter === '' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {t.filterAll}
          </button>
          <button
            onClick={() => setFilter('Pending')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              filter === 'Pending' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {t.filterPending}
          </button>
          <button
            onClick={() => setFilter('Approved')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              filter === 'Approved' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {t.filterApproved}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-8">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
            <CreditCard className="text-indigo-600 dark:text-indigo-400" />
            {t.paymentsList}
          </h3>
          {payments.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-8">
              {t.noPayments}
            </p>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(payment.status)}
                        <span className="text-lg font-black text-slate-900 dark:text-white">
                          {payment.user?.name || t.unknownUser}
                        </span>
                        <span className={`px-3 py-1 rounded-lg text-xs font-black ${
                          payment.status === 'Approved' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                          payment.status === 'Rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                          'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        }`}>
                          {getStatusText(payment.status)}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mb-2">
                        📧 {payment.user?.email || t.unknownUser}
                      </p>
                      <div className="flex gap-6 text-sm mb-2">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          💰 {payment.amount.toLocaleString()} {t.currencyUnit}
                        </span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          💎 {payment.interviews} {t.interviewsAmountLabel}
                        </span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          📦 {payment.tariff?.name || t.unknownTariff}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        📅 {new Date(payment.createdAt).toLocaleString(dateLocale)}
                      </p>
                      {payment.adminNote && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 italic">
                          📝 {payment.adminNote}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap shrink-0">
                      {payment.receiptPath && (
                        <a
                          href={paymentService.getReceiptUrl(payment.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-all"
                          title={t.viewReceipt}
                        >
                          <Eye size={18} />
                        </a>
                      )}
                      {payment.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => setSelectedPayment(payment)}
                            className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-all"
                            title="Tasdiqlash"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setAdminNote('');
                            }}
                            className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
                            title="Rad etish"
                          >
                            <XCircle size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedPayment && selectedPayment.status === 'Pending' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-8 rounded-2xl sm:rounded-[3rem] border border-slate-200 dark:border-slate-700 max-w-md w-full">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6">
              {selectedPayment.user?.name || t.unknownUser} — {t.managePaymentTitle}
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">{t.amountLabel}:</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedPayment.amount.toLocaleString()} {t.currencyUnit}
                </p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">{t.interviewsAmountLabel}:</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedPayment.interviews}
                </p>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                  {t.adminNoteLabel}
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-600"
                  rows={3}
                  placeholder={t.adminNotePlaceholder}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => handleApprove(selectedPayment)}
                disabled={processing === selectedPayment.id}
                className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-black hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                {processing === selectedPayment.id ? t.processingLabel : t.approveBtn}
              </button>
              <button
                onClick={() => handleReject(selectedPayment)}
                disabled={processing === selectedPayment.id}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-black hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {processing === selectedPayment.id ? t.processingLabel : t.rejectBtn}
              </button>
              <button
                onClick={() => {
                  setSelectedPayment(null);
                  setAdminNote('');
                }}
                className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-black hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
              >
                {commonCancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
