import React, { useState, useEffect } from 'react';
import { Navigation, Package, CheckCircle, MapPin, Power, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ApiService } from '../services/api';
import { socketService } from '../services/socket';
import { useLocation } from '../hooks/useLocation';
import { MapLibreTracker } from '../components/MapLibreTracker';
import { useAuth } from '../context/AuthContext';

export const CourierPage: React.FC = () => {
    const { user } = useAuth();
    const { location } = useLocation();
    const [orders, setOrders] = useState<any[]>([]);
    const [isOnline, setIsOnline] = useState(false);
    const [activeOrder, setActiveOrder] = useState<any>(null);

    useEffect(() => {
        if (user) {
            socketService.connect();
            socketService.join(user.id, 'courier');
            fetchOrders();

            socketService.onOrderUpdated(() => fetchOrders());
        }
        return () => socketService.disconnect();
    }, [user]);

    // Send GPS updates to server
    useEffect(() => {
        if (isOnline && location && user) {
            socketService.updateLocation(user.id, location.lat, location.lng);
        }
    }, [location, isOnline, user]);

    const fetchOrders = async () => {
        try {
            const data = await ApiService.get('/api/orders/active');
            setOrders(data);
            const active = data.find((o: any) => o.status === 'on_way' || o.status === 'delivering');
            setActiveOrder(active || null);
        } catch (e) {
            console.error(e);
        }
    };

    const handleStatusUpdate = async (orderId: number, status: string) => {
        try {
            await ApiService.put(`/api/orders/${orderId}/status`, { status });
            socketService.connect().emit("updateOrderStatus", { orderId, status, userId: user?.id });
            fetchOrders();
        } catch (e) {
            alert(e.message);
        }
    };

    return (
        <div className="min-h-screen bg-stone-900 text-white flex flex-col font-sans overflow-hidden">
            {/* 3D Map (Navigation Style) */}
            <div className="flex-1 relative">
                <MapLibreTracker
                    users={[]}
                    shops={[]}
                    warehouses={[]}
                    center={location ? [location.lng, location.lat] : undefined}
                    zoom={15}
                />

                {/* Overlay Controls */}
                <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none">
                    <button
                        onClick={() => setIsOnline(!isOnline)}
                        className={`pointer-events-auto px-6 py-4 rounded-3xl font-black flex items-center gap-3 shadow-2xl transition-all ${isOnline ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}
                    >
                        <Power size={24} /> {isOnline ? 'ONLINE' : 'OFFLINE'}
                    </button>

                    <div className="bg-black/50 backdrop-blur-xl p-4 rounded-3xl border border-white/10 pointer-events-auto">
                        <Bell size={24} className="text-uzum-secondary" />
                    </div>
                </div>

                {/* Navigation Hint */}
                {activeOrder && (
                    <div className="absolute top-24 left-6 right-6 bg-uzum-primary p-6 rounded-[2rem] shadow-2xl border border-white/20 animate-pulse pointer-events-auto">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-2xl">
                                <Navigation size={32} />
                            </div>
                            <div>
                                <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Next Destination</p>
                                <p className="text-xl font-black">{activeOrder.address}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Sheet for Orders */}
            <div className="h-1/3 bg-stone-800 rounded-t-[4rem] p-8 shadow-[0_-20px_50px_rgba(0,0,0,0.3)] border-t border-white/5 relative z-30">
                <div className="w-12 h-1.5 bg-white/20 mx-auto mb-8 rounded-full" />

                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4">
                    {orders.length === 0 ? (
                        <div className="w-full text-center py-10 opacity-50 italic">
                            No active orders. Wait for AI Dispatcher...
                        </div>
                    ) : (
                        orders.map(order => (
                            <motion.div
                                key={order.id}
                                className={`min-w-[300px] p-6 rounded-[2.5rem] border ${order.id === activeOrder?.id ? 'bg-uzum-primary border-transparent shadow-2xl shadow-uzum-primary/40' : 'bg-stone-700/50 border-white/10'}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-white/10 p-3 rounded-2xl">
                                        <Package size={24} />
                                    </div>
                                    <p className="text-2xl font-black">#{order.id}</p>
                                </div>
                                <p className="text-sm font-bold mb-4 line-clamp-1 opacity-80">{order.address}</p>

                                <div className="flex gap-2">
                                    {order.status === 'assigned' && (
                                        <button
                                            onClick={() => handleStatusUpdate(order.id, 'accepted')}
                                            className="flex-1 py-4 bg-emerald-500 rounded-2xl font-black text-xs uppercase tracking-widest"
                                        >
                                            Accept
                                        </button>
                                    )}
                                    {order.status === 'accepted' && (
                                        <button
                                            onClick={() => handleStatusUpdate(order.id, 'on_way')}
                                            className="flex-1 py-4 bg-white text-uzum-primary rounded-2xl font-black text-xs uppercase tracking-widest"
                                        >
                                            Pick Up
                                        </button>
                                    )}
                                    {order.status === 'on_way' && (
                                        <button
                                            onClick={() => handleStatusUpdate(order.id, 'delivered')}
                                            className="flex-1 py-4 bg-emerald-500 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={18} /> Done
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
