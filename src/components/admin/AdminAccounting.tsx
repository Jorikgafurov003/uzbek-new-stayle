import React from 'react';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../context/LanguageContext';
import { motion } from 'motion/react';
import { Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../shared/ConfirmDialog';

export const AdminAccounting: React.FC<{
    setShowAddExpense: (val: boolean) => void;
    handleConfirm: (onConfirm: () => void, title: string, message: string) => void;
    theme?: 'light' | 'futuristic';
}> = ({ setShowAddExpense, handleConfirm }) => {
    const { accounting, deleteExpense, theme, apiFetch } = useData();
    const { t } = useLanguage();

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className={`text-2xl font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>{t('accounting') || 'Бухгалтерия'}</h2>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${theme === 'futuristic' ? 'text-cyan-400/60' : 'text-stone-400'}`}>Финансовый отчет системы</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={async () => {
                            handleConfirm(async () => {
                                try {
                                    await apiFetch('/api/admin/reset-stats', { method: 'POST' });
                                    window.location.reload();
                                } catch (e) { console.error(e); }
                            }, 'Сброс статистики', 'Вы уверены, что хотите сбросить все счетчики?');
                        }}
                        className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm border flex items-center gap-2 active:scale-95 ${theme === 'futuristic' ? 'bg-white/5 border-white/10 text-stone-300' : 'bg-stone-50 border-stone-200 text-stone-600'}`}
                    >
                        <Trash2 size={16} /> Сбросить
                    </button>
                    <button
                        onClick={() => setShowAddExpense(true)}
                        className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 active:scale-95 ${theme === 'futuristic' ? 'bg-gradient-to-r from-red-600 to-purple-600 text-white neon-glow' : 'bg-red-500 text-white'}`}
                    >
                        <Plus size={16} /> Расход
                    </button>
                </div>
            </div>

            {accounting?.summary ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Грязная выручка', value: accounting.summary.totalIncome, color: 'text-green-500' },
                            { label: 'Наличные', value: accounting.summary.cashIncome, color: theme === 'futuristic' ? 'text-white' : 'text-stone-800' },
                            { label: 'Пластик/Карта', value: accounting.summary.cardIncome, color: theme === 'futuristic' ? 'text-white' : 'text-stone-800' },
                            { label: 'Сумма в долг', value: accounting.summary.unpaidDebts, color: 'text-orange-500' },
                            { label: 'Возврат долгов', value: accounting.summary.repaidDebts, color: 'text-blue-500', prefix: '+' },
                            { label: 'Фактич. Деньги', value: accounting.summary.actualRevenue, color: 'text-green-400' },
                            { label: 'Все расходы', value: accounting.summary.totalExpenses, color: 'text-red-500', prefix: '-' },
                            { label: 'Себестоимость (COGS)', value: accounting.summary.totalCogs || 0, color: 'text-orange-400', prefix: '-' }
                        ].map((stat, i) => (
                            <div key={i} className={`p-6 rounded-[2rem] shadow-sm border flex flex-col justify-center items-center text-center transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10 hover:border-white/20' : 'bg-white border-stone-100'}`}>
                                <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>{stat.label}</span>
                                <span className={`text-xl font-black ${stat.color}`}>{stat.prefix}{stat.value.toLocaleString()} UZS</span>
                            </div>
                        ))}
                        <div className={`p-6 rounded-[2rem] shadow-xl border-2 flex flex-col justify-center items-center text-center transition-all ${theme === 'futuristic' ? 'glass-morphism border-cyan-500/50 shadow-cyan-500/10' : 'bg-white border-gold shadow-gold/10'}`}>
                            <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${theme === 'futuristic' ? 'text-cyan-400' : 'text-gold'}`}>Чистая Прибыль</span>
                            <span className={`text-2xl font-black ${theme === 'futuristic' ? 'text-white neon-blue-glow' : 'text-stone-900'}`}>{accounting.summary.netProfit.toLocaleString()} UZS</span>
                        </div>
                    </div>

                    <div className={`p-8 rounded-[2.5rem] shadow-sm border transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}>
                        <h3 className={`text-xs font-black uppercase tracking-widest mb-6 ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-900'}`}>История расходов</h3>
                        {accounting.expenses && accounting.expenses.length > 0 ? (
                            <div className="space-y-4">
                                {accounting.expenses.map((exp: any) => (
                                    <div key={exp.id} className={`flex justify-between items-center p-5 rounded-2xl border transition-all hover:shadow-lg ${theme === 'futuristic' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-stone-50 border-stone-100 hover:bg-white'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col">
                                                <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${theme === 'futuristic' ? 'text-cyan-400' : 'text-stone-500'}`}>{exp.category}</span>
                                                <span className={`text-sm font-bold ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{exp.description}</span>
                                                <p className="text-[9px] font-black text-stone-400 mt-2 uppercase tracking-widest">{new Date(exp.date).toLocaleString('ru-RU')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <span className="text-base font-black text-red-500">-{exp.amount.toLocaleString()} UZS</span>
                                            <button
                                                onClick={() => handleConfirm(() => deleteExpense(exp.id), 'Удалить расход', 'Вы уверены?')}
                                                className={`p-2.5 rounded-xl transition-all shadow-sm active:scale-95 ${theme === 'futuristic' ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20' : 'bg-white text-red-500 border border-stone-100 hover:bg-red-50'}`}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={`text-center py-12 rounded-3xl border border-dashed ${theme === 'futuristic' ? 'border-white/10' : 'border-stone-200'}`}>
                                <p className="text-xs font-black text-stone-400 uppercase tracking-widest">Нет записей о расходах</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className={`flex flex-col items-center justify-center py-32 rounded-[3rem] border transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}>
                    <div className={`w-16 h-16 border-4 rounded-full animate-spin mb-6 shadow-lg ${theme === 'futuristic' ? 'border-cyan-500 border-t-transparent shadow-cyan-500/20' : 'border-gold border-t-transparent shadow-gold/20'}`} />
                    <p className={`text-xs font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>Сбор бухгалтерии...</p>
                </div>
            )}
        </motion.div>
    );
};
