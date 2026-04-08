import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Package, ShoppingBag, Users as UsersIcon,
    TrendingUp, Map as MapIcon, Settings, Bell, Search,
    Plus, Shield, Zap, Globe, Moon, Sun, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ApiService } from '../services/api';
import { socketService } from '../services/socket';
import { MapLibreTracker } from '../components/MapLibreTracker';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const AdminPage: React.FC = () => {
    const { logout } = useAuth();
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [shops, setShops] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        fetchData();
        socketService.connect();
        socketService.join(0, 'admin'); // Admin ID 0 or similar

        socketService.onLocationUpdated(() => fetchData());
        socketService.onOrderUpdated(() => fetchData());

        return () => socketService.disconnect();
    }, []);

    const fetchData = async () => {
        try {
            const [u, o, s, w] = await Promise.all([
                ApiService.get('/api/users'),
                ApiService.get('/api/orders/active'),
                ApiService.get('/api/shops'),
                ApiService.get('/api/warehouses')
            ]);
            setUsers(u);
            setOrders(o);
            setShops(s);
            setWarehouses(w);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className={`min-h-screen flex font-sans ${isDarkMode ? 'bg-stone-900 text-white' : 'bg-[#f8f9fb] text-stone-800'}`}>
            {/* Sidebar */}
            <nav className={`w-80 border-r p-8 flex flex-col gap-8 sticky top-0 h-screen ${isDarkMode ? 'bg-stone-900 border-white/5' : 'bg-white border-stone-100'}`}>
                <div className="flex items-center gap-3 px-4">
                    <div className="w-10 h-10 bg-uzum-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-uzum-primary/30">
                        <Zap size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tighter italic">UZBECHKA</h1>
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-50">AI Super Admin</p>
                    </div>
                </div>

                <div className="flex-1 space-y-2">
                    {[
                        { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
                        { id: 'tracker', icon: <MapIcon size={20} />, label: 'Live Tracker' },
                        { id: 'orders', icon: <ShoppingBag size={20} />, label: 'Orders' },
                        { id: 'users', icon: <UsersIcon size={20} />, label: 'Management' },
                        { id: 'inventory', icon: <Package size={20} />, label: 'Inventory' },
                        { id: 'analytics', icon: <TrendingUp size={20} />, label: 'AI Analytics' },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${activeTab === item.id ? 'bg-uzum-primary text-white shadow-xl shadow-uzum-primary/20' : 'hover:bg-stone-50'}`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </div>

                <div className="pt-8 border-t border-stone-50 space-y-4">
                    <div className="flex justify-between items-center px-4">
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 bg-stone-50 rounded-xl">
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <button className="p-3 bg-stone-50 rounded-xl relative">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                        </button>
                    </div>
                    <button onClick={logout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all">
                        <LogOut size={20} /> Logout
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 p-12 overflow-y-auto">
                <header className="flex justify-between items-end mb-12">
                    <div>
                        <h2 className="text-4xl font-black tracking-tight mb-2">
                            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                        </h2>
                        <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">Uzbechka AI Super Delivery Platform</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-50 flex items-center gap-3">
                            <Search size={20} className="text-stone-300" />
                            <input type="text" placeholder="Global search..." className="bg-transparent outline-none font-bold text-sm" />
                        </div>
                        <button className="gold-gradient text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-gold/20 flex items-center gap-2">
                            <Plus size={18} /> New Action
                        </button>
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    {activeTab === 'tracker' && (
                        <motion.div
                            key="tracker"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.02 }}
                            className="h-[70vh] rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white"
                        >
                            <MapLibreTracker users={users} shops={shops} warehouses={warehouses} />
                        </motion.div>
                    )}

                    {activeTab === 'dashboard' && (
                        <motion.div key="dashboard" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                                { label: 'Active Orders', value: orders.length, icon: <ShoppingBag />, color: 'bg-blue-500' },
                                { label: 'Online Couriers', value: users.filter(u => u.role === 'courier').length, icon: <Zap />, color: 'bg-uzum-secondary' },
                                { label: 'Total Revenue', value: '1.2M', icon: <TrendingUp />, color: 'bg-emerald-500' },
                                { label: 'AI Efficiency', value: '98%', icon: <Shield />, color: 'bg-uzum-primary' },
                            ].map((stat, i) => (
                                <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100 relative overflow-hidden group">
                                    <div className={`absolute top-0 right-0 w-32 h-32 ${stat.color} opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform`} />
                                    <div className={`w-12 h-12 ${stat.color} text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-opacity-20`}>
                                        {stat.icon}
                                    </div>
                                    <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px] mb-2">{stat.label}</p>
                                    <h3 className="text-3xl font-black text-stone-800">{stat.value}</h3>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};
