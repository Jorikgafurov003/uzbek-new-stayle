import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../context/LanguageContext';
import { motion } from 'motion/react';
import { Plus, Store, MapPin, Edit, RotateCcw, Archive, Trash2 } from 'lucide-react';
import { MapLibreTracker } from '../shared/MapLibreTracker';

const AdminShops: React.FC<{
    setShowAddShop: (val: boolean) => void;
    setEditingShop: (shop: any) => void;
    handleConfirm: (onConfirm: () => void, title: string, message: string) => void;
    theme?: 'light' | 'futuristic';
}> = ({ setShowAddShop, setEditingShop, handleConfirm }) => {
    const { shops, settings, deleteShop, archiveShop, theme } = useData();
    const { t } = useLanguage();
    const [shopTab, setShopTab] = useState<'active' | 'archived'>('active');

    return (
        <motion.div key="shops" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <h2 className={`text-xl font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>Магазины</h2>
                    <div className={`flex p-1 rounded-xl ${theme === 'futuristic' ? 'bg-white/5' : 'bg-stone-100'}`}>
                        <button
                            onClick={() => setShopTab('active')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${shopTab === 'active' ? (theme === 'futuristic' ? 'bg-white/20 text-white' : 'bg-white text-uzum-primary shadow-sm') : 'text-stone-400'}`}
                        >
                            Активные
                        </button>
                        <button
                            onClick={() => setShopTab('archived')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${shopTab === 'archived' ? (theme === 'futuristic' ? 'bg-white/20 text-white' : 'bg-white text-uzum-primary shadow-sm') : 'text-stone-400'}`}
                        >
                            Архив
                        </button>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddShop(true)}
                    className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all active:scale-95 ${theme === 'futuristic' ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white neon-glow shadow-cyan-500/20' : 'gold-gradient text-white shadow-gold/20'}`}
                >
                    <Plus size={18} /> Добавить Магазин
                </button>
            </div>

            <div className={`h-[40vh] rounded-[2.5rem] overflow-hidden shadow-lg border-4 mb-6 transition-all ${theme === 'futuristic' ? 'border-white/10' : 'border-white'}`}>
                <MapLibreTracker
                    users={[]}
                    orders={[]}
                    shops={shops}
                    warehouseLat={Number(settings.warehouse_lat)}
                    warehouseLng={Number(settings.warehouse_lng)}
                    storeAddress={settings.address}
                    onDeleteShop={(id) => handleConfirm(() => deleteShop(id), 'Удалить магазин', 'Вы уверены?')}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shops.filter(s => shopTab === 'active' ? !s.isArchived : s.isArchived).map((shop: any) => (
                    <div key={shop.id} className={`p-6 rounded-[2.5rem] shadow-sm border space-y-4 transition-all group overflow-hidden relative ${theme === 'futuristic' ? 'glass-morphism border-white/10 hover:border-white/20' : 'bg-white border-[#e2e5eb] hover:shadow-xl hover:shadow-uzum-primary/5'}`}>
                        {shop.isArchived && (
                            <div className="absolute top-4 right-4 px-2 py-1 bg-amber-500 text-white text-[8px] font-black uppercase rounded-lg z-10 shadow-lg">
                                Архив
                            </div>
                        )}
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${theme === 'futuristic' ? 'bg-white/5 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white group-hover:neon-blue-glow' : 'bg-uzum-bg text-uzum-primary group-hover:bg-uzum-primary group-hover:text-white'}`}>
                                    <Store size={28} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`font-black text-lg truncate ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{shop.name}</h4>
                                    <p className="text-xs text-stone-400 flex items-center gap-1 truncate font-bold uppercase tracking-wider">
                                        <MapPin size={12} className="text-cyan-500" /> {shop.address}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className={`pt-4 border-t flex justify-between items-center ${theme === 'futuristic' ? 'border-white/5' : 'border-stone-100'}`}>
                            <div className="flex flex-col gap-2">
                                <div>
                                    <span className={`text-[9px] font-black uppercase tracking-widest block mb-0.5 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>Владелец</span>
                                    <span className={`block text-xs font-bold truncate max-w-[140px] ${theme === 'futuristic' ? 'text-white/80' : 'text-stone-700'}`}>{shop.clientName || 'Не привязан'}</span>
                                </div>
                                {(shop as any).agentName && (
                                    <div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest block mb-0.5 ${theme === 'futuristic' ? 'text-purple-400' : 'text-purple-400'}`}>Агент</span>
                                        <span className={`block text-xs font-bold truncate max-w-[140px] ${theme === 'futuristic' ? 'text-purple-300' : 'text-purple-600'}`}>{(shop as any).agentName}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setEditingShop({ ...shop })}
                                    className={`p-3 rounded-xl transition-all shadow-sm active:scale-95 ${theme === 'futuristic' ? 'bg-white/5 text-white hover:bg-white/10 border border-white/10' : 'bg-uzum-bg text-uzum-primary hover:bg-uzum-primary hover:text-white'}`}
                                    title="Изменить"
                                >
                                    <Edit size={18} />
                                </button>
                                <button
                                    onClick={() => handleConfirm(() => archiveShop(shop.id, !shop.isArchived), shop.isArchived ? 'Восстановить магазин' : 'В архив', shop.isArchived ? 'Вы уверены, что хотите восстановить этот магазин?' : 'Вы уверены, что хотите переместить этот магазин в архив?')}
                                    className={`p-3 rounded-xl transition-all shadow-sm active:scale-95 ${shop.isArchived ? (theme === 'futuristic' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-green-50 text-green-500 hover:bg-green-500 hover:text-white') : (theme === 'futuristic' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-500 hover:bg-amber-500 hover:text-white')}`}
                                    title={shop.isArchived ? "Восстановить" : "В архив"}
                                >
                                    {shop.isArchived ? <RotateCcw size={18} /> : <Archive size={18} />}
                                </button>
                                <button
                                    onClick={() => handleConfirm(() => deleteShop(shop.id), 'Удалить магазин', 'Вы уверены?')}
                                    className={`p-3 rounded-xl transition-all shadow-sm active:scale-95 ${theme === 'futuristic' ? 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20' : 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white'}`}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

export default AdminShops;
