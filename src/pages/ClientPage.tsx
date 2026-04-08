import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, MapPin, Search, Star, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ApiService } from '../services/api';
import { socketService } from '../services/socket';
import { useLocation } from '../hooks/useLocation';
import { MapLibreTracker } from '../components/MapLibreTracker';

export const ClientPage: React.FC = () => {
    const { location } = useLocation();
    const [products, setProducts] = useState<any[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const [activeOrders, setActiveOrders] = useState<any[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchProducts();
        fetchActiveOrders();

        socketService.connect();
        socketService.onOrderUpdated(() => fetchActiveOrders());

        return () => socketService.disconnect();
    }, []);

    const fetchProducts = async () => {
        try {
            const data = await ApiService.get('/api/products');
            setProducts(data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchActiveOrders = async () => {
        try {
            const data = await ApiService.get('/api/orders/active');
            setActiveOrders(data);
        } catch (e) {
            console.error(e);
        }
    };

    const addToCart = (product: any) => {
        setCart(prev => [...prev, product]);
    };

    const handleCheckout = async () => {
        if (!location) return alert("Please enable GPS to order");

        try {
            const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);
            await ApiService.post('/api/orders', {
                items: cart,
                totalPrice,
                address: "Current Location",
                lat: location.lat,
                lng: location.lng,
                paymentMethod: 'cash'
            });
            setCart([]);
            setShowCart(false);
            fetchActiveOrders();
            alert("Order placed! AI is assigning a courier...");
        } catch (e) {
            alert(e.message);
        }
    };

    return (
        <div className="min-h-screen bg-stone-50 md:flex flex-col font-sans">
            {/* 3D Map Header (Uber style) */}
            <div className="h-[40vh] relative shadow-lg">
                <MapLibreTracker
                    users={[]} // Could add couriers here
                    shops={[]}
                    warehouses={[]}
                    center={location ? [location.lng, location.lat] : undefined}
                />
                <div className="absolute top-4 left-4 right-4 z-10">
                    <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl flex items-center gap-3 border border-white/50">
                        <Search className="text-stone-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search traditional food..."
                            className="bg-transparent border-none outline-none w-full text-sm font-medium"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 -mt-10 relative z-20 bg-stone-50 rounded-t-[3rem] shadow-2xl overflow-y-auto">
                <div className="max-w-4xl mx-auto space-y-8">

                    {/* Active Orders */}
                    {activeOrders.length > 0 && (
                        <div className="bg-uzum-primary text-white p-6 rounded-[2rem] shadow-xl shadow-uzum-primary/30">
                            <h2 className="text-xl font-black flex items-center gap-2 mb-4">
                                <Clock size={24} /> В пути
                            </h2>
                            {activeOrders.map(o => (
                                <div key={o.id} className="flex justify-between items-center bg-white/10 p-4 rounded-xl mb-2 backdrop-blur-sm">
                                    <div>
                                        <p className="font-bold">Заказ #{o.id}</p>
                                        <p className="text-xs opacity-80">{o.status === 'assigned' ? 'AI диспетчер ищет курьера...' : 'Курьер уже в пути!'}</p>
                                    </div>
                                    <div className="bg-white text-uzum-primary px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest">
                                        Track
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Product List */}
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-3xl font-black text-stone-800 tracking-tighter">Traditional Menu</h1>
                            <button onClick={() => setShowCart(true)} className="relative p-3 bg-white rounded-2xl shadow-sm border border-stone-100 text-stone-800">
                                <ShoppingCart size={24} />
                                {cart.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-uzum-secondary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-stone-50">
                                        {cart.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                            {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(product => (
                                <motion.div
                                    whileHover={{ y: -5 }}
                                    key={product.id}
                                    className="bg-white p-4 rounded-[2.5rem] shadow-sm border border-stone-100"
                                >
                                    <div className="aspect-square rounded-[2rem] overflow-hidden mb-4 shadow-inner bg-stone-100">
                                        <img src={product.image || "https://picsum.photos/seed/food/300/300"} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <h3 className="font-bold text-stone-800 mb-1">{product.name}</h3>
                                    <div className="flex justify-between items-center">
                                        <p className="text-uzum-primary font-black">{product.price.toLocaleString()} сум</p>
                                        <button
                                            onClick={() => addToCart(product)}
                                            className="p-2 bg-stone-50 text-stone-400 rounded-xl hover:bg-uzum-primary hover:text-white transition-all shadow-sm"
                                        >
                                            +
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Cart Modal */}
            <AnimatePresence>
                {showCart && (
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-50 bg-white p-8 flex flex-col rounded-t-[4rem] shadow-[0_-20px_50px_rgba(0,0,0,0.1)]"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-black text-stone-800">Your Cart</h2>
                            <button onClick={() => setShowCart(false)} className="text-stone-400 font-bold p-2">Close</button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4">
                            {cart.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 bg-stone-50 p-4 rounded-3xl">
                                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-stone-200">
                                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-stone-800">{item.name}</p>
                                        <p className="text-uzum-primary font-black">{item.price.toLocaleString()} сум</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-8 border-t border-stone-100 mt-auto">
                            <div className="flex justify-between mb-6">
                                <p className="text-xl font-bold text-stone-400">Total</p>
                                <p className="text-3xl font-black text-stone-800">
                                    {cart.reduce((s, i) => s + i.price, 0).toLocaleString()} <span className="text-sm">сум</span>
                                </p>
                            </div>
                            <button
                                onClick={handleCheckout}
                                className="w-full py-6 bg-uzum-primary text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-uzum-primary/30 active:scale-95 transition-all"
                            >
                                Place Order
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
