import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../context/LanguageContext';
import { motion } from 'motion/react';
import { Plus, Info, Check, Banknote, Edit, Trash2 } from 'lucide-react';
import { UserProfileMiniature } from '../shared/UserProfileMiniature';

const AdminDebts: React.FC<{
    setShowAddDebt: (val: boolean) => void;
    setEditingDebt: (debt: any) => void;
    setSelectedDebtForInfo: (debt: any) => void;
}> = ({ setShowAddDebt, setEditingDebt, setSelectedDebtForInfo }) => {
    const { debts, payDebt, payPartialDebt, increaseDebt, deleteDebt, theme } = useData();
    const { t } = useLanguage();
    const [debtSubTab, setDebtSubTab] = useState<'list' | 'history'>('list');

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className={`text-2xl font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{t('debts')}</h2>
                    <button
                        onClick={() => setShowAddDebt(true)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2 ${theme === 'futuristic' ? 'bg-gradient-to-r from-red-600 to-purple-600 text-white neon-glow' : 'bg-red-500 text-white'}`}
                    >
                        <Plus size={14} />
                        Добавить долг
                    </button>
                </div>
                <div className={`flex p-1 rounded-xl ${theme === 'futuristic' ? 'bg-white/5' : 'bg-stone-100'}`}>
                    <button
                        onClick={() => setDebtSubTab('list')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${debtSubTab === 'list' ? (theme === 'futuristic' ? 'bg-white/20 text-white' : 'bg-white shadow-sm text-stone-800') : 'text-stone-400'}`}
                    >
                        Список долгов
                    </button>
                    <button
                        onClick={() => setDebtSubTab('history')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${debtSubTab === 'history' ? (theme === 'futuristic' ? 'bg-white/20 text-white' : 'bg-white shadow-sm text-stone-800') : 'text-stone-400'}`}
                    >
                        История повышений
                    </button>
                </div>
            </div>

            {debtSubTab === 'list' ? (
                <div className={`rounded-[2.5rem] shadow-sm border overflow-hidden transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className={`${theme === 'futuristic' ? 'bg-white/5 border-b border-white/10' : 'bg-stone-50 border-b'}`}>
                                <tr>
                                    <th className="p-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">{t('client')}</th>
                                    <th className="p-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Ответственный</th>
                                    <th className="p-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">{t('debtAmount')}</th>
                                    <th className="p-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">{t('dueDate')}</th>
                                    <th className="p-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">{t('status')}</th>
                                    <th className="p-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Действия</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${theme === 'futuristic' ? 'divide-white/5' : 'divide-stone-100'}`}>
                                {debts.map(debt => (
                                    <tr key={debt.id} className={`transition-all ${theme === 'futuristic' ? 'hover:bg-white/5' : 'hover:bg-stone-50'}`}>
                                        <td className="p-5">
                                            <div className="flex items-center gap-4">
                                                <UserProfileMiniature user={{ photo: debt.clientPhoto, name: debt.clientName }} size={44} />
                                                <div>
                                                    <p className={`text-sm font-black ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{debt.clientName}</p>
                                                    <p className="text-xs text-stone-400 font-medium">{debt.clientPhone}</p>
                                                    {debt.shopName && (
                                                        <p className={`text-[10px] font-black mt-1 uppercase tracking-widest ${theme === 'futuristic' ? 'text-cyan-400' : 'text-stone-500'}`}>Магазин: {debt.shopName}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            {debt.courierName ? (
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md border ${theme === 'futuristic' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>Курьер</span>
                                                    <span className={`text-xs font-bold ${theme === 'futuristic' ? 'text-white/80' : 'text-stone-600'}`}>{debt.courierName}</span>
                                                </div>
                                            ) : debt.agentName ? (
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md border ${theme === 'futuristic' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>Агент</span>
                                                    <span className={`text-xs font-bold ${theme === 'futuristic' ? 'text-white/80' : 'text-stone-600'}`}>{debt.agentName}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-stone-400 italic">Не указан</span>
                                            )}
                                        </td>
                                        <td className="p-5">
                                            <div className="space-y-0.5">
                                                <p className={`text-sm font-black ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>
                                                    {(debt.amount || 0).toLocaleString()} UZS
                                                </p>
                                                {debt.increaseReason?.includes('Частично оплачено') ? (
                                                    <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">
                                                        {debt.increaseReason}
                                                    </p>
                                                ) : debt.increasedAmount > 0 && (
                                                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                                                        +{debt.increasedAmount.toLocaleString()} ({debt.increaseReason})
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-5 text-xs font-black uppercase tracking-widest text-stone-400">{debt.dueDate ? new Date(debt.dueDate).toLocaleDateString() : '-'}</td>
                                        <td className="p-5">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-md ${debt.status === 'paid' ? (theme === 'futuristic' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-green-100 text-green-600') : (theme === 'futuristic' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-100 text-red-600')
                                                    }`}>
                                                    {debt.status === 'paid' ? 'Оплачено' : 'Долг'}
                                                </span>
                                                {debt.status === 'paid' && (
                                                    <>
                                                        {debt.paidAt && <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">{new Date(debt.paidAt).toLocaleDateString()}</span>}
                                                        {debt.payerName && <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Отдал: {debt.payerName}</span>}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setSelectedDebtForInfo(debt)}
                                                    className={`p-2.5 rounded-xl transition-all font-bold shadow-sm active:scale-95 ${theme === 'futuristic' ? 'bg-white/5 text-white hover:bg-white/10 border border-white/10' : 'bg-stone-50 text-stone-600 hover:bg-stone-100'}`}
                                                    title="Информация"
                                                >
                                                    <Info size={16} />
                                                </button>
                                                {debt.status !== 'paid' && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                const payerName = prompt(`Укажите, кто отдал долг (магазин: ${debt.shopName || debt.clientName}):`);
                                                                if (payerName !== null) {
                                                                    if (confirm(`Подтвердить оплату долга от ${payerName}?`)) {
                                                                        payDebt(debt.id, payerName);
                                                                        window.speechSynthesis.speak(Object.assign(new SpeechSynthesisUtterance(`Долг погашен. Отдал: ${payerName}`), { lang: 'ru-RU' }));
                                                                    }
                                                                }
                                                            }}
                                                            className={`p-2.5 rounded-xl transition-all shadow-lg active:scale-95 ${theme === 'futuristic' ? 'bg-green-500 text-white neon-glow' : 'bg-green-500 text-white'}`}
                                                            title="Погасить долг"
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const amount = prompt("Введите сумму частичного погашения:");
                                                                if (amount && !isNaN(Number(amount))) {
                                                                    const payerName = prompt(`Укажите, кто отдал долг (магазин: ${debt.shopName || debt.clientName}):`);
                                                                    if (payerName !== null) {
                                                                        if (confirm(`Подтвердить частичную оплату ${amount} UZS от ${payerName}?`)) {
                                                                            payPartialDebt(debt.id, Number(amount), payerName);
                                                                            window.speechSynthesis.speak(Object.assign(new SpeechSynthesisUtterance(`Внесена частичная оплата долга: ${amount}`), { lang: 'ru-RU' }));
                                                                        }
                                                                    }
                                                                } else if (amount) {
                                                                    alert("Пожалуйста, введите корректную сумму.");
                                                                }
                                                            }}
                                                            className={`p-2.5 rounded-xl transition-all shadow-lg active:scale-95 ${theme === 'futuristic' ? 'bg-blue-600 text-white neon-blue-glow' : 'bg-blue-500 text-white'}`}
                                                            title="Частичное погашение"
                                                        >
                                                            <Banknote size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const amount = prompt("Введите сумму увеличения долга:");
                                                                const reason = prompt("Причина увеличения:");
                                                                if (amount && reason) {
                                                                    increaseDebt(debt.id, Number(amount), reason);
                                                                    window.speechSynthesis.speak(Object.assign(new SpeechSynthesisUtterance(`Долг ${debt.clientName} увеличен на ${amount}`), { lang: 'ru-RU' }));
                                                                }
                                                            }}
                                                            className={`p-2.5 rounded-xl transition-all shadow-lg active:scale-95 ${theme === 'futuristic' ? 'bg-stone-800 text-white border border-white/20' : 'bg-stone-900 text-white'}`}
                                                            title="Увеличить долг"
                                                        >
                                                            <Plus size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingDebt(debt)}
                                                            className={`p-2.5 rounded-xl transition-all shadow-sm active:scale-95 ${theme === 'futuristic' ? 'bg-white/5 text-white hover:bg-white/10 border border-white/10' : 'bg-stone-50 text-stone-600 hover:bg-stone-100'}`}
                                                            title="Редактировать долг"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`Вы уверены, что хотите удалить долг клиента "${debt.clientName}"? Это действие необратимо.`)) {
                                                            deleteDebt(debt.id as number);
                                                            window.speechSynthesis.speak(Object.assign(new SpeechSynthesisUtterance('Долг удален'), { lang: 'ru-RU' }));
                                                        }
                                                    }}
                                                    className={`p-2.5 rounded-xl transition-all shadow-sm active:scale-95 ${theme === 'futuristic' ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
                                                    title="Удалить долг"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className={`p-8 rounded-[3rem] shadow-sm border transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}>
                    <div className="space-y-6">
                        {debts.filter(d => d.increasedAmount > 0).map(debt => (
                            <div key={debt.id} className={`flex items-center justify-between p-6 rounded-[2rem] border transition-all ${theme === 'futuristic' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-stone-50 border-stone-100 hover:bg-white active:shadow-md'}`}>
                                <div className="flex items-center gap-5">
                                    <UserProfileMiniature user={{ photo: debt.clientPhoto, name: debt.clientName }} size={56} />
                                    <div>
                                        <h4 className={`text-lg font-black ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{debt.clientName}</h4>
                                        <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">Причина: {debt.increaseReason}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black text-red-500">+{debt.increasedAmount.toLocaleString()} UZS</p>
                                    <p className="text-[10px] text-stone-500 uppercase font-black tracking-widest mt-1">Увеличен</p>
                                </div>
                            </div>
                        ))}
                        {debts.filter(d => d.increasedAmount > 0).length === 0 && (
                            <div className="text-center py-20">
                                <Info size={48} className="mx-auto text-stone-300 mb-4 opacity-20" />
                                <p className="text-xs font-black text-stone-400 uppercase tracking-widest">Истории повышений пока нет</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default AdminDebts;
