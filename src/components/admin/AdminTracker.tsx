import React from 'react';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../context/LanguageContext';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { MapLibreTracker } from '../shared/MapLibreTracker';

export const AdminTracker: React.FC<{
    setShowAddShop: (val: boolean) => void;
    handleConfirm: (onConfirm: () => void, title: string, message: string) => void;
    theme?: 'light' | 'futuristic';
}> = ({ setShowAddShop, handleConfirm }) => {
    const { users, orders, shops, settings, deleteShop, theme } = useData();
    const { t } = useLanguage();

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className={`text-xl font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>{t('tracker')}</h2>
                <div className="flex gap-2 items-center">
                    <span className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border flex items-center gap-2 shadow-sm transition-all ${theme === 'futuristic' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-green-50 text-green-600 border-green-100'}`}>
                        <div className={`w-2 h-2 rounded-full animate-pulse ${theme === 'futuristic' ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-green-500'}`} />
                        {users.filter(u => (u.role === 'agent' || u.role === 'courier') && u.lat != null && u.lng != null).length} Онлайн
                    </span>
                    <button
                        onClick={() => setShowAddShop(true)}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all active:scale-95 ${theme === 'futuristic' ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white neon-glow' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                    >
                        <Plus size={16} /> Магазин
                    </button>
                </div>
            </div>

            <div className={`relative rounded-[2.5rem] overflow-hidden shadow-2xl border transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`} style={{ height: 'calc(100vh - 220px)' }}>
                <MapLibreTracker
                    users={users.filter(u => (u.role === 'agent' || u.role === 'courier') && u.lat != null && u.lng != null)}
                    orders={orders}
                    shops={shops.filter((s: any) => !s.isArchived)}
                    warehouseLat={Number(settings.warehouse_lat)}
                    warehouseLng={Number(settings.warehouse_lng)}
                    storeAddress={settings.address}
                    onDeleteShop={(id) => handleConfirm(() => deleteShop(id), 'Удалить магазин', 'Вы уверены?')}
                />

                {/* Legend overlay */}
                <div className={`absolute top-6 left-6 p-6 rounded-[2rem] shadow-2xl border transition-all z-10 ${theme === 'futuristic' ? 'bg-black/60 backdrop-blur-xl border-white/10' : 'bg-white/95 backdrop-blur-md border-stone-100'}`}>
                    <h4 className={`text-[10px] font-black uppercase tracking-widest mb-4 ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>Легенда</h4>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3.5 text-xs font-bold">
                            <div className="w-5 h-5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/30 border-2 border-white/20" />
                            <span className={`${theme === 'futuristic' ? 'text-white/80' : 'text-stone-700'}`}>Агент ({users.filter(u => u.role === 'agent' && u.lat != null).length})</span>
                        </div>
                        <div className="flex items-center gap-3.5 text-xs font-bold">
                            <div className="w-5 h-5 rounded-full bg-orange-500 shadow-lg shadow-orange-500/30 border-2 border-white/20" />
                            <span className={`${theme === 'futuristic' ? 'text-white/80' : 'text-stone-700'}`}>Курьер ({users.filter(u => u.role === 'courier' && u.lat != null).length})</span>
                        </div>
                        <div className="flex items-center gap-3.5 text-xs font-bold">
                            <div className="w-5 h-5 rounded-full bg-purple-500 shadow-lg shadow-purple-500/30 border-2 border-white/20" />
                            <span className={`${theme === 'futuristic' ? 'text-white/80' : 'text-stone-700'}`}>Магазин ({shops.filter((s: any) => !s.isArchived).length})</span>
                        </div>
                    </div>
                </div>

                {/* Online users list panel */}
                <div className="absolute bottom-6 left-6 right-24 overflow-x-auto flex gap-3 z-10 pb-2 custom-scrollbar">
                    {users.filter(u => (u.role === 'agent' || u.role === 'courier') && u.lat != null && u.lng != null).map(u => (
                        <div key={u.id} className={`flex-shrink-0 px-4 py-2.5 rounded-[1.25rem] shadow-xl border flex items-center gap-3 transition-all hover:scale-105 ${theme === 'futuristic' ? 'bg-black/40 backdrop-blur-xl border-white/10 hover:bg-white/5' : 'bg-white/95 backdrop-blur-sm border-stone-100 hover:bg-white'}`}>
                            <div className={`w-2.5 h-2.5 rounded-full animate-pulse shadow-md ${u.role === 'agent' ? 'bg-blue-500 shadow-blue-500/50' : 'bg-orange-500 shadow-orange-500/50'}`} />
                            <span className={`text-xs font-black ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{u.name}</span>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border ${u.role === 'agent' ? (theme === 'futuristic' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-600') : (theme === 'futuristic' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-50 text-orange-600')}`}>{u.role}</span>
                        </div>
                    ))}
                    {users.filter(u => (u.role === 'agent' || u.role === 'courier') && u.lat != null && u.lng != null).length === 0 && (
                        <div className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl border ${theme === 'futuristic' ? 'bg-black/40 backdrop-blur-xl border-white/10 text-white/40' : 'bg-white/90 border-stone-50 text-stone-400'}`}>
                            Нет активных пользователей на карте
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};
