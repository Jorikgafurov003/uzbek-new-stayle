import React, { useState, useEffect } from 'react';
import {
    Store, Users as ClientsIcon, ClipboardList, Map as MapIcon,
    Plus, Search, Edit2, Trash2, CheckCircle, Clock, Navigation, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ApiService } from '../services/api';
import { socketService } from '../services/socket';
import { MapLibreTracker } from '../components/MapLibreTracker';
import { useAuth } from '../context/AuthContext';

export const AgentPage: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('shops');
    const [shops, setShops] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchData();
        socketService.connect();
        socketService.join(user?.id || 0, 'agent');

        socketService.onOrderUpdated(() => fetchData());
        return () => socketService.disconnect();
    }, [user]);

    const fetchData = async () => {
        try {
            const [s, o] = await Promise.all([
                ApiService.get('/api/shops'),
                ApiService.get('/api/orders/active')
            ]);
            setShops(s);
            setOrders(o);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8f9fb] flex flex-col font-sans">
            {/* Top Bar */}
            <header className="bg-white border-b border-stone-100 p-6 flex justify-between items-center sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-uzum-secondary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-uzum-secondary/20">
                        <Store size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-stone-800 tracking-tighter italic">AGENT PANEL</h1>
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest leading-none mt-1">Uzbechka AI Super Delivery</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-stone-50 p-2 rounded-2xl flex border border-stone-100">
                        {['shops', 'orders', 'tracker'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === tab ? 'bg-white text-uzum-primary shadow-sm' : 'text-stone-400'}`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="flex-1 p-8 overflow-y-auto">
                <AnimatePresence mode="wait">
                    {activeTab === 'tracker' && (
                        <motion.div
                            key="tracker"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.02 }}
                            className="h-[75vh] rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white"
                        >
                            <MapLibreTracker users={[]} shops={shops} warehouses={[]} />
                        </motion.div>
                    )}

                    {activeTab === 'shops' && (
                        <motion.div key="shops" className="space-y-6 max-w-6xl mx-auto">
                            <div className="flex justify-between items-end mb-8">
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-50 flex items-center gap-3 w-96">
                                    <Search size={20} className="text-stone-300" />
                                    <input
                                        type="text"
                                        placeholder="Search shops..."
                                        className="bg-transparent outline-none font-bold text-sm w-full"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <button className="gold-gradient text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-gold/20 flex items-center gap-2">
                                    <Plus size={18} /> Add Shop
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {shops.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).map(shop => (
                                    <div key={shop.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-stone-100 hover:shadow-xl hover:shadow-stone-200/50 transition-all group">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-14 h-14 bg-stone-50 text-uzum-primary rounded-2xl flex items-center justify-center group-hover:bg-uzum-primary group-hover:text-white transition-colors">
                                                <Store size={28} />
                                            </div>
                                            <div className="flex gap-2">
                                                <button className="p-3 bg-stone-50 text-stone-400 rounded-xl hover:bg-stone-100">
                                                    <Edit2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-bold text-stone-800 mb-2">{shop.name}</h3>
                                        <p className="text-sm text-stone-400 font-medium mb-6 flex items-center gap-2">
                                            <MapPin size={16} /> {shop.address}
                                        </p>
                                        <div className="pt-6 border-t border-stone-50 flex justify-between items-center">
                                            <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">Active Requests</p>
                                            <span className="bg-stone-100 text-stone-800 px-3 py-1 rounded-full text-xs font-bold">0</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'orders' && (
                        <motion.div key="orders" className="max-w-6xl mx-auto">
                            <div className="bg-white rounded-[3rem] shadow-sm border border-stone-100 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-stone-50">
                                            <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-widest">Order ID</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-widest">Status</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-widest">Address</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-widest">Price</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-widest">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-50">
                                        {orders.map(order => (
                                            <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                                                <td className="px-8 py-6 font-black text-stone-800">#{order.id}</td>
                                                <td className="px-8 py-6">
                                                    <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${order.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-sm font-medium text-stone-500">{order.address}</td>
                                                <td className="px-8 py-6 font-black text-uzum-primary">{order.totalPrice.toLocaleString()} сум</td>
                                                <td className="px-8 py-6">
                                                    <button className="text-stone-400 hover:text-uzum-primary transition-colors">
                                                        <Navigation size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};
