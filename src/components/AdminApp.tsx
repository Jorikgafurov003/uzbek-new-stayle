import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  LayoutDashboard, Package, ShoppingBag, Users, LogOut, 
  TrendingUp, CheckCircle, Truck, Plus, Trash2, Edit, X, Search, Image as ImageIcon, Play, User, MapPin, Sparkles, Upload, Settings as SettingsIcon, Volume2, List, CreditCard, Navigation, Bot, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Helper to update map center
const ChangeView = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};
import { AdminAI } from './AdminAI';
import { ConfirmDialog } from './ConfirmDialog';

import { apiFetch } from '../utils/api';



import { BUKHARA_CENTER } from '../context/DataContext';
import { courierIcon, agentIcon, storeIcon } from '../utils/MapIcons';

export const AdminApp: React.FC = () => {
  const { 
    products, categories, orders, stats, users, banners, settings, debts, systemErrors,
    insights, kpis, forecasts, healthLogs, securityAlerts,
    addProduct, updateProduct, deleteProduct, addCategory, deleteCategory, updateOrder, deleteOrder, deleteUser, updateUser, addBanner, updateBanner, deleteBanner, updateSettings, updateDebt, speak,
    deployUpdate, setCommission, fixSystemError, apiFetch, refreshData
  } = useData();
  const { logout, user: currentUser } = useAuth();
  const { register } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'users' | 'banners' | 'ai' | 'settings' | 'debts' | 'tracker' | 'kpi' | 'forecast' | 'health' | 'security' | 'deploy'>('dashboard');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddBanner, setShowAddBanner] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [selectedOrderForMap, setSelectedOrderForMap] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [userPhotoPreview, setUserPhotoPreview] = useState<string | null>(null);
  const [selectedUserForTrack, setSelectedUserForTrack] = useState<number | null>(null);
  const [userTrack, setUserTrack] = useState<[number, number][]>([]);

  const fetchUserTrack = async (userId: number) => {
    try {
      const response = await apiFetch(`/api/users/${userId}/history`);
      const data = await response.json();
      // Yandex Maps expects [lat, lng]
      setUserTrack(data.map((h: any) => [h.lat, h.lng]));
      setSelectedUserForTrack(userId);
    } catch (e) {
      console.error('Error fetching track:', e);
    }
  };
  const [lastOrderCount, setLastOrderCount] = useState(orders.length);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; onConfirm: () => void; title?: string; message?: string }>({ isOpen: false, onConfirm: () => {} });

  const handleConfirm = (onConfirm: () => void, title?: string, message?: string) => {
    setConfirmDialog({ isOpen: true, onConfirm, title, message });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'user' = 'product') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'product') {
          setImagePreview(reader.result as string);
        } else {
          setUserPhotoPreview(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const COLORS = ['#D4AF37', '#8B0000', '#F4D03F', '#9A7D0A'];

  const agents = users.filter(u => u.role === 'agent');
  const couriers = users.filter(u => u.role === 'courier');

  interface ProductSale {
    name: string;
    count: number;
    revenue: number;
  }

  // Calculate Top Products
  const productSales = orders.reduce((acc: { [key: string]: ProductSale }, order) => {
    order.items.forEach(item => {
      if (!acc[item.productId]) {
        acc[item.productId] = { name: item.productName, count: 0, revenue: 0 };
      }
      acc[item.productId].count += item.quantity;
      acc[item.productId].revenue += item.quantity * item.price;
    });
    return acc;
  }, {});

  const topProducts: ProductSale[] = (Object.values(productSales) as ProductSale[])
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-[#f2f4f7] flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-[#e2e5eb] p-4 flex justify-between items-center sticky top-0 z-30">
        <div>
          <h1 className="text-2xl font-black text-uzum-primary tracking-tighter">UZBECHKA</h1>
          <p className="text-[10px] font-black text-uzum-muted uppercase tracking-widest leading-none mt-1">{t('adminPanel')}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 pr-4 border-r border-stone-100">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-uzum-muted uppercase tracking-widest">Admin</span>
              <span className="text-xs font-bold text-stone-800">{currentUser?.name}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-stone-100 overflow-hidden border-2 border-white shadow-sm">
              {currentUser?.photo ? (
                <img src={currentUser.photo} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-400">
                  <User size={20} />
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-1 bg-uzum-bg p-1 rounded-xl">
            <button onClick={() => setLanguage('ru')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${language === 'ru' ? 'bg-uzum-primary text-white shadow-md' : 'text-uzum-muted'}`}>RU</button>
            <button onClick={() => setLanguage('uz')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${language === 'uz' ? 'bg-uzum-primary text-white shadow-md' : 'text-uzum-muted'}`}>UZ</button>
          </div>
          <button 
            onClick={logout}
            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
            title={t('signOut')}
          >
            <LogOut size={22} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 pb-24 overflow-y-auto">
        {activeTab === 'dashboard' && stats && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Miniature Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-[#e2e5eb] flex items-center gap-3">
                <div className="p-2 bg-uzum-primary/10 rounded-xl text-uzum-primary"><TrendingUp size={18} /></div>
                <div>
                  <p className="text-uzum-muted text-[10px] font-bold uppercase leading-none mb-1">{t('revenue')}</p>
                  <h3 className="text-sm font-bold truncate">{(stats?.revenue || 0).toLocaleString()}</h3>
                </div>
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-[#e2e5eb] flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-500"><ShoppingBag size={18} /></div>
                <div>
                  <p className="text-uzum-muted text-[10px] font-bold uppercase leading-none mb-1">{t('orders')}</p>
                  <h3 className="text-sm font-bold">{stats.orders}</h3>
                </div>
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-[#e2e5eb] flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-xl text-purple-500"><Users size={18} /></div>
                <div>
                  <p className="text-uzum-muted text-[10px] font-bold uppercase leading-none mb-1">{t('users')}</p>
                  <h3 className="text-sm font-bold">{stats.users}</h3>
                </div>
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-[#e2e5eb] flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-xl text-orange-500"><Package size={18} /></div>
                <div>
                  <p className="text-uzum-muted text-[10px] font-bold uppercase leading-none mb-1">{t('products')}</p>
                  <h3 className="text-sm font-bold">{products.length}</h3>
                </div>
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-[#e2e5eb] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-stone-100 shadow-sm">
                  <img src="https://picsum.photos/seed/debt-card/100/100" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <p className="text-uzum-muted text-[10px] font-bold uppercase leading-none mb-1">{t('debts')}</p>
                  <h3 className="text-sm font-bold">{debts.filter(d => d.status === 'pending').length}</h3>
                </div>
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-[#e2e5eb] flex items-center gap-3 cursor-pointer hover:border-uzum-primary transition-all" onClick={() => setActiveTab('ai')}>
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-stone-100 shadow-sm">
                  <img src="https://picsum.photos/seed/ai-brain/100/100" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <p className="text-uzum-muted text-[10px] font-bold uppercase leading-none mb-1">AI Director</p>
                  <h3 className="text-sm font-bold text-gold">Insights</h3>
                </div>
              </div>
            </div>

            {/* AI Director Recommendation Banner */}
            {insights.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gold/10 border border-gold/20 p-6 rounded-[2.5rem] flex items-center gap-6"
              >
                <div className="p-4 bg-gold text-white rounded-3xl shadow-lg shadow-gold/20">
                  <Bot size={32} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-gold-dark uppercase tracking-widest">AI Business Director Recommendation</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                      insights[0].risk_level === 'high' ? 'bg-red-500 text-white' :
                      insights[0].risk_level === 'medium' ? 'bg-orange-500 text-white' :
                      'bg-green-500 text-white'
                    }`}>
                      {insights[0].risk_level} Risk
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-stone-800 mb-1">{insights[0].summary}</h3>
                  <p className="text-sm text-stone-600 leading-relaxed">{insights[0].recommendation}</p>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Compact Chart */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 lg:col-span-1">
                <h4 className="text-xs font-bold text-stone-400 uppercase mb-4">Sales by Category</h4>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.salesByCategory}
                        innerRadius={35}
                        outerRadius={50}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.salesByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Compact Activity List */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 lg:col-span-2">
                <h4 className="text-xs font-bold text-stone-400 uppercase mb-4">Recent Activity</h4>
                <div className="space-y-3">
                  {orders.slice(0, 4).map(order => (
                    <div key={order.id} className="flex items-center gap-3 pb-2 border-b border-stone-50 last:border-0">
                      <div className="w-8 h-8 bg-stone-50 rounded-lg flex items-center justify-center text-stone-400">
                        <ShoppingBag size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">#{order.id} - {order.clientName}</p>
                        <p className="text-[10px] text-stone-400">{new Date(order.createdAt).toLocaleTimeString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gold-dark">{(order.totalPrice || 0).toLocaleString()} UZS</p>
                        <span className={`text-[8px] font-bold uppercase px-1 rounded ${
                          order.orderStatus === 'delivered' ? 'bg-green-100 text-green-600' : 'bg-gold/10 text-gold-dark'
                        }`}>
                          {order.orderStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Products Report */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest">Топ товары по продажам</h4>
                  <div className="p-2 bg-gold/10 text-gold rounded-xl">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                        index === 0 ? 'bg-gold text-white' : 
                        index === 1 ? 'bg-stone-200 text-stone-600' : 
                        index === 2 ? 'bg-orange-100 text-orange-600' : 
                        'bg-stone-50 text-stone-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-stone-800">{product.name}</p>
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{product.count} шт. продано</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-gold-dark">{(product.revenue || 0).toLocaleString()} UZS</p>
                        <div className="w-24 h-1.5 bg-stone-100 rounded-full mt-1 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(product.revenue / topProducts[0].revenue) * 100}%` }}
                            className="h-full bg-gold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {topProducts.length === 0 && (
                    <div className="text-center py-8 text-stone-400 italic text-sm">Нет данных о продажах</div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest">Продажи по категориям</h4>
                  <div className="p-2 bg-blue-50 text-blue-500 rounded-xl">
                    <List size={16} />
                  </div>
                </div>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.salesByCategory}>
                      <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        cursor={{ fill: '#f9fafb' }}
                      />
                      <Bar dataKey="value" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'products' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold tracking-tight">{t('products')}</h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowAddCategory(true)}
                  className="bg-white border border-stone-200 text-stone-600 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-sm hover:bg-stone-50 transition-all active:scale-95"
                >
                  <List size={18} /> {t('category')}
                </button>
                <button 
                  onClick={() => setShowAddProduct(true)}
                  className="gold-gradient text-white px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg hover:shadow-gold/20 transition-all active:scale-95"
                >
                  <Plus size={18} /> {t('addProduct')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map(product => (
                <div key={product.id} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-stone-100 relative group transition-all hover:shadow-xl hover:-translate-y-1">
                  {product.discountPrice && (
                    <div className="absolute top-4 left-4 bg-oriental-red text-white text-[9px] font-black px-3 py-1 rounded-full z-10 shadow-lg uppercase tracking-widest">
                      {t('discount')}
                    </div>
                  )}
                  
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                    <button 
                      onClick={() => {
                        deleteProduct(product.id);
                        speak(`Товар ${product.name} удален`);
                      }}
                      className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="h-48 overflow-hidden">
                    <img src={product.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  </div>

                  <div className="p-6">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-stone-800 text-lg tracking-tight truncate flex-1">{product.name}</h4>
                    </div>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-4">{product.categoryName}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        {product.discountPrice ? (
                          <>
                            <span className="text-stone-300 text-[10px] font-bold line-through uppercase">{(product.price || 0).toLocaleString()}</span>
                            <span className="text-oriental-red font-black text-lg">{(product.discountPrice || 0).toLocaleString()} <span className="text-[10px]">UZS</span></span>
                          </>
                        ) : (
                          <span className="text-gold-dark font-black text-lg">{(product.price || 0).toLocaleString()} <span className="text-[10px]">UZS</span></span>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Склад:</span>
                          <span className={`text-[10px] font-black ${product.stock && product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {product.stock || 0} шт
                          </span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => {
                          setImagePreview(product.image);
                          setEditingProduct(product);
                        }}
                        className="p-2 bg-stone-50 text-stone-400 rounded-xl hover:bg-gold/10 hover:text-gold transition-all"
                      >
                        <Edit size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'orders' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">{t('orders')}</h2>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-500 flex items-center gap-2">
                  Total: {orders.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {orders.map(order => (
                <motion.div 
                  layout
                  key={order.id} 
                  className="bg-white rounded-[2.5rem] shadow-sm border border-stone-100 overflow-hidden hover:shadow-xl transition-all group"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <div className="w-12 h-12 bg-stone-100 rounded-2xl overflow-hidden border-2 border-stone-50 flex-shrink-0">
                          {users.find(u => u.id === order.clientId)?.photo ? (
                            <img src={users.find(u => u.id === order.clientId)?.photo} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-300">
                              <User size={20} />
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-0.5">Заказ #{order.id}</span>
                          <h3 className="text-base font-bold text-stone-800 leading-tight">{order.clientName}</h3>
                          <p className="text-[10px] text-stone-400 font-medium flex items-center gap-1 mt-0.5">
                            <MapPin size={10} className="text-gold" /> {order.location}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button 
                          onClick={() => handleConfirm(() => {
                            deleteOrder(order.id);
                            speak(`Заказ номер ${order.id} удален`);
                          }, t('confirmDeleteOrder'), t('areYouSure'))}
                          className="p-2 bg-red-50 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                        >
                          <Trash2 size={16} />
                        </button>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          order.orderStatus === 'delivered' ? 'bg-green-100 text-green-600' :
                          order.orderStatus === 'cancelled' ? 'bg-red-100 text-red-600' :
                          'bg-gold/10 text-gold-dark'
                        }`}>
                          {order.orderStatus}
                        </span>
                      </div>
                    </div>

                    <div className="bg-stone-50 rounded-2xl p-4 space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="text-stone-500 font-medium">{item.quantity}x {item.productName}</span>
                          <span className="font-bold text-stone-800">{((item.price || 0) * (item.quantity || 0)).toLocaleString()} UZS</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-stone-200 flex justify-between items-center font-black text-gold-dark">
                        <span className="text-[10px] uppercase tracking-widest">Итого</span>
                        <span>{(order.totalPrice || 0).toLocaleString()} UZS</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">Статус оплаты</label>
                        <select 
                          className={`w-full text-[10px] font-bold uppercase px-3 py-2 rounded-xl outline-none border border-stone-100 cursor-pointer ${
                            order.paymentStatus === 'paid' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
                          }`}
                          value={order.paymentStatus}
                          onChange={(e) => {
                            updateOrder(order.id, { paymentStatus: e.target.value });
                            speak(`Статус оплаты заказа ${order.id} изменен на ${e.target.value === 'paid' ? 'оплачено' : 'ожидание'}`);
                          }}
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">Сборка</label>
                        <select 
                          className={`w-full text-[10px] font-bold uppercase px-3 py-2 rounded-xl outline-none border border-stone-100 cursor-pointer ${
                            order.collectionStatus === 'collected' ? 'bg-blue-50 text-blue-600' : 'bg-stone-50 text-stone-600'
                          }`}
                          value={order.collectionStatus}
                          onChange={(e) => {
                            updateOrder(order.id, { collectionStatus: e.target.value });
                            speak(`Статус сборки заказа ${order.id} изменен на ${e.target.value === 'collected' ? 'собрано' : 'в процессе'}`);
                          }}
                        >
                          <option value="pending">Pending</option>
                          <option value="collected">Collected</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">Агент</label>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-stone-100 overflow-hidden flex-shrink-0 border border-stone-200">
                            {order.agentId && users.find(u => u.id === order.agentId)?.photo ? (
                              <img src={users.find(u => u.id === order.agentId)?.photo} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-300">
                                <User size={14} />
                              </div>
                            )}
                          </div>
                          <select 
                            className="flex-1 text-[10px] font-bold p-2 rounded-xl border border-stone-100 outline-none bg-stone-50"
                            value={order.agentId || ''}
                            onChange={(e) => {
                            updateOrder(order.id, { agentId: e.target.value });
                            const agent = agents.find(a => a.id === Number(e.target.value));
                            speak(`Агент ${agent?.name || ''} назначен на заказ ${order.id}`);
                          }}
                          >
                            <option value="">Assign Agent</option>
                            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">Курьер</label>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-stone-100 overflow-hidden flex-shrink-0 border border-stone-200">
                            {order.courierId && users.find(u => u.id === order.courierId)?.photo ? (
                              <img src={users.find(u => u.id === order.courierId)?.photo} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-300">
                                <Truck size={14} />
                              </div>
                            )}
                          </div>
                          <select 
                            className="flex-1 text-[10px] font-bold p-2 rounded-xl border border-stone-100 outline-none bg-stone-50"
                            value={order.courierId || ''}
                            onChange={(e) => {
                            updateOrder(order.id, { courierId: e.target.value });
                            const courier = couriers.find(c => c.id === Number(e.target.value));
                            speak(`Курьер ${courier?.name || ''} назначен на заказ ${order.id}`);
                          }}
                          >
                            <option value="">Assign Courier</option>
                            {couriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-between items-center">
                      <span className="text-[10px] text-stone-400 font-medium">{new Date(order.createdAt).toLocaleString()}</span>
                      <div className="flex gap-2">
                        {order.latitude && order.longitude && (
                          <button 
                            onClick={() => setSelectedOrderForMap(order)}
                            className="p-2 bg-gold/10 text-gold rounded-xl hover:bg-gold hover:text-white transition-all"
                            title="View on Map"
                          >
                            <MapPin size={16} />
                          </button>
                        )}
                        <select 
                          className={`text-[10px] font-bold uppercase px-3 py-1 rounded-xl outline-none border border-stone-100 cursor-pointer ${
                            order.orderStatus === 'delivered' ? 'bg-green-50 text-green-600' :
                            order.orderStatus === 'cancelled' ? 'bg-red-50 text-red-600' :
                            'bg-gold/10 text-gold-dark'
                          }`}
                          value={order.orderStatus}
                          onChange={(e) => {
                            updateOrder(order.id, { orderStatus: e.target.value });
                            speak(`Статус заказа ${order.id} изменен на ${e.target.value}`);
                          }}
                        >
                          <option value="new">New</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="on_way">On Way</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">{t('users')}</h2>
              <button 
                onClick={() => setShowAddUser(true)}
                className="gold-gradient text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md"
              >
                <Plus size={20} /> {t('addUser')}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {users.map(u => (
                <div key={u.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100 flex flex-col items-center text-center relative group hover:shadow-xl transition-all overflow-hidden">
                  <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all z-10">
                    <button 
                      onClick={() => {
                        setUserPhotoPreview(u.photo || null);
                        setEditingUser(u);
                      }}
                      className="p-3 bg-white text-blue-500 rounded-2xl hover:bg-blue-500 hover:text-white transition-all shadow-lg border border-stone-100"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      disabled={u.id === currentUser?.id}
                      onClick={() => handleConfirm(() => {
                        deleteUser(u.id);
                        speak(`Пользователь ${u.name} удален`);
                      }, t('confirmDeleteUser'), t('areYouSure'))}
                      className="p-3 bg-white text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-lg border border-stone-100 disabled:opacity-30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="w-28 h-28 bg-stone-50 rounded-[2.5rem] flex items-center justify-center mb-5 text-stone-300 overflow-hidden border-4 border-white shadow-inner relative group/photo">
                    {u.photo ? (
                      <img src={u.photo} className="w-full h-full object-cover" />
                    ) : (
                      <User size={48} />
                    )}
                    <div className="absolute inset-0 bg-gold/20 opacity-0 group-hover/photo:opacity-100 transition-opacity" />
                    {/* Online Status Dot */}
                    <div className={`absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-white shadow-sm z-20 ${
                      u.lastSeen && (new Date().getTime() - new Date(u.lastSeen).getTime() < 60000) 
                      ? 'bg-green-500 animate-pulse' 
                      : 'bg-stone-300'
                    }`} />
                  </div>
                  
                  <h3 className="font-black text-stone-800 text-lg truncate w-full px-2 mb-1">{u.name}</h3>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-5">{u.phone}</p>
                  
                  <div className="flex flex-wrap justify-center gap-2 w-full">
                    <span className={`flex-1 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-sm border ${
                      u.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                      u.role === 'agent' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      u.role === 'courier' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                      'bg-stone-50 text-stone-500 border-stone-100'
                    }`}>
                      {u.role}
                    </span>
                    {u.carType && (
                      <span className="flex-1 py-2 bg-stone-50 text-stone-500 border border-stone-100 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-sm flex items-center justify-center gap-1">
                        <Truck size={12} /> {u.carType}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'banners' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">{t('banners')}</h2>
              <button 
                onClick={() => setShowAddBanner(true)}
                className="gold-gradient text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md"
              >
                <Plus size={20} /> {t('addBanner')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {banners.map(banner => (
                <div key={banner.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100">
                  <div className="relative h-40">
                    <img src={banner.imageUrl} className="w-full h-full object-cover" />
                    {banner.videoUrl && (
                      <div className="absolute top-2 right-2 bg-black/50 p-2 rounded-full text-white">
                        <Play size={16} fill="white" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold">{banner.title}</h4>
                        <button 
                          onClick={() => updateBanner(banner.id, { isActive: banner.isActive ? 0 : 1 })}
                          className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest transition-all ${
                            banner.isActive ? 'bg-green-100 text-green-600' : 'bg-stone-100 text-stone-400'
                          }`}
                        >
                          {banner.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                      <p className="text-xs text-stone-400">{banner.link || 'No link'}</p>
                    </div>
                    <button onClick={() => {
                      deleteBanner(banner.id);
                      speak(`Баннер ${banner.title} удален`);
                    }} className="text-red-400 hover:text-red-600 ml-4">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
        {activeTab === 'ai' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">AI Business Director</h2>
              <button 
                onClick={() => refreshData()}
                className="p-2 bg-white border border-stone-200 rounded-xl text-stone-400 hover:text-gold transition-all"
              >
                <TrendingUp size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AdminAI 
                  stats={stats} 
                  recentOrders={orders} 
                  products={products} 
                  users={users} 
                  insights={insights}
                  forecasts={forecasts}
                  kpis={kpis}
                />
              </div>
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100">
                  <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">AI Insights History</h4>
                  <div className="space-y-4">
                    {insights.map((insight, i) => (
                      <div key={i} className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold text-stone-400">{new Date(insight.created_at).toLocaleDateString()}</span>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                            insight.risk_level === 'high' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                          }`}>{insight.risk_level}</span>
                        </div>
                        <p className="text-xs font-bold text-stone-800 mb-1">{insight.summary}</p>
                        <p className="text-[10px] text-stone-500 line-clamp-2">{insight.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'kpi' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-2xl font-bold">Employee KPI Leaderboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {['agent', 'courier'].map(role => (
                <div key={role} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100">
                  <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    {role === 'agent' ? <Users size={16} /> : <Truck size={16} />}
                    Top {role}s
                  </h4>
                  <div className="space-y-4">
                    {kpis.filter(k => k.role === role).map((kpi, i) => {
                      const u = users.find(user => user.id === kpi.user_id);
                      return (
                        <div key={i} className="flex items-center gap-4 p-3 hover:bg-stone-50 rounded-2xl transition-all">
                          <div className="w-10 h-10 rounded-xl bg-stone-100 overflow-hidden border border-stone-200">
                            {u?.photo ? <img src={u.photo} className="w-full h-full object-cover" /> : <User size={20} className="m-auto mt-2 text-stone-300" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-stone-800">{u?.name || 'Unknown'}</p>
                            <div className="flex items-center gap-2">
                              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                kpi.level === 'platinum' ? 'bg-blue-500 text-white' :
                                kpi.level === 'gold' ? 'bg-gold text-white' :
                                kpi.level === 'silver' ? 'bg-stone-400 text-white' :
                                'bg-orange-400 text-white'
                              }`}>{kpi.level}</span>
                              <span className="text-[10px] text-stone-400 font-bold">Score: {kpi.score}</span>
                            </div>
                          </div>
                          {role === 'agent' && (
                            <div className="text-right">
                              <button 
                                onClick={() => {
                                  const p = prompt("Enter commission %", "5");
                                  if (p) setCommission(kpi.user_id, Number(p));
                                }}
                                className="text-[10px] font-black text-gold hover:underline uppercase"
                              >
                                Set %
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'forecast' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-2xl font-bold">AI Profit Forecast (Next 30 Days)</h2>
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecasts}>
                    <XAxis dataKey="date" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="expected_revenue" fill="#D4AF37" radius={[4, 4, 0, 0]} name="Expected Revenue" />
                    <Bar dataKey="expected_orders" fill="#8B0000" radius={[4, 4, 0, 0]} name="Expected Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-stone-50 rounded-3xl border border-stone-100">
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Total Expected Revenue</p>
                  <h3 className="text-xl font-black text-gold-dark">
                    {(forecasts.reduce((sum, f) => sum + (f.expected_revenue || 0), 0)).toLocaleString()} UZS
                  </h3>
                </div>
                <div className="p-6 bg-stone-50 rounded-3xl border border-stone-100">
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Avg Confidence</p>
                  <h3 className="text-xl font-black text-stone-800">
                    {(forecasts.reduce((sum, f) => sum + f.confidence, 0) / (forecasts.length || 1)).toFixed(1)}%
                  </h3>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'health' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">System Health & Monitoring</h2>
              <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 ${
                healthLogs.some(l => l.status === 'error') ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
              }`}>
                {healthLogs.some(l => l.status === 'error') ? 'System Warning' : 'System Healthy'}
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100">
                <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-6">Recent Health Logs</h4>
                <div className="space-y-4">
                  {healthLogs.map((log, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl">
                      <div className={`p-2 rounded-xl ${
                        log.status === 'ok' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        <CheckCircle size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-stone-800">{log.component}</p>
                        <p className="text-[10px] text-stone-500">{log.details}</p>
                      </div>
                      <span className="text-[10px] font-bold text-stone-400">{new Date(log.created_at).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100">
                <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-6">Critical Errors</h4>
                <div className="space-y-4">
                  {systemErrors.filter(e => !e.fixed).map((err, i) => (
                    <div key={i} className="p-4 border border-red-100 bg-red-50/30 rounded-2xl">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black text-red-500 uppercase">{err.route}</span>
                        <button 
                          onClick={() => fixSystemError(err.id)}
                          className="text-[10px] font-black text-blue-500 hover:underline uppercase"
                        >
                          Mark Fixed
                        </button>
                      </div>
                      <p className="text-xs font-bold text-stone-800">{err.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-2xl font-bold">AI Security Analyzer</h2>
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100">
              <div className="space-y-4">
                {securityAlerts.map((alert, i) => (
                  <div key={i} className={`p-6 rounded-3xl border flex items-center gap-6 ${
                    alert.severity === 'high' ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'
                  }`}>
                    <div className={`p-4 rounded-2xl ${
                      alert.severity === 'high' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                    }`}>
                      <AlertCircle size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{alert.type}</span>
                        <span className="text-[10px] font-bold opacity-40">{new Date(alert.created_at).toLocaleString()}</span>
                      </div>
                      <h4 className="text-lg font-bold text-stone-800 mb-1">{alert.details}</h4>
                      <p className="text-sm text-stone-600">Affected User ID: {alert.user_id || 'N/A'}</p>
                    </div>
                    <button className="px-6 py-2 bg-white border border-stone-200 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-stone-50 transition-all">
                      Investigate
                    </button>
                  </div>
                ))}
                {securityAlerts.length === 0 && (
                  <div className="text-center py-20">
                    <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                    <h3 className="text-xl font-bold text-stone-800">No Security Threats Detected</h3>
                    <p className="text-stone-500">AI Security Analyzer is monitoring the system in real-time.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'deploy' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-2xl font-bold">DevOps AI: Deployment Control</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100">
                <Bot size={48} className="text-gold mb-6" />
                <h3 className="text-xl font-bold text-stone-800 mb-2">Auto-Deploy VPS</h3>
                <p className="text-stone-500 text-sm mb-8 leading-relaxed">
                  Our AI DevOps engine can automatically generate Docker configurations, Nginx rules, and deployment scripts for your VPS.
                </p>
                <button 
                  onClick={() => deployUpdate()}
                  className="w-full gold-gradient text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-gold/20 flex items-center justify-center gap-3"
                >
                  <Play size={18} /> Generate & Update Deploy Files
                </button>
              </div>
              
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100">
                <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-6">Infrastructure Status</h4>
                <div className="space-y-4">
                  {[
                    { label: 'Docker Engine', status: 'Running' },
                    { label: 'PostgreSQL Pool', status: 'Connected' },
                    { label: 'Nginx Proxy', status: 'Active' },
                    { label: 'SSL Certificate', status: 'Valid' }
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-stone-50 rounded-2xl border border-stone-100">
                      <span className="text-sm font-bold text-stone-600">{item.label}</span>
                      <span className="text-[10px] font-black text-green-600 uppercase bg-green-100 px-2 py-1 rounded-lg">{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-2xl font-bold">{t('settings')}</h2>
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-stone-100 max-w-2xl">
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const updates: any = Object.fromEntries(formData.entries());
                // Handle checkbox
                updates.voice_enabled = formData.get('voice_enabled') === 'on' ? 'true' : 'false';
                handleConfirm(async () => {
                  await updateSettings(updates);
                  speak("Настройки успешно сохранены");
                  alert('Settings saved!');
                });
              }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('appName')}</label>
                    <input name="app_name" defaultValue={settings.app_name} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('contactPhone')}</label>
                    <input name="contact_phone" defaultValue={settings.contact_phone} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('deliveryFee')}</label>
                    <input name="delivery_fee" type="number" defaultValue={settings.delivery_fee} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('minOrderAmount')}</label>
                    <input name="min_order" type="number" defaultValue={settings.min_order} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Click Card</label>
                    <input name="click_card" defaultValue={settings.click_card} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Payme Card</label>
                    <input name="payme_card" defaultValue={settings.payme_card} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Uzum Nasiya Card</label>
                    <input name="uzum_nasiya_card" defaultValue={settings.uzum_nasiya_card} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Admin Card (Receive Payments)</label>
                    <input name="admin_card" defaultValue={settings.admin_card} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('address')}</label>
                    <input name="address" defaultValue={settings.address} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>

                <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <div className="p-2 bg-gold/10 text-gold rounded-xl">
                    <Volume2 size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-stone-800">{t('voiceNotifications')}</h4>
                    <p className="text-[10px] text-stone-400 uppercase font-black tracking-widest">Озвучка новых заказов</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="voice_enabled" 
                      defaultChecked={settings.voice_enabled === 'true'} 
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                  </label>
                </div>
                
                <div className="pt-4">
                  <button type="submit" className="w-full gold-gradient text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-xl hover:shadow-gold/30 transition-all active:scale-95">
                    {t('saveSettings')}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {activeTab === 'debts' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-2xl font-bold">{t('debts')}</h2>
            <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 border-b">
                    <tr>
                      <th className="p-4 text-xs font-bold text-stone-400 uppercase">{t('client')}</th>
                      <th className="p-4 text-xs font-bold text-stone-400 uppercase">Ответственный</th>
                      <th className="p-4 text-xs font-bold text-stone-400 uppercase">{t('debtAmount')}</th>
                      <th className="p-4 text-xs font-bold text-stone-400 uppercase">{t('dueDate')}</th>
                      <th className="p-4 text-xs font-bold text-stone-400 uppercase">{t('status')}</th>
                      <th className="p-4 text-xs font-bold text-stone-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                      {debts.map(debt => (
                        <tr key={debt.id} className="hover:bg-stone-50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-stone-100 overflow-hidden border border-stone-200 flex-shrink-0">
                                {debt.clientPhoto ? (
                                  <img src={debt.clientPhoto} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-stone-400">
                                    <User size={16} />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-bold">{debt.clientName}</p>
                                <p className="text-xs text-stone-400">{debt.clientPhone}</p>
                              </div>
                            </div>
                          </td>
                        <td className="p-4">
                          {debt.courierName ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[9px] font-black uppercase rounded-md border border-orange-100">Курьер</span>
                              <span className="text-xs font-bold text-stone-600">{debt.courierName}</span>
                            </div>
                          ) : debt.agentName ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase rounded-md border border-blue-100">Агент</span>
                              <span className="text-xs font-bold text-stone-600">{debt.agentName}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-stone-400">-</span>
                          )}
                        </td>
                        <td className="p-4 font-bold text-red-500">{(debt.amount || 0).toLocaleString()} UZS</td>
                        <td className="p-4 text-xs font-medium">{debt.dueDate ? new Date(debt.dueDate).toLocaleDateString() : '-'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                            debt.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                          }`}>
                            {debt.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {debt.status === 'pending' && (
                            <button 
                              onClick={() => handleConfirm(() => updateDebt(debt.id, { status: 'paid' }), t('repay'), t('repayConfirm'))}
                              className="px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-bold shadow-md hover:bg-green-600 transition-all"
                            >
                              {t('repay')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'tracker' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-2xl font-bold">{t('tracker')}</h2>
            <div className="bg-white rounded-[2.5rem] p-4 shadow-sm border border-stone-100 h-[600px] relative overflow-hidden">
              <MapContainer 
                center={BUKHARA_CENTER} 
                zoom={13} 
                className="rounded-3xl overflow-hidden h-full w-full z-0"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {/* Store Marker */}
                <Marker position={BUKHARA_CENTER} icon={storeIcon}>
                  <Popup>
                    <div className="font-bold">{t('store')}</div>
                    <div className="text-xs text-stone-500">{settings.address || 'Bukhara, Uzbekistan'}</div>
                  </Popup>
                </Marker>

                {users.filter(u => (u.role === 'agent' || u.role === 'courier') && u.lat != null && u.lng != null).map(u => {
                  const currentOrder = orders.find(o => o.courierId === u.id && (o.orderStatus === 'on_way' || o.orderStatus === 'confirmed'));
                  const isOnline = u.lastSeen && (new Date().getTime() - new Date(u.lastSeen).getTime() < 60000);
                  const icon = u.role === 'agent' ? agentIcon : courierIcon;

                  return (
                    <Marker 
                      key={u.id}
                      position={[Number(u.lat), Number(u.lng)]}
                      icon={icon}
                      eventHandlers={{
                        click: () => fetchUserTrack(u.id),
                      }}
                    >
                      <Popup>
                        <div style={{ padding: '5px', minWidth: '150px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <div className="relative">
                              <img src={u.photo || 'https://picsum.photos/seed/user/50/50'} style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />
                              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-stone-300'}`}></div>
                            </div>
                            <div>
                              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{u.name}</div>
                              <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>
                                {u.role === 'agent' ? t('agent') : t('courier')} • {isOnline ? 'Online' : 'Offline'}
                              </div>
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', marginBottom: '4px' }}><b>{t('phone')}:</b> {u.phone}</div>
                          {currentOrder ? (
                            <div style={{ fontSize: '12px', color: '#7000ff' }}><b>Заказ:</b> #{currentOrder.id} ({currentOrder.orderStatus})</div>
                          ) : (
                            <div style={{ fontSize: '12px', color: '#888' }}>Свободен</div>
                          )}
                          <div style={{ fontSize: '10px', color: '#aaa', marginTop: '8px' }}>Последнее обновление: {u.lastSeen ? new Date(u.lastSeen).toLocaleTimeString() : 'Только что'}</div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
                {selectedUserForTrack && userTrack.length > 0 && (
                  <Polyline
                    positions={userTrack}
                    pathOptions={{ color: '#D4AF37', weight: 4, opacity: 0.8 }}
                  />
                )}
              </MapContainer>
              
              <div className="absolute top-8 right-8 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/20 space-y-3">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Легенда</h4>
                  <span className="bg-gold/10 text-gold text-[9px] px-2 py-0.5 rounded-full font-black">
                    {users.filter(u => (u.role === 'agent' || u.role === 'courier') && u.lat != null && u.lng != null).length} в сети
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>{t('agent')}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span>{t('courier')}</span>
                </div>
                {selectedUserForTrack && (
                  <button 
                    onClick={() => { setSelectedUserForTrack(null); setUserTrack([]); }}
                    className="w-full mt-2 py-2 bg-stone-100 text-stone-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-stone-200 transition-all"
                  >
                    Скрыть трек
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e2e5eb] px-2 py-2 flex justify-around items-center z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] overflow-x-auto no-scrollbar">
        {[
          { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: t('dashboard') },
          { id: 'products', icon: <Package size={20} />, label: t('products') },
          { id: 'orders', icon: <ShoppingBag size={20} />, label: t('orders') },
          { id: 'ai', icon: <Bot size={20} />, label: 'AI' },
          { id: 'kpi', icon: <TrendingUp size={20} />, label: 'KPI' },
          { id: 'forecast', icon: <TrendingUp size={20} />, label: 'Forecast' },
          { id: 'health', icon: <CheckCircle size={20} />, label: 'Health' },
          { id: 'security', icon: <AlertCircle size={20} />, label: 'Security' },
          { id: 'deploy', icon: <Play size={20} />, label: 'Deploy' },
          { id: 'tracker', icon: <Navigation size={20} />, label: t('tracker') },
          { id: 'users', icon: <Users size={20} />, label: t('users') },
          { id: 'settings', icon: <SettingsIcon size={20} />, label: t('settings') },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col items-center gap-1 min-w-[60px] transition-all ${
              activeTab === item.id ? 'text-uzum-primary scale-110' : 'text-uzum-muted opacity-60'
            }`}
          >
            <div className={`p-2 rounded-xl ${activeTab === item.id ? 'bg-uzum-primary/10' : ''}`}>
              {item.icon}
            </div>
            <span className="text-[8px] font-black uppercase tracking-tighter whitespace-nowrap">{item.label}</span>
          </button>
        ))}
      </nav>

      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
      />

      {/* Add Category Modal */}
      <AnimatePresence>
        {showAddCategory && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-stone-100"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{t('category')}</h3>
                <button onClick={() => setShowAddCategory(false)} className="text-stone-400"><X /></button>
              </div>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                await addCategory(name);
                speak(`Категория ${name} добавлена`);
                (e.target as HTMLFormElement).reset();
              }} className="flex gap-2 mb-6">
                <input name="name" required className="flex-1 p-3 rounded-xl border border-stone-200 outline-none focus:border-gold" placeholder="Название категории" />
                <button type="submit" className="p-3 bg-gold text-white rounded-xl shadow-md"><Plus size={20} /></button>
              </form>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {categories.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <span className="font-bold text-stone-700">{cat.name}</span>
                    <button 
                      onClick={() => {
                        deleteCategory(cat.id);
                        speak(`Категория ${cat.name} удалена`);
                      }}
                      className="p-1.5 text-red-400 hover:text-red-600 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddProduct && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl border border-stone-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-stone-800">{t('addProduct')}</h3>
                  <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">Новая позиция в меню</p>
                </div>
                <button onClick={() => { setShowAddProduct(false); setImagePreview(null); }} className="p-2 bg-stone-50 rounded-xl text-stone-400 hover:text-stone-800 transition-all"><X size={20} /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                await addProduct({
                  name,
                  price: Number(formData.get('price')),
                  discountPrice: formData.get('discountPrice') ? Number(formData.get('discountPrice')) : undefined,
                  categoryId: Number(formData.get('categoryId')),
                  description: formData.get('description') as string,
                  image: imagePreview || formData.get('imageUrl') as string || `https://picsum.photos/seed/${Math.random()}/400/300`,
                  videoUrl: formData.get('videoUrl') as string,
                  stock: Number(formData.get('stock'))
                });
                speak(`Товар ${name} успешно добавлен`);
                setShowAddProduct(false);
                setImagePreview(null);
              }} className="space-y-5">
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-stone-200 rounded-[2rem] bg-stone-50 hover:bg-stone-100 transition-all cursor-pointer relative overflow-hidden group h-48">
                  {imagePreview ? (
                    <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="text-stone-300 mb-2" size={40} />
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Загрузить фото блюда</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                  />
                  {imagePreview && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white text-xs font-bold uppercase tracking-widest">Сменить фото</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Image URL (Optional)</label>
                    <input name="imageUrl" placeholder="https://..." className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('name')}</label>
                    <input name="name" required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" placeholder="Название блюда" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('price')}</label>
                      <input name="price" type="number" required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('discount')}</label>
                      <input name="discountPrice" type="number" className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" placeholder="0" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Количество на складе</label>
                    <input name="stock" type="number" required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" placeholder="0" defaultValue={0} />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('category')}</label>
                    {categories.length > 0 ? (
                      <select name="categoryId" required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium appearance-none">
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    ) : (
                      <div className="p-4 bg-red-50 text-red-500 rounded-2xl text-xs font-bold">
                        Сначала добавьте категории!
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('video')} URL</label>
                    <input name="videoUrl" placeholder="https://youtube.com/..." className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('description')}</label>
                    <textarea name="description" className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium h-24 resize-none" placeholder="Описание блюда..." />
                  </div>
                </div>

                <button type="submit" className="w-full gold-gradient text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-xl hover:shadow-gold/30 transition-all active:scale-95 mt-4">
                  {t('save')}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Product Modal */}
      <AnimatePresence>
        {editingProduct && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl border border-stone-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-stone-800">{t('edit')}</h3>
                  <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">{editingProduct.name}</p>
                </div>
                <button onClick={() => { setEditingProduct(null); setImagePreview(null); }} className="p-2 bg-stone-50 rounded-xl text-stone-400 hover:text-stone-800 transition-all"><X size={20} /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                await updateProduct(editingProduct.id, {
                  name,
                  price: Number(formData.get('price')),
                  discountPrice: formData.get('discountPrice') ? Number(formData.get('discountPrice')) : undefined,
                  categoryId: Number(formData.get('categoryId')),
                  description: formData.get('description') as string,
                  image: imagePreview || formData.get('imageUrl') as string || editingProduct.image,
                  videoUrl: formData.get('videoUrl') as string,
                  stock: Number(formData.get('stock'))
                });
                speak(`Товар ${name} успешно обновлен`);
                setEditingProduct(null);
                setImagePreview(null);
              }} className="space-y-5">
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-stone-200 rounded-[2rem] bg-stone-50 hover:bg-stone-100 transition-all cursor-pointer relative overflow-hidden group h-48">
                  {imagePreview ? (
                    <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="text-stone-300 mb-2" size={40} />
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Загрузить фото блюда</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                  />
                  {imagePreview && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white text-xs font-bold uppercase tracking-widest">Сменить фото</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Image URL (Optional)</label>
                    <input name="imageUrl" defaultValue={editingProduct.image} placeholder="https://..." className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('name')}</label>
                    <input name="name" defaultValue={editingProduct.name} required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" placeholder="Название блюда" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('price')}</label>
                      <input name="price" type="number" defaultValue={editingProduct.price} required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('discount')}</label>
                      <input name="discountPrice" type="number" defaultValue={editingProduct.discountPrice} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" placeholder="0" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Количество на складе</label>
                    <input name="stock" type="number" required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" placeholder="0" defaultValue={editingProduct.stock || 0} />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('category')}</label>
                    <select name="categoryId" defaultValue={editingProduct.categoryId} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium appearance-none">
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('description')}</label>
                    <textarea name="description" defaultValue={editingProduct.description} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium h-24 resize-none" placeholder="Описание блюда..."></textarea>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Video URL (Optional)</label>
                    <input name="videoUrl" defaultValue={editingProduct.videoUrl} placeholder="https://youtube.com/..." className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                </div>
                <div className="pt-4">
                  <button type="submit" className="w-full gold-gradient text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-xl hover:shadow-gold/30 transition-all active:scale-95">
                    {t('save')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Banner Modal */}
      <AnimatePresence>
        {showAddBanner && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{t('addBanner')}</h3>
                <button onClick={() => { setShowAddBanner(false); setImagePreview(null); }} className="text-stone-400"><X /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const title = formData.get('title') as string;
                await addBanner({
                  title,
                  imageUrl: imagePreview || formData.get('imageUrl') as string || `https://picsum.photos/seed/${Math.random()}/800/400`,
                  videoUrl: formData.get('videoUrl') as string,
                  link: formData.get('link') as string,
                  isActive: formData.get('isActive') === 'on' ? 1 : 0
                });
                speak(`Баннер ${title} добавлен`);
                setShowAddBanner(false);
                setImagePreview(null);
              }} className="space-y-4">
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-stone-200 rounded-3xl bg-stone-50 hover:bg-stone-100 transition-all cursor-pointer relative overflow-hidden group h-32">
                  {imagePreview ? (
                    <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="text-stone-300 mb-2" size={32} />
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Загрузить баннер</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                  />
                  {imagePreview && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white text-[10px] font-bold uppercase tracking-widest">Сменить фото</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Title</label>
                  <input name="title" required className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Image URL (Optional)</label>
                  <input name="imageUrl" placeholder="https://..." className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Video URL (Optional)</label>
                  <input name="videoUrl" placeholder="https://..." className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Link (Optional)</label>
                  <input name="link" placeholder="/promo/1" className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:border-gold" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" name="isActive" id="isActive" defaultChecked className="w-4 h-4 accent-gold" />
                  <label htmlFor="isActive" className="text-xs font-bold text-stone-400 uppercase">Active by default</label>
                </div>
                <button type="submit" className="w-full gold-gradient text-white font-bold py-3 rounded-xl shadow-md">
                  {t('save')}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Map Modal */}
      <AnimatePresence>
        {selectedOrderForMap && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-2xl shadow-2xl border border-stone-100"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-stone-800">Локация заказа #{selectedOrderForMap.id}</h3>
                  <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">{selectedOrderForMap.clientName} • {selectedOrderForMap.location}</p>
                </div>
                <button onClick={() => setSelectedOrderForMap(null)} className="p-2 bg-stone-50 rounded-xl text-stone-400 hover:text-stone-800 transition-all"><X size={20} /></button>
              </div>
              
              <div className="rounded-3xl overflow-hidden border border-stone-100 h-[400px] relative shadow-inner">
                <MapContainer 
                  center={[selectedOrderForMap.latitude, selectedOrderForMap.longitude]} 
                  zoom={15} 
                  className="h-full w-full z-0"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[selectedOrderForMap.latitude, selectedOrderForMap.longitude]} />
                </MapContainer>
              </div>

              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setSelectedOrderForMap(null)}
                  className="px-8 py-3 bg-stone-100 text-stone-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-stone-200 transition-all"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit User Modal */}
      <AnimatePresence>
        {(showAddUser || editingUser) && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-stone-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-stone-800">{editingUser ? t('edit') : t('createAccount')}</h3>
                  <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">Управление доступом</p>
                </div>
                <button onClick={() => { setShowAddUser(false); setEditingUser(null); setUserPhotoPreview(null); }} className="p-2 bg-stone-50 rounded-xl text-stone-400 hover:text-stone-800 transition-all"><X size={20} /></button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  name: formData.get('name') as string,
                  phone: formData.get('phone') as string,
                  password: (formData.get('password') as string) || '123456',
                  role: formData.get('role') as string,
                  carType: formData.get('carType') as string,
                  carPhoto: formData.get('carPhoto') as string,
                  photo: userPhotoPreview || undefined
                };
                
                handleConfirm(async () => {
                  if (editingUser) {
                    await updateUser(editingUser.id, data);
                  } else {
                    await apiFetch('/api/auth/register', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(data),
                    });
                    await refreshData();
                  }
                  setShowAddUser(false);
                  setEditingUser(null);
                  setUserPhotoPreview(null);
                }, editingUser ? t('save') : t('createAccount'), t('areYouSure'));
              }} className="space-y-6">
                
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-stone-200 rounded-[2rem] bg-stone-50 hover:bg-stone-100 transition-all cursor-pointer relative overflow-hidden group h-32">
                  {userPhotoPreview ? (
                    <img src={userPhotoPreview} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="text-stone-300 mb-2" size={32} />
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Фото профиля</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleFileChange(e, 'user')}
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                  />
                  {userPhotoPreview && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white text-[10px] font-bold uppercase tracking-widest">Сменить фото</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('name')}</label>
                    <input name="name" defaultValue={editingUser?.name} required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('phone')}</label>
                    <input name="phone" defaultValue={editingUser?.phone} required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('password')}</label>
                    <input name="password" type="password" className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" placeholder={editingUser ? "Оставьте пустым для сохранения" : "Default: 123456"} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('role')}</label>
                    <select name="role" defaultValue={editingUser?.role || 'client'} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium appearance-none">
                      <option value="client">{t('client')}</option>
                      <option value="agent">{t('agent')}</option>
                      <option value="courier">{t('courier')}</option>
                      <option value="admin">{t('admin')}</option>
                    </select>
                  </div>
                  
                  {/* Car Details for Courier */}
                  <div className="space-y-4 pt-4 border-t border-stone-100">
                    <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Транспорт (для курьеров)</h4>
                    <select name="carType" defaultValue={editingUser?.carType || ''} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium appearance-none">
                      <option value="">Нет транспорта</option>
                      <option value="Damas Van">Damas Van</option>
                      <option value="Damas Labo">Damas Labo</option>
                      <option value="Other">Другое</option>
                    </select>
                    <input name="carPhoto" defaultValue={editingUser?.carPhoto || ''} placeholder="URL фото машины" className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                  </div>
                </div>

                <button type="submit" className="w-full gold-gradient text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-xl hover:shadow-gold/30 transition-all active:scale-95">
                  {editingUser ? t('save') : t('createAccount')}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
