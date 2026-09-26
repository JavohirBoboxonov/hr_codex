import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Edit2, Trash2, Check, X, Loader2 } from 'lucide-react';
import { Language } from '../../types';
import { UI_STRINGS } from '../../translations';
import * as tariffsService from '../../services/tariffsService';
import type { Tariff } from '../../types';

interface TariffsProps {
  language: Language;
}

const Tariffs: React.FC<TariffsProps> = ({ language }) => {
  const t = UI_STRINGS[language].admin || {};
  const commonCancel = UI_STRINGS[language].common.cancel;
  
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTariff, setEditingTariff] = useState<Tariff | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    interviews: '',
    isActive: true,
  });

  useEffect(() => {
    loadTariffs();
  }, []);

  const loadTariffs = async () => {
    try {
      setLoading(true);
      const data = await tariffsService.getAllTariffs();
      setTariffs(data);
    } catch (error) {
      console.error('Error loading tariffs:', error);
      alert(t.tariffsLoadError);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTariff) {
        await tariffsService.updateTariff(editingTariff.id, {
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          interviews: parseInt(formData.interviews),
          isActive: formData.isActive,
        });
      } else {
        await tariffsService.createTariff({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          interviews: parseInt(formData.interviews),
        });
      }
      setShowForm(false);
      setEditingTariff(null);
      setFormData({ name: '', description: '', price: '', interviews: '', isActive: true });
      loadTariffs();
    } catch (error: any) {
      alert(error.message || t.generalError);
    }
  };

  const handleEdit = (tariff: Tariff) => {
    setEditingTariff(tariff);
    setFormData({
      name: tariff.name,
      description: tariff.description,
      price: tariff.price.toString(),
      interviews: tariff.interviews.toString(),
      isActive: tariff.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.deleteConfirm)) return;
    try {
      await tariffsService.deleteTariff(id);
      loadTariffs();
    } catch (error: any) {
      alert(error.message || t.generalError);
    }
  };

  const toggleActive = async (tariff: Tariff) => {
    try {
      await tariffsService.updateTariff(tariff.id, {
        isActive: !tariff.isActive,
      });
      loadTariffs();
    } catch (error: any) {
      alert(error.message || t.generalError);
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
            {t.tariffsTitle}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">
            {t.tariffsSubtitle}
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingTariff(null);
            setFormData({ name: '', description: '', price: '', interviews: '', isActive: true });
          }}
          className="px-5 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none active:scale-95 flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus size={20} />
          {t.newTariff}
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-8 rounded-2xl sm:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6">
            {editingTariff ? t.editTariffTitle : t.newTariff}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                {t.tariffNameLabel} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-600"
                required
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                {t.tariffDescLabel}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-600"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                  {t.tariffPriceLabel} *
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                  min="0"
                  step="1000"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                  {t.tariffInterviewsLabel} *
                </label>
                <input
                  type="number"
                  value={formData.interviews}
                  onChange={(e) => setFormData({ ...formData, interviews: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                  min="1"
                />
              </div>
            </div>
            {editingTariff && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <label htmlFor="isActive" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {t.tariffActiveLabel}
                </label>
              </div>
            )}
            <div className="flex gap-4">
              <button
                type="submit"
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black hover:bg-indigo-700 transition-all"
              >
              {editingTariff ? t.tariffSaveBtn : t.tariffCreateBtn}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingTariff(null);
                }}
                className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-black hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
              >
                {commonCancel}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-8">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
            <DollarSign className="text-indigo-600 dark:text-indigo-400" />
            {t.allTariffs}
          </h3>
          {tariffs.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-8">
              {t.noTariffs}
            </p>
          ) : (
            <div className="space-y-4">
              {tariffs.map((tariff) => (
                <div
                  key={tariff.id}
                  className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-xl font-black text-slate-900 dark:text-white">
                        {tariff.name}
                      </h4>
                      {tariff.isActive ? (
                        <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-black">
                          {t.tariffActiveTag}
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-black">
                          {t.tariffInactiveTag}
                        </span>
                      )}
                    </div>
                    {tariff.description && (
                      <p className="text-slate-600 dark:text-slate-400 mb-3">{tariff.description}</p>
                    )}
                    <div className="flex gap-6 text-sm">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        💰 {tariff.price.toLocaleString()} {t.currencyUnit}
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        💎 {tariff.interviews} {t.interviewsAmountLabel}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => toggleActive(tariff)}
                      className="p-3 bg-slate-200 dark:bg-slate-700 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                      title={tariff.isActive ? t.deactivateTariff : t.activateTariff}
                    >
                      {tariff.isActive ? <X size={18} /> : <Check size={18} />}
                    </button>
                    <button
                      onClick={() => handleEdit(tariff)}
                      className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(tariff.id)}
                      className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tariffs;
