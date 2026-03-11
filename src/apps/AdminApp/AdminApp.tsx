import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  LayoutDashboard, Package, ShoppingBag, Users, LogOut,
  TrendingUp, CheckCircle, Check, Truck, Plus, Trash2, Edit, X, Search, Image as ImageIcon, Play, User, MapPin, Sparkles, Upload, Settings as SettingsIcon, Volume2, List, CreditCard, Navigation, Bot, AlertCircle, Send, MessageSquare, Banknote, Calculator, Store, Archive, RotateCcw, Clock, Info, Wallet, ChevronRight, Star
} from 'lucide-react';
import { Debt } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Lazy loaded components
const AdminDebts = lazy(() => import('../../components/admin/AdminDebts').then(module => ({ default: module.AdminDebts })));
const AdminAccounting = lazy(() => import('../../components/admin/AdminAccounting').then(module => ({ default: module.AdminAccounting })));
const AdminShops = lazy(() => import('../../components/admin/AdminShops').then(module => ({ default: module.AdminShops })));
const AdminTracker = lazy(() => import('../../components/admin/AdminTracker').then(module => ({ default: module.AdminTracker })));

import { UserProfileMiniature } from '../../components/shared/UserProfileMiniature';


// Helper to update map center
const ChangeView = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};
import { AdminAI } from './AdminAI';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { MapLibreTracker } from '../../components/shared/MapLibreTracker';
import { AdminCalendar } from '../../components/admin/AdminCalendar';
import { apiFetch } from '../../utils/api';



const BUKHARA_CENTER: [number, number] = [39.7747, 64.4286];
const WAREHOUSE_LOCATION: [number, number] = [39.7750, 64.4300]; // Example warehouse location
import { courierIcon, agentIcon, storeIcon } from '../../utils/MapIcons';


const StarRating: React.FC<{ rating: number; count?: number; size?: number }> = ({ rating, count, size = 12 }) => {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            className={`${star <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-stone-200'}`}
          />
        ))}
      </div>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] font-bold text-stone-400">({count})</span>
      )}
    </div>
  );
};

const LocationPicker = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number, address?: string) => void }) => {
  const { apiFetch } = useData();
  const map = useMap();

  useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng;
      try {
        const res = await apiFetch(`/api/geocoding/reverse?lat=${lat}&lng=${lng}`);
        if (res.ok) {
          const data = await res.json();
          onLocationSelect(lat, lng, data.address);
        } else {
          onLocationSelect(lat, lng);
        }
      } catch (err) {
        onLocationSelect(lat, lng);
      }
    },
  });
  return null;
};


export const AdminApp: React.FC = () => {
  const {
    products, categories, orders, stats, users, banners, settings, debts, systemErrors, shops,
    insights, kpis, forecasts, healthLogs, securityAlerts, commissions, salaryConfigs, salaries, accounting, activityLogs, orderNotification, setOrderNotification, reviews,
    refreshData, addProduct, updateProduct, deleteProduct, addCategory, deleteCategory, createOrder, updateOrder, deleteOrder, deleteUser, updateUser,
    updateSalaryConfig, createSalary, payDebt, payPartialDebt, increaseDebt, updateDebt, deleteDebt,
    addBanner, addShop, updateShop, deleteShop, archiveShop, updateBanner, deleteBanner, updateSettings, addDebt, updateUserLocation, speak, playSound, fixSystemError, analyzeErrors,
    deployUpdate, setCommission, uploadProof, apiFetch, addExpense, deleteExpense,
    theme, setTheme, brandTheme, setBrandTheme
  } = useData();
  const { logout, user: currentUser } = useAuth();
  const { register } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'users' | 'shops' | 'banners' | 'ai' | 'settings' | 'debts' | 'tracker' | 'security' | 'deploy' | 'telegram' | 'salaries' | 'accounting' | 'warehouse' | 'reviews'>('dashboard');
  const [shopTab, setShopTab] = useState<'active' | 'archived'>('active');
  const [debtSubTab, setDebtSubTab] = useState<'list' | 'history'>('list');
  const [telegramMessage, setTelegramMessage] = useState('');
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [topStats, setTopStats] = useState<any>(null);

  const fetchTopStats = async () => {
    try {
      const res = await apiFetch('/api/admin/top-stats');
      const data = await res.json();
      setTopStats(data);
    } catch (e) {
      console.error('Error fetching top stats:', e);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchTopStats();
    }
  }, [activeTab]);

  // === LIVE CLOCK ===
  const [liveTime, setLiveTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // === WEATHER (wttr.in — no API key) ===
  const [weather, setWeather] = useState<{ temp: string; desc: string; icon: string } | null>(null);
  useEffect(() => {
    fetch('https://wttr.in/Bukhara?format=j1')
      .then(r => r.json())
      .then(d => {
        const cur = d.current_condition?.[0];
        if (cur) setWeather({
          temp: cur.temp_C,
          desc: cur.weatherDesc?.[0]?.value || '',
          icon: cur.weatherIconUrl?.[0]?.value || ''
        });
      })
      .catch(() => { });
  }, []);

  // === USD/UZS EXCHANGE RATE ===
  const [usdRate, setUsdRate] = useState<number | null>(null);
  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(d => {
        if (d?.rates?.UZS) setUsdRate(Math.round(d.rates.UZS));
      })
      .catch(() => { });
  }, []);

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddBanner, setShowAddBanner] = useState(false);
  const [showAddSalary, setShowAddSalary] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [selectedDebtForInfo, setSelectedDebtForInfo] = useState<Debt | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [selectedOrderForMap, setSelectedOrderForMap] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [bannerImages, setBannerImages] = useState<string[]>([]);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [userPhotoPreview, setUserPhotoPreview] = useState<string | null>(null);
  const [showAddShop, setShowAddShop] = useState(false);
  const [editingShop, setEditingShop] = useState<any>(null);
  const [newShopData, setNewShopData] = useState({ name: '', address: '', latitude: 39.7747, longitude: 64.4286, clientId: '', agentId: '' });
  const [selectedUserForTrack, setSelectedUserForTrack] = useState<number | null>(null);
  const [userTrack, setUserTrack] = useState<[number, number][]>([]);
  const [warehouseLocation, setWarehouseLocation] = useState({
    latitude: Number(settings.warehouse_lat) || 39.7747,
    longitude: Number(settings.warehouse_lng) || 64.4286,
    address: settings.address || ''
  });

  React.useEffect(() => {
    if (settings.warehouse_lat && settings.warehouse_lng) {
      setWarehouseLocation({
        latitude: Number(settings.warehouse_lat),
        longitude: Number(settings.warehouse_lng),
        address: settings.address || warehouseLocation.address
      });
    }
  }, [settings.warehouse_lat, settings.warehouse_lng]);

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

  const handleCreateShop = async () => {
    if (!newShopData.name || !newShopData.clientId) return;
    await addShop({
      ...newShopData,
      clientId: Number(newShopData.clientId),
      agentId: newShopData.agentId ? Number(newShopData.agentId) : undefined
    });
    setShowAddShop(false);
    setNewShopData({ name: '', address: '', latitude: 39.7747, longitude: 64.4286, clientId: '', agentId: '' });
    speak(`Магазин ${newShopData.name} добавлен`);
    refreshData();
  };

  const handleUpdateShop = async () => {
    if (!editingShop || !editingShop.name || !editingShop.clientId) return;
    await updateShop(editingShop.id, {
      ...editingShop,
      clientId: Number(editingShop.clientId),
      agentId: editingShop.agentId ? Number(editingShop.agentId) : null
    });
    setEditingShop(null);
    speak(`Магазин ${editingShop.name} обновлен`);
    refreshData();
  };

  const handleCreateDebt = async (debt: any) => {
    await addDebt(debt);
    setShowAddDebt(false);
    speak(`Долг для ${users.find(u => u.id === debt.clientId)?.name} создан`);
  };

  const [lastOrderCount, setLastOrderCount] = useState(orders.length);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; onConfirm: () => void; title?: string; message?: string }>({ isOpen: false, onConfirm: () => { } });

  const handleConfirm = (onConfirm: () => void, title?: string, message?: string) => {
    setConfirmDialog({ isOpen: true, onConfirm, title, message });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'user' | 'banner' = 'product') => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (type === 'product' || type === 'banner') {
        const newImages: string[] = type === 'product' ? [...productImages] : [...bannerImages];
        Array.from(files).forEach((file: File) => {
          if (newImages.length < 5) {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (reader.result) {
                newImages.push(reader.result as string);
                if (type === 'product') setProductImages([...newImages]);
                else {
                  setBannerImages([...newImages]);
                  if (newImages.length === 1) setImagePreview(newImages[0]);
                }
              }
            };
            reader.readAsDataURL(file);
          }
        });
      } else {
        const file = files[0] as File;
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            if (type === 'user') {
              setUserPhotoPreview(reader.result as string);
            }
          }
        };
        reader.readAsDataURL(file);
      }
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
    <div className={`min-h-screen flex flex-col font-sans transition-all duration-500 ${theme === 'futuristic' ? 'bg-[#050505] text-white' : 'bg-[#f2f4f7] text-uzum-text'}`}>
      {/* Top Header */}
      <header className={`p-4 flex justify-between items-center sticky top-0 z-30 border-b transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-[#e2e5eb]'}`}>
        <div>
          <h1 className={`text-2xl font-black tracking-tighter transition-all ${theme === 'futuristic' ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500' : 'text-uzum-primary'}`}>UZBECHKA</h1>
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
        {/* Banner Carousel - Visible on all tabs */}
        {banners.length > 0 && (
          <div className="mb-8 overflow-hidden rounded-[2.5rem] shadow-xl border border-white/20">
            <div className="flex animate-marquee whitespace-nowrap">
              {[...banners, ...banners].map((banner, idx) => (
                <div key={`${banner.id}-${idx}`} className="inline-block w-full md:w-[600px] h-48 relative flex-shrink-0 mr-4">
                  <img src={banner.imageUrl} className="absolute inset-0 w-full h-full object-cover rounded-[2.5rem]" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6 rounded-[2.5rem]">
                    <h3 className="text-white font-black text-lg uppercase tracking-wider">{banner.title}</h3>
                    {banner.link && (
                      <a href={banner.link} className="text-gold text-xs font-bold uppercase tracking-widest mt-1 hover:underline">
                        Подробнее →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'dashboard' && stats && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            {/* Row: Calendar + Time/Weather */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Calendar */}
              <div className="lg:col-span-5">
                <AdminCalendar theme={theme} />
              </div>

              {/* Live Time + Weather + USD */}
              <div className={`lg:col-span-7 p-8 rounded-[3.5rem] shadow-sm border flex flex-col justify-between transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}>
                {/* Digital Clock */}
                <div className="text-center mb-6">
                  <div className={`text-5xl md:text-6xl font-black tracking-tight tabular-nums ${theme === 'futuristic' ? 'text-cyan-400' : 'text-stone-800'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                  <p className={`text-sm font-semibold mt-2 capitalize ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>
                    {liveTime.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                {/* Weather + USD Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bukhara Weather */}
                  <div className={`p-5 rounded-2xl border flex items-center gap-4 ${theme === 'futuristic' ? 'bg-white/5 border-white/10' : 'bg-gradient-to-br from-sky-50 to-blue-50 border-sky-100'}`}>
                    {weather?.icon ? (
                      <img src={weather.icon} alt="weather" className="w-14 h-14" />
                    ) : (
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${theme === 'futuristic' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-sky-100 text-sky-500'}`}>☀️</div>
                    )}
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'futuristic' ? 'text-white/40' : 'text-sky-500'}`}>Бухара</p>
                      {weather ? (
                        <>
                          <p className={`text-2xl font-black ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{weather.temp}°C</p>
                          <p className={`text-[11px] font-medium ${theme === 'futuristic' ? 'text-white/50' : 'text-stone-500'}`}>{weather.desc}</p>
                        </>
                      ) : (
                        <p className={`text-sm font-medium ${theme === 'futuristic' ? 'text-white/30' : 'text-stone-300'}`}>Загрузка...</p>
                      )}
                    </div>
                  </div>

                  {/* USD/UZS Rate */}
                  <div className={`p-5 rounded-2xl border flex items-center gap-4 ${theme === 'futuristic' ? 'bg-white/5 border-white/10' : 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-100'}`}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black ${theme === 'futuristic' ? 'bg-green-500/10 text-green-400' : 'bg-emerald-100 text-emerald-600'}`}>$</div>
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'futuristic' ? 'text-white/40' : 'text-emerald-500'}`}>USD / UZS</p>
                      {usdRate ? (
                        <p className={`text-2xl font-black ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{usdRate.toLocaleString()}</p>
                      ) : (
                        <p className={`text-sm font-medium ${theme === 'futuristic' ? 'text-white/30' : 'text-stone-300'}`}>Загрузка...</p>
                      )}
                      <p className={`text-[11px] font-medium ${theme === 'futuristic' ? 'text-white/50' : 'text-stone-500'}`}>Курс ЦБ</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stat Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: t('revenue'), value: (stats?.revenue || 0).toLocaleString(), icon: <TrendingUp size={20} />, color: 'text-cyan-500', bg: theme === 'futuristic' ? 'bg-cyan-500/10' : 'bg-cyan-50', suffix: ' UZS' },
                { label: t('orders'), value: stats.orders, icon: <ShoppingBag size={20} />, color: 'text-blue-500', bg: theme === 'futuristic' ? 'bg-blue-500/10' : 'bg-blue-50' },
                { label: t('users'), value: stats.users, icon: <Users size={20} />, color: 'text-purple-500', bg: theme === 'futuristic' ? 'bg-purple-500/10' : 'bg-purple-50' },
                { label: t('products'), value: products.length, icon: <Package size={20} />, color: 'text-orange-500', bg: theme === 'futuristic' ? 'bg-orange-500/10' : 'bg-orange-50' },
                { label: t('debts'), value: debts.filter(d => d.status === 'pending').length, icon: <CreditCard size={20} />, color: 'text-red-500', bg: theme === 'futuristic' ? 'bg-red-500/10' : 'bg-red-50' },
                { label: 'System', value: healthLogs.some(l => l.status === 'error') ? 'Warning' : 'Healthy', icon: <CheckCircle size={20} />, color: healthLogs.some(l => l.status === 'error') ? 'text-red-500' : 'text-green-500', bg: healthLogs.some(l => l.status === 'error') ? (theme === 'futuristic' ? 'bg-red-500/10' : 'bg-red-50') : (theme === 'futuristic' ? 'bg-green-500/10' : 'bg-green-50') },
              ].map((item, i) => (
                <div key={i} className={`p-4 rounded-xl border flex flex-col gap-3 transition-all hover:shadow-md ${theme === 'futuristic'
                  ? 'bg-white/5 border-white/15 hover:border-white/30'
                  : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.bg} ${item.color}`}>
                    {item.icon}
                  </div>
                  <div>
                    <p className={`text-[11px] font-semibold uppercase tracking-wider mb-0.5 ${theme === 'futuristic' ? 'text-white/50' : 'text-gray-500'
                      }`}>{item.label}</p>
                    <h3 className={`text-xl font-black leading-tight ${theme === 'futuristic' ? 'text-white' : 'text-gray-900'
                      }`}>{item.value}<span className="text-sm font-medium">{item.suffix}</span></h3>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* AI Insights + Forecast - Spans 8 */}
              <div className="lg:col-span-8 space-y-5">
                {insights.length > 0 && (
                  <div className={`p-6 rounded-xl border flex flex-col md:flex-row items-start gap-5 ${theme === 'futuristic' ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-amber-50 border-amber-200'
                    }`}>
                    <div className={`p-4 rounded-xl flex-shrink-0 ${theme === 'futuristic' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-amber-400 text-white'
                      }`}>
                      <Bot size={32} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${theme === 'futuristic' ? 'text-cyan-400' : 'text-amber-700'
                          }`}>AI Business Director</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${insights[0].risk_level === 'high' ? 'bg-red-500 text-white' :
                          insights[0].risk_level === 'medium' ? 'bg-orange-400 text-white' : 'bg-green-500 text-white'
                          }`}>{insights[0].risk_level} Risk</span>
                      </div>
                      <h3 className={`text-lg font-bold mb-1 leading-snug ${theme === 'futuristic' ? 'text-white' : 'text-gray-900'
                        }`}>{insights[0].summary}</h3>
                      <p className={`text-sm leading-relaxed ${theme === 'futuristic' ? 'text-white/60' : 'text-gray-600'
                        }`}>{insights[0].recommendation}</p>
                    </div>
                  </div>
                )}

                {/* Forecast Chart */}
                <div className={`p-6 rounded-xl border ${theme === 'futuristic' ? 'bg-white/5 border-white/15' : 'bg-white border-gray-200'
                  }`}>
                  <div className="flex justify-between items-center mb-5">
                    <div>
                      <p className={`text-[11px] font-semibold uppercase tracking-wider mb-0.5 ${theme === 'futuristic' ? 'text-white/50' : 'text-gray-500'
                        }`}>AI Profit Forecast</p>
                      <p className={`text-lg font-bold ${theme === 'futuristic' ? 'text-white' : 'text-gray-900'
                        }`}>Следующие 30 дней</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${theme === 'futuristic' ? 'bg-cyan-500' : 'bg-amber-500'
                          }`} />
                        <span className="text-[10px] font-medium text-gray-400 uppercase">Выручка</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${theme === 'futuristic' ? 'bg-purple-500' : 'bg-gray-800'
                          }`} />
                        <span className="text-[10px] font-medium text-gray-400 uppercase">Заказы</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={forecasts}>
                        <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: theme === 'futuristic' ? '#ffffff50' : '#9ca3af' }} />
                        <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: theme === 'futuristic' ? '#ffffff50' : '#9ca3af' }} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '0.75rem',
                            border: `1px solid ${theme === 'futuristic' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                            backgroundColor: theme === 'futuristic' ? 'rgba(10,10,20,0.9)' : '#ffffff',
                            color: theme === 'futuristic' ? '#ffffff' : '#111827'
                          }}
                        />
                        <Bar dataKey="expected_revenue" fill={theme === 'futuristic' ? '#06b6d4' : '#f59e0b'} radius={[4, 4, 0, 0]} name="Ожидаемая выручка" />
                        <Bar dataKey="expected_orders" fill={theme === 'futuristic' ? '#a855f7' : '#374151'} radius={[4, 4, 0, 0]} name="Ожидаемые заказы" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Sidebar - Spans 4 */}
              <div className="lg:col-span-4 space-y-5">
                {/* Sales by Category Pie */}
                <div className={`p-6 rounded-xl border ${theme === 'futuristic' ? 'bg-white/5 border-white/15' : 'bg-white border-gray-200'
                  }`}>
                  <h4 className={`text-[11px] font-semibold uppercase tracking-wider mb-4 ${theme === 'futuristic' ? 'text-white/50' : 'text-gray-500'
                    }`}>Продажи по категориям</h4>
                  <div className="h-44 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.salesByCategory}
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={6}
                          dataKey="value"
                        >
                          {stats.salesByCategory.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: '0.75rem',
                            border: `1px solid ${theme === 'futuristic' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                            backgroundColor: theme === 'futuristic' ? 'rgba(10,10,20,0.9)' : '#ffffff',
                            color: theme === 'futuristic' ? '#ffffff' : '#111827'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className={`text-[10px] font-semibold uppercase ${theme === 'futuristic' ? 'text-white/40' : 'text-gray-400'
                        }`}>Всего</span>
                      <span className={`text-xl font-black ${theme === 'futuristic' ? 'text-white' : 'text-gray-900'
                        }`}>{stats.salesByCategory.length}</span>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {stats.salesByCategory.slice(0, 4).map((cat: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className={`text-[11px] font-medium truncate ${theme === 'futuristic' ? 'text-white/60' : 'text-gray-600'
                          }`}>{cat.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* System Status */}
                <div className={`p-6 rounded-xl border ${theme === 'futuristic' ? 'bg-white/5 border-white/15' : 'bg-gray-900 border-gray-700'
                  }`}>
                  <h4 className={`text-[11px] font-semibold uppercase tracking-wider mb-4 ${theme === 'futuristic' ? 'text-white/50' : 'text-gray-400'
                    }`}>System Health</h4>
                  <div className="space-y-3">
                    {healthLogs.slice(0, 3).map((log, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'ok' ? 'bg-green-400' : 'bg-red-400'
                          }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{log.component}</p>
                          <p className={`text-[9px] uppercase tracking-wide ${log.status === 'ok' ? 'text-green-400' : 'text-red-400'
                            }`}>{log.status === 'ok' ? 'Running' : 'Issue detected'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Top Performers & Debts button */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Top Performers - Spans 4 */}
              <div className="lg:col-span-4">
                <div className={`p-6 rounded-xl border h-full ${theme === 'futuristic' ? 'bg-white/5 border-white/15' : 'bg-white border-gray-200'
                  }`}>
                  <h4 className={`text-[11px] font-semibold uppercase tracking-wider mb-4 ${theme === 'futuristic' ? 'text-white/50' : 'text-gray-500'
                    }`}>Топ сотрудники</h4>
                  <div className="space-y-3">
                    {topStats?.topAgent && (
                      <div className={`flex items-center gap-3 p-3 rounded-lg border ${theme === 'futuristic' ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-blue-50 border-blue-100'
                        }`}>
                        <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                          <img src={topStats.topAgent.photo || 'https://picsum.photos/seed/agent/50/50'} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'futuristic' ? 'text-cyan-400' : 'text-blue-600'
                            }`}>Топ Агент</p>
                          <p className={`text-sm font-bold ${theme === 'futuristic' ? 'text-white' : 'text-gray-900'
                            }`}>{topStats.topAgent.name}</p>
                          <p className="text-[10px] text-gray-400">{topStats.topAgent.count} заказов</p>
                          <StarRating rating={topStats.topAgent.rating || 0} count={topStats.topAgent.ratingCount || 0} />
                        </div>
                      </div>
                    )}
                    {topStats?.topCourier && (
                      <div className={`flex items-center gap-3 p-3 rounded-lg border ${theme === 'futuristic' ? 'bg-purple-500/10 border-purple-500/20' : 'bg-orange-50 border-orange-100'
                        }`}>
                        <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                          <img src={topStats.topCourier.photo || 'https://picsum.photos/seed/courier/50/50'} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'futuristic' ? 'text-purple-400' : 'text-orange-600'
                            }`}>Топ Курьер</p>
                          <p className={`text-sm font-bold ${theme === 'futuristic' ? 'text-white' : 'text-gray-900'
                            }`}>{topStats.topCourier.name}</p>
                          <p className="text-[10px] text-gray-400">{topStats.topCourier.count} доставок</p>
                          <StarRating rating={topStats.topCourier.rating || 0} count={topStats.topCourier.ratingCount || 0} />
                        </div>
                      </div>
                    )}
                    {topStats?.topSeller && (
                      <div className={`flex items-center gap-3 p-3 rounded-lg border ${theme === 'futuristic' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-100'
                        }`}>
                        <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                          <img src={topStats.topSeller.image || 'https://picsum.photos/seed/product/50/50'} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'futuristic' ? 'text-amber-400' : 'text-amber-700'
                            }`}>Топ Товар</p>
                          <p className={`text-sm font-bold truncate ${theme === 'futuristic' ? 'text-white' : 'text-gray-900'
                            }`}>{topStats.topSeller.name}</p>
                          <p className="text-[10px] text-gray-400">{topStats.topSeller.count} продано</p>
                          <StarRating rating={topStats.topSeller.rating || 0} count={topStats.topSeller.ratingCount || 0} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Debts quick button - col 4 */}
              <div className="lg:col-span-2">
                <div
                  onClick={() => setActiveTab('debts')}
                  className={`h-full p-5 rounded-xl border cursor-pointer transition-all hover:scale-105 flex flex-col justify-between ${theme === 'futuristic'
                    ? 'bg-red-500/10 border-red-500/30 hover:border-red-400'
                    : 'bg-red-600 border-red-700 text-white'
                    }`}
                >
                  <Wallet size={24} className={theme === 'futuristic' ? 'text-red-400' : 'text-white/70'} />
                  <div>
                    <h3 className={`text-2xl font-black mb-0.5 ${theme === 'futuristic' ? 'text-red-400' : 'text-white'
                      }`}>{debts.filter(d => d.status === 'pending').length}</h3>
                    <p className={`text-xs font-semibold ${theme === 'futuristic' ? 'text-red-400/70' : 'text-white/80'
                      }`}>Долгов</p>
                  </div>
                </div>
              </div>

              {/* KPI Leaderboard - Spans 6 */}
              <div className={`lg:col-span-6 p-6 rounded-xl border ${theme === 'futuristic' ? 'bg-white/5 border-white/15' : 'bg-white border-gray-200'
                }`}>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className={`text-[11px] font-semibold uppercase tracking-wider mb-0.5 ${theme === 'futuristic' ? 'text-white/50' : 'text-gray-500'
                      }`}>Рейтинг</p>
                    <p className={`text-lg font-bold ${theme === 'futuristic' ? 'text-white' : 'text-gray-900'
                      }`}>Топ Сотрудники</p>
                  </div>
                  <Users size={18} className={theme === 'futuristic' ? 'text-white/30' : 'text-gray-400'} />
                </div>
                <div className="space-y-6">
                  {['agent', 'courier'].map(role => (
                    <div key={role} className="space-y-2">
                      <h5 className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'futuristic' ? 'text-white/40' : 'text-gray-400'
                        }`}>{role === 'agent' ? 'Агенты' : 'Курьеры'}</h5>
                      <div className="space-y-2">
                        {kpis.filter(k => k.role === role).slice(0, 3).map((kpi, i) => {
                          const u = users.find(user => user.id === kpi.user_id);
                          return (
                            <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${theme === 'futuristic' ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                              }`}>
                              <span className={`text-xs font-black w-5 text-center ${theme === 'futuristic' ? 'text-white/30' : 'text-gray-300'
                                }`}>{i + 1}</span>
                              <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                {u?.photo ? <img src={u.photo} className="w-full h-full object-cover" /> : <User size={16} className="m-auto mt-1.5 text-gray-400" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate ${theme === 'futuristic' ? 'text-white' : 'text-gray-900'
                                  }`}>{u?.name || 'Unknown'}</p>
                                <StarRating rating={u?.rating || 0} count={u?.ratingCount || 0} />
                              </div>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${kpi.level === 'platinum' ? 'bg-blue-500 text-white' :
                                kpi.level === 'gold' ? 'bg-amber-500 text-white' :
                                  kpi.level === 'silver' ? 'bg-gray-400 text-white' :
                                    'bg-orange-400 text-white'
                                }`}>{kpi.score}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Row: Recent Orders + Live Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Recent Orders - Spans 6 */}
              <div className={`lg:col-span-6 p-8 rounded-[3.5rem] shadow-sm border transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}>
                <h4 className={`text-xs font-black uppercase tracking-[0.2em] mb-8 ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>Recent Orders</h4>
                <div className="space-y-5">
                  {orders.slice(0, 5).map(order => (
                    <div key={order.id} className="flex items-center gap-4 group">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${theme === 'futuristic' ? 'bg-white/5 text-white/40 group-hover:bg-cyan-500/20 group-hover:text-cyan-400' : 'bg-stone-50 text-stone-400 group-hover:bg-gold/10 group-hover:text-gold'}`}>
                        <ShoppingBag size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>#{order.id} — {order.clientName}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${theme === 'futuristic' ? 'text-cyan-400' : 'text-gold-dark'}`}>{(order.totalPrice || 0).toLocaleString()} UZS</p>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${order.orderStatus === 'delivered' ? (theme === 'futuristic' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600') : (theme === 'futuristic' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-gold/10 text-gold-dark')
                          }`}>
                          {order.orderStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-time Activity Logs — Improved readability */}
              <div className={`lg:col-span-6 p-8 rounded-[3.5rem] shadow-sm border flex flex-col max-h-[500px] transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <h4 className={`text-xs font-black uppercase tracking-[0.2em] ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>Живая лента</h4>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${theme === 'futuristic' ? 'bg-cyan-500/10' : 'bg-green-50'}`}>
                      <div className={`w-2 h-2 rounded-full animate-pulse ${theme === 'futuristic' ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-green-500'}`}></div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${theme === 'futuristic' ? 'text-cyan-400' : 'text-green-600'}`}>Live</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold ${theme === 'futuristic' ? 'text-white/30' : 'text-stone-300'}`}>{activityLogs.length} событий</span>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-3" style={{ scrollbarWidth: 'thin' }}>
                  {activityLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-stone-300">
                      <Clock size={32} className="mb-2 opacity-20" />
                      <p className={`text-xs font-bold font-sans uppercase tracking-widest ${theme === 'futuristic' ? 'text-white/20' : 'text-stone-300'}`}>Нет активности</p>
                    </div>
                  ) : (
                    activityLogs.map((log, i) => {
                      const logRole = log.userRole || log.role || '';
                      const roleColor = logRole === 'agent'
                        ? { border: theme === 'futuristic' ? 'border-l-blue-400' : 'border-l-blue-500', icon: theme === 'futuristic' ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-500' }
                        : logRole === 'courier'
                          ? { border: theme === 'futuristic' ? 'border-l-purple-400' : 'border-l-purple-500', icon: theme === 'futuristic' ? 'bg-purple-500/15 text-purple-400' : 'bg-purple-50 text-purple-500' }
                          : { border: theme === 'futuristic' ? 'border-l-green-400' : 'border-l-green-500', icon: theme === 'futuristic' ? 'bg-green-500/15 text-green-400' : 'bg-green-50 text-green-500' };
                      return (
                        <div key={i} className={`flex gap-3 p-3 rounded-2xl border-l-[3px] transition-all hover:scale-[1.01] ${roleColor.border} ${theme === 'futuristic' ? 'bg-white/[0.03] hover:bg-white/[0.06]' : 'bg-stone-50/50 hover:bg-stone-50'}`}>
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${roleColor.icon}`}>
                            {logRole === 'agent' ? <User size={16} /> : logRole === 'courier' ? <Truck size={16} /> : <CheckCircle size={16} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[13px] leading-snug ${theme === 'futuristic' ? 'text-white/90' : 'text-stone-800'}`}>
                              <span className={`font-bold ${theme === 'futuristic' ? 'text-white' : 'text-stone-700'}`}>{log.userName || 'Система'}</span>
                              <span className={`font-medium ${theme === 'futuristic' ? 'text-white/60' : 'text-stone-600'}`}> {log.action}</span>
                            </p>
                            {log.details && <p className={`text-[11px] mt-1 leading-relaxed ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-500'}`}>{log.details}</p>}
                            <p className={`text-[9px] font-bold uppercase tracking-widest mt-1.5 ${theme === 'futuristic' ? 'text-cyan-400/70' : 'text-stone-400'}`}>
                              {new Date(log.createdAt || log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Row 4: Top Products & System Errors */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Top Products - Spans 6 */}
              <div className={`lg:col-span-6 p-8 rounded-[3.5rem] shadow-sm border transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}>
                <h4 className={`text-xs font-black uppercase tracking-[0.2em] mb-8 ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>Top Selling Products</h4>
                <div className="space-y-6">
                  {topProducts.map((product, index) => (
                    <div key={index} className="flex items-center gap-5">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm transition-all ${index === 0 ? (theme === 'futuristic' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20 neon-glow' : 'bg-gold text-white shadow-lg shadow-gold/20') :
                        index === 1 ? (theme === 'futuristic' ? 'bg-white/10 text-white/60' : 'bg-stone-200 text-stone-600') :
                          index === 2 ? (theme === 'futuristic' ? 'bg-purple-500/20 text-purple-400' : 'bg-orange-100 text-orange-600') :
                            (theme === 'futuristic' ? 'bg-white/5 text-white/40' : 'bg-stone-50 text-stone-400')
                        }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{product.name}</p>
                        <div className={`w-full h-1.5 rounded-full mt-2 overflow-hidden ${theme === 'futuristic' ? 'bg-white/5' : 'bg-stone-50'}`}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(product.revenue / topProducts[0].revenue) * 100}%` }}
                            className={`h-full ${theme === 'futuristic' ? 'bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-gold'}`}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{(product.revenue || 0).toLocaleString()}</p>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>{product.count} Sold</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Critical Errors - Spans 6 */}
              <div className={`lg:col-span-6 p-8 rounded-[3.5rem] shadow-sm border transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}>
                <div className="flex justify-between items-center mb-8">
                  <h4 className={`text-xs font-black uppercase tracking-[0.2em] ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>System Monitoring</h4>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${theme === 'futuristic' ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-500'}`}>
                    {systemErrors.filter(e => !e.fixed).length} Critical Errors
                  </span>
                </div>
                <div className="space-y-4">
                  {systemErrors.filter(e => !e.fixed).slice(0, 4).map((err, i) => (
                    <div key={i} className={`p-5 border rounded-[2rem] flex items-start gap-4 transition-all ${theme === 'futuristic' ? 'bg-white/5 border-white/10' : 'border-red-100 bg-red-50/20'}`}>
                      <div className={`p-3 rounded-2xl shadow-lg ${theme === 'futuristic' ? 'bg-red-500/20 text-red-400' : 'bg-red-500 text-white shadow-red-500/20'}`}>
                        <AlertCircle size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-[9px] font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-red-400' : 'text-red-500'}`}>{err.route}</span>
                          <button
                            onClick={() => fixSystemError(err.id)}
                            className="text-[9px] font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-widest transition-all"
                          >
                            Fix
                          </button>
                        </div>
                        <p className={`text-xs font-bold leading-relaxed ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{err.message}</p>
                      </div>
                    </div>
                  ))}
                  {systemErrors.filter(e => !e.fixed).length === 0 && (
                    <div className="text-center py-12">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${theme === 'futuristic' ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-500'}`}>
                        <CheckCircle size={32} />
                      </div>
                      <p className={`text-sm font-bold ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>No Critical Issues</p>
                      <p className={`text-[10px] uppercase tracking-widest mt-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>System is running optimally</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'products' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className={`text-2xl font-bold tracking-tight ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{t('products')}</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddCategory(true)}
                  className={`px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-sm transition-all active:scale-95 border ${theme === 'futuristic' ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                >
                  <List size={18} /> {t('category')}
                </button>
                <button
                  onClick={() => setShowAddProduct(true)}
                  className={`px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all active:scale-95 ${theme === 'futuristic' ? 'bg-cyan-500 text-white neon-glow' : 'gold-gradient text-white hover:shadow-gold/20'}`}
                >
                  <Plus size={18} /> {t('addProduct')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map(product => (
                <div key={product.id} className={`rounded-[2rem] overflow-hidden shadow-sm border relative group transition-all hover:shadow-xl hover:-translate-y-1 ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}>
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
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{product.categoryName}</p>
                      <StarRating rating={product.rating || 0} count={product.ratingCount || 0} />
                    </div>

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
                        {/* Stock removed as per user request, moved to Warehouse tab */}
                        <span className="text-stone-400 text-[10px] font-bold mt-1">Себестоимость: {(product.costPrice || 0).toLocaleString()} UZS</span>
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
              <h2 className={`text-2xl font-bold ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{t('orders')}</h2>
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-2 border ${theme === 'futuristic' ? 'bg-white/5 border-white/10 text-white/60' : 'bg-white border-stone-200 text-stone-500'}`}>
                  Total: {orders.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {orders.map(order => (
                <motion.div
                  layout
                  key={order.id}
                  className={`rounded-[2.5rem] shadow-sm border overflow-hidden hover:shadow-xl transition-all group ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}
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
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${order.orderStatus === 'delivered' ? 'bg-green-100 text-green-600' :
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
                          className={`w-full text-[10px] font-bold uppercase px-3 py-2 rounded-xl outline-none border border-stone-100 cursor-pointer ${order.paymentStatus === 'paid' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
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
                          className={`w-full text-[10px] font-bold uppercase px-3 py-2 rounded-xl outline-none border border-stone-100 cursor-pointer ${order.collectionStatus === 'collected' ? 'bg-blue-50 text-blue-600' : 'bg-stone-50 text-stone-600'
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

                    {order.invoicePhoto && (
                      <div className="mt-4">
                        <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block mb-2">Накладная (Фото)</label>
                        <div className="w-full h-32 rounded-2xl overflow-hidden border border-stone-100 relative group/img">
                          <img src={order.invoicePhoto} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-all flex items-center justify-center">
                            <button
                              onClick={() => window.open(order.invoicePhoto, '_blank')}
                              className="p-2 bg-white text-stone-800 rounded-full shadow-lg"
                            >
                              <ImageIcon size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

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
                          className={`text-[10px] font-bold uppercase px-3 py-1 rounded-xl outline-none border border-stone-100 cursor-pointer ${order.orderStatus === 'delivered' ? 'bg-green-50 text-green-600' :
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
                        <button
                          onClick={() => handleConfirm(() => {
                            deleteOrder(order.id);
                            speak(`Заказ ${order.id} удален`);
                          }, 'Удалить заказ', 'Вы уверены, что хотите удалить этот заказ? Это действие вернет товар на склад.')}
                          className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                          title="Delete Order"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'telegram' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className={`text-2xl font-bold ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>Telegram Ad Publisher</h2>
              <div className="flex gap-2">
                <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${theme === 'futuristic' ? 'bg-white/5 border-white/10 text-cyan-400' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                  <Bot size={14} />
                  AI Assistant Ready
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100">
                  <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <MessageSquare size={16} />
                    Compose Message
                  </h4>
                  <textarea
                    value={telegramMessage}
                    onChange={(e) => setTelegramMessage(e.target.value)}
                    placeholder="Enter your advertisement message here... (HTML tags supported)"
                    className="w-full h-64 p-6 bg-stone-50 border border-stone-100 rounded-3xl focus:ring-2 focus:ring-gold outline-none text-stone-800 font-medium resize-none"
                  />
                  <div className="mt-6 flex justify-between items-center">
                    <p className="text-[10px] text-stone-400 font-bold">
                      Supported tags: &lt;b&gt;, &lt;i&gt;, &lt;a&gt;, &lt;code&gt;
                    </p>
                    <button
                      onClick={async () => {
                        if (!telegramMessage.trim()) return;
                        setIsSendingTelegram(true);
                        try {
                          const res = await apiFetch('/api/telegram/send', {
                            method: 'POST',
                            body: JSON.stringify({ message: telegramMessage })
                          });
                          const data = await res.json();
                          if (data.ok) {
                            alert('Message sent successfully!');
                            setTelegramMessage('');
                          } else {
                            alert('Error: ' + (data.description || 'Unknown error'));
                          }
                        } catch (e) {
                          alert('Failed to send message');
                        } finally {
                          setIsSendingTelegram(false);
                        }
                      }}
                      disabled={isSendingTelegram || !telegramMessage.trim()}
                      className="px-8 py-4 bg-gold text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-gold-dark transition-all disabled:opacity-50"
                    >
                      {isSendingTelegram ? 'Sending...' : 'Publish to Channel'}
                      <Send size={16} />
                    </button>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100">
                  <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-6">Preview</h4>
                  <div className="p-6 bg-[#f0f2f5] rounded-3xl border border-stone-100 max-w-md mx-auto">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">U</div>
                      <div>
                        <p className="text-sm font-bold text-stone-800">Uzbechka Pro Channel</p>
                        <p className="text-[10px] text-stone-400">1,240 subscribers</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm text-sm text-stone-800 whitespace-pre-wrap min-h-[100px]">
                      {telegramMessage || 'Your message will appear here...'}
                    </div>
                    <div className="mt-2 text-[10px] text-stone-400 text-right">12:45 PM</div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100">
                  <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-6">Telegram Settings</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 block">Bot Token</label>
                      <input
                        type="password"
                        value={settings.telegram_bot_token || ''}
                        onChange={(e) => updateSettings({ telegram_bot_token: e.target.value })}
                        className="w-full p-3 bg-stone-50 border border-stone-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-gold"
                        placeholder="712345678:AA..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 block">Channel ID</label>
                      <input
                        type="text"
                        value={settings.telegram_chat_id || ''}
                        onChange={(e) => updateSettings({ telegram_chat_id: e.target.value })}
                        className="w-full p-3 bg-stone-50 border border-stone-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-gold"
                        placeholder="@uzbechka_channel"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl">
                  <Sparkles size={32} className="mb-4 text-blue-200" />
                  <h3 className="text-xl font-black mb-2">AI Copywriter</h3>
                  <p className="text-sm text-blue-100 mb-6 leading-relaxed">
                    Let AI generate high-converting ad copy for your Telegram channel based on current top products.
                  </p>
                  <button
                    onClick={() => {
                      const topProduct = products.sort((a, b) => (b.stock || 0) - (a.stock || 0))[0];
                      setTelegramMessage(`🔥 <b>HOT DEAL!</b> 🔥\n\nCheck out our <b>${topProduct?.name}</b>!\nOnly for <b>${topProduct?.price.toLocaleString()} UZS</b>.\n\n🚀 Order now in our app!`);
                    }}
                    className="w-full py-4 bg-white text-blue-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-all"
                  >
                    Generate Ad Copy
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className={`text-2xl font-bold ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{t('users')}</h2>
              <button
                onClick={() => setShowAddUser(true)}
                className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 ${theme === 'futuristic' ? 'bg-cyan-500 text-white neon-glow' : 'gold-gradient text-white'}`}
              >
                <Plus size={20} /> {t('addUser')}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {users.map(u => (
                <div key={u.id} className={`p-6 rounded-[2.5rem] shadow-sm border flex flex-col items-center text-center relative group hover:shadow-xl transition-all overflow-hidden ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}>
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
                    <div className={`absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-white shadow-sm z-20 ${u.lastSeen && (new Date().getTime() - new Date(u.lastSeen).getTime() < 60000)
                      ? 'bg-green-500 animate-pulse'
                      : 'bg-stone-300'
                      }`} />
                  </div>

                  <h3 className="font-black text-stone-800 text-lg truncate w-full px-2 mb-1">{u.name}</h3>
                  <div className="mb-4">
                    {(u.role === 'agent' || u.role === 'courier') && (
                      <StarRating rating={u.rating || 0} count={u.ratingCount || 0} size={14} />
                    )}
                  </div>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-5">{u.phone}</p>

                  <div className="flex flex-wrap justify-center gap-2 w-full">
                    <span className={`flex-1 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-sm border ${u.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' :
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

        {activeTab === 'warehouse' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className={`text-2xl font-bold ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>Складской учет</h2>
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-2 border ${theme === 'futuristic' ? 'bg-white/5 border-white/10 text-white/60' : 'bg-white border-stone-200 text-stone-500'}`}>
                  Товаров: {products.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
                {products.map(product => (
                  <div key={product.id} className={`p-6 rounded-[2.5rem] shadow-sm border flex items-center gap-4 transition-all hover:shadow-lg ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}>
                    <img src={product.image} className="w-16 h-16 rounded-2xl object-cover shadow-md" />
                    <div className="flex-1">
                      <h3 className={`font-bold ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{product.name}</h3>
                      <p className={`text-[10px] uppercase tracking-widest font-black ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>{categories.find(c => c.id === product.categoryId)?.name}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${product.stock <= 10 ? (theme === 'futuristic' ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-500') : (theme === 'futuristic' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-green-50 text-green-500')
                          }`}>
                          Остаток: {product.stock} {product.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`p-6 rounded-[2.5rem] shadow-sm border space-y-4 h-fit transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className={`text-sm font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white' : 'text-stone-900'}`}>Локация склада</h3>
                    <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>Точка отгрузки товаров</p>
                  </div>
                  <button
                    onClick={async () => {
                      await updateSettings({
                        warehouse_lat: warehouseLocation.latitude.toString(),
                        warehouse_lng: warehouseLocation.longitude.toString(),
                        address: warehouseLocation.address
                      });
                      speak("Координаты склада обновлены");
                      refreshData();
                    }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${theme === 'futuristic' ? 'bg-cyan-500 text-white neon-glow' : 'bg-stone-900 text-white hover:bg-gold'}`}
                  >
                    Сохранить
                  </button>
                </div>

                <div className="h-64 rounded-2xl overflow-hidden relative border border-stone-100 shadow-inner">
                  <MapContainer center={[warehouseLocation.latitude, warehouseLocation.longitude]} zoom={15} style={{ height: '100%', width: '100%' }}>
                    <ChangeView center={[warehouseLocation.latitude, warehouseLocation.longitude]} zoom={15} />
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[warehouseLocation.latitude, warehouseLocation.longitude]} icon={storeIcon} />
                    <LocationPicker onLocationSelect={(lat, lng, addr) => setWarehouseLocation({ latitude: lat, longitude: lng, address: addr || warehouseLocation.address })} />
                  </MapContainer>
                  <div className="absolute bottom-2 left-2 z-[1000] bg-white/90 backdrop-blur-sm p-2 rounded-lg text-[8px] font-black uppercase tracking-widest border border-stone-200">
                    Нажмите на карту для выбора
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">Текущий адрес отгрузки</label>
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 flex items-center gap-3">
                    <MapPin size={16} className="text-gold" />
                    <span className="text-xs font-bold text-stone-700">{warehouseLocation.address || 'Адрес не определен'}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'ai' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">AI Business Director</h2>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const errorsToFix = systemErrors.filter(e => e.status === 'pending');
                    for (const err of errorsToFix) {
                      await fixSystemError(err.id);
                    }
                    speak("Все системные ошибки исправлены автоматически");
                    refreshData();
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-md hover:bg-green-600 transition-all"
                >
                  <Sparkles size={18} /> Исправить все ошибки
                </button>
                <button
                  onClick={() => refreshData()}
                  className="p-2 bg-white border border-stone-200 rounded-xl text-stone-400 hover:text-gold transition-all"
                >
                  <TrendingUp size={20} />
                </button>
              </div>
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
                  theme={theme}
                />
              </div>
              <div className="space-y-6">
                <div className={`p-6 rounded-[2.5rem] shadow-sm border transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}>
                  <h4 className={`text-xs font-black uppercase tracking-widest mb-4 ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>AI Insights History</h4>
                  <div className="space-y-4">
                    {insights.map((insight, i) => (
                      <div key={i} className={`p-4 rounded-2xl border transition-all ${theme === 'futuristic' ? 'bg-white/5 border-white/5' : 'bg-stone-50 border-stone-100'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[10px] font-bold ${theme === 'futuristic' ? 'text-white/30' : 'text-stone-400'}`}>{new Date(insight.created_at).toLocaleDateString()}</span>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${insight.risk_level === 'high' ? (theme === 'futuristic' ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600') : (theme === 'futuristic' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600')
                            }`}>{insight.risk_level}</span>
                        </div>
                        <p className={`text-xs font-bold mb-1 ${theme === 'futuristic' ? 'text-white/90' : 'text-stone-800'}`}>{insight.summary}</p>
                        <p className={`text-[10px] line-clamp-2 ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-500'}`}>{insight.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-2xl font-bold">AI Security Analyzer</h2>
            <div className={`p-6 rounded-[2.5rem] shadow-sm border transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}>
              <div className="space-y-4">
                {securityAlerts.map((alert, i) => (
                  <div key={i} className={`p-6 rounded-3xl border flex items-center gap-6 transition-all ${alert.severity === 'high' ? (theme === 'futuristic' ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-100') : (theme === 'futuristic' ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-100')
                    }`}>
                    <div className={`p-4 rounded-2xl shadow-lg ${alert.severity === 'high' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                      }`}>
                      <AlertCircle size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest opacity-60 ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{alert.type}</span>
                        <span className={`text-[10px] font-bold opacity-40 ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{new Date(alert.created_at).toLocaleString()}</span>
                      </div>
                      <h4 className={`text-lg font-bold mb-1 ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{alert.details}</h4>
                      <p className={`text-sm ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-600'}`}>Affected User ID: {alert.user_id || 'N/A'}</p>
                    </div>
                    <button className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm transition-all border ${theme === 'futuristic' ? 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10' : 'bg-white border-stone-200 text-stone-800 hover:bg-stone-50'}`}>
                      Investigate
                    </button>
                  </div>
                ))}
                {securityAlerts.length === 0 && (
                  <div className="text-center py-20">
                    <CheckCircle size={48} className={`mx-auto mb-4 ${theme === 'futuristic' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'text-green-500'}`} />
                    <h3 className={`text-xl font-bold ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>No Security Threats Detected</h3>
                    <p className={`${theme === 'futuristic' ? 'text-white/40' : 'text-stone-500'}`}>AI Security Analyzer is monitoring the system in real-time.</p>
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

              <div className={`p-8 rounded-[2.5rem] shadow-sm border transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}>
                <h4 className={`text-xs font-black uppercase tracking-widest mb-6 ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>Infrastructure Status</h4>
                <div className="space-y-4">
                  {[
                    { label: 'Docker Engine', status: 'Running' },
                    { label: 'PostgreSQL Pool', status: 'Connected' },
                    { label: 'Nginx Proxy', status: 'Active' },
                    { label: 'SSL Certificate', status: 'Valid' }
                  ].map((item, i) => (
                    <div key={i} className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${theme === 'futuristic' ? 'bg-white/5 border-white/10' : 'bg-stone-50 border-stone-100'}`}>
                      <span className={`text-sm font-bold ${theme === 'futuristic' ? 'text-white/80' : 'text-stone-600'}`}>{item.label}</span>
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${theme === 'futuristic' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-green-100 text-green-600'}`}>{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'banners' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className={`text-2xl font-bold ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>Управление Баннерами</h2>
              <button
                onClick={() => { setShowAddBanner(true); setImagePreview(null); }}
                className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl transition-all active:scale-95 ${theme === 'futuristic' ? 'bg-cyan-500 text-white neon-glow' : 'gold-gradient text-white'}`}
              >
                <Plus size={20} /> Добавить Баннер
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {banners.map(banner => (
                <div key={banner.id} className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-stone-100 group">
                  <div className="relative h-48 overflow-hidden">
                    <img src={banner.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <button
                        onClick={() => { setEditingBanner(banner); setBannerImages(banner.images || []); setImagePreview(banner.imageUrl); }}
                        className="p-3 bg-white text-stone-800 rounded-xl hover:bg-gold hover:text-white transition-all"
                      >
                        <Edit size={20} />
                      </button>
                      <button
                        onClick={() => handleConfirm(() => deleteBanner(Number(banner.id)), t('delete'), t('areYouSure'))}
                        className="p-3 bg-white text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                    <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${banner.isActive ? 'bg-green-500 text-white' : 'bg-stone-500 text-white'
                      }`}>
                      {banner.isActive ? 'Активен' : 'Черновик'}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-lg text-stone-800 mb-1">{banner.title}</h3>
                    <p className="text-xs text-stone-400 font-medium truncate">{banner.link || 'Нет ссылки'}</p>
                  </div>
                </div>
              ))}
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

                <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${theme === 'futuristic' ? 'bg-white/5 border-white/10' : 'bg-stone-50 border-stone-100'}`}>
                  <div className={`p-2 rounded-xl ${theme === 'futuristic' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gold/10 text-gold'}`}>
                    <Sparkles size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-bold ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>Тема интерфейса</h4>
                    <p className={`text-[10px] uppercase font-black tracking-widest ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>Выберите стиль оформления</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${theme === 'light' ? 'bg-gold text-white shadow-lg shadow-gold/20' : (theme === 'futuristic' ? 'bg-white/5 text-white/40 border border-white/10' : 'bg-white text-stone-400 border border-stone-100')}`}
                    >
                      Light
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('futuristic')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${theme === 'futuristic' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20 neon-glow' : 'bg-white text-stone-400 border border-stone-100'}`}
                    >
                      Futuristic
                    </button>
                  </div>
                </div>

                <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${theme === 'futuristic' ? 'bg-white/5 border-white/10' : 'bg-stone-50 border-stone-100'}`}>
                  <div className={`p-2 rounded-xl ${theme === 'futuristic' ? 'bg-purple-500/20 text-purple-400' : 'bg-uzum-primary/10 text-uzum-primary'}`}>
                    <LayoutDashboard size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-bold ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>Бренд Маркетплейса</h4>
                    <p className={`text-[10px] uppercase font-black tracking-widest ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>Выберите стиль бренда</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBrandTheme('uzum')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${brandTheme === 'uzum' ? 'bg-uzum-primary text-white shadow-lg shadow-uzum-primary/20' : (theme === 'futuristic' ? 'bg-white/5 text-white/40 border border-white/10' : 'bg-white text-stone-400 border border-stone-100')}`}
                    >
                      Uzum
                    </button>
                    <button
                      type="button"
                      onClick={() => setBrandTheme('yandex')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${brandTheme === 'yandex' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : (theme === 'futuristic' ? 'bg-white/5 text-white/40 border border-white/10' : 'bg-white text-stone-400 border border-stone-100')}`}
                    >
                      Yandex
                    </button>
                    <button
                      type="button"
                      onClick={() => setBrandTheme('ozon')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${brandTheme === 'ozon' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : (theme === 'futuristic' ? 'bg-white/5 text-white/40 border border-white/10' : 'bg-white text-stone-400 border border-stone-100')}`}
                    >
                      Ozon
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <button type="submit" className={`w-full font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-xl transition-all active:scale-95 ${theme === 'futuristic' ? 'bg-cyan-500 text-white neon-glow' : 'gold-gradient text-white hover:shadow-gold/30'}`}>
                    {t('saveSettings')}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {
          activeTab === 'salaries' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Зарплаты и Управление Персоналом</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddSalary(true)}
                    className="gold-gradient text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md"
                  >
                    <Plus size={20} /> Выплатить Зарплату
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-sm font-black text-stone-400 uppercase tracking-widest">Конфигурация Сотрудников</h3>
                  {users.filter(u => u.role === 'agent' || u.role === 'courier').map(emp => {
                    const config = salaryConfigs.find(c => c.userId === emp.id) || { baseSalary: 0, commissionPercent: 5, workingDays: 22 };
                    const totalSales = orders.filter(o => (o.agentId === emp.id || o.courierId === emp.id) && o.paymentStatus === 'paid').reduce((s, o) => s + (o.totalPrice || 0), 0);
                    const commission = totalSales * (config.commissionPercent || 0) / 100;
                    const totalSalary = (config.baseSalary || 0) + commission;

                    return (
                      <div key={emp.id} className={`p-6 rounded-[2.5rem] shadow-sm border transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                          <div className="flex items-center gap-4">
                            <UserProfileMiniature user={emp} size={48} />
                            <div>
                              <h4 className={`font-bold ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{emp.name}</h4>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${emp.role === 'agent' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                                }`}>{emp.role}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-[10px] font-black uppercase tracking-widest block ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>Итого к выплате</span>
                            <span className={`text-xl font-black ${theme === 'futuristic' ? 'text-cyan-400' : 'text-gold-dark'}`}>{totalSalary.toLocaleString()} UZS</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div className="space-y-1">
                            <label className={`text-[9px] font-black uppercase tracking-widest block ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>Оклад (Фикс)</label>
                            <input
                              type="number"
                              defaultValue={config.baseSalary}
                              onBlur={(e) => {
                                const val = Number(e.target.value);
                                updateSalaryConfig(emp.id, { ...config, baseSalary: val });
                                speak(`Оклад для ${emp.name} обновлен`);
                              }}
                              className={`w-full p-2 rounded-xl text-xs font-bold outline-none transition-all ${theme === 'futuristic' ? 'bg-white/5 border-white/10 text-white focus:border-cyan-500' : 'bg-stone-50 border-stone-100 text-stone-800 focus:border-gold'}`}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className={`text-[9px] font-black uppercase tracking-widest block ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>Комиссия (%)</label>
                            <input
                              type="number"
                              defaultValue={config.commissionPercent}
                              onBlur={(e) => {
                                const val = Number(e.target.value);
                                updateSalaryConfig(emp.id, { ...config, commissionPercent: val });
                                speak(`Процент комиссии для ${emp.name} изменен`);
                              }}
                              className={`w-full p-2 rounded-xl text-xs font-bold outline-none transition-all ${theme === 'futuristic' ? 'bg-white/5 border-white/10 text-white focus:border-cyan-500' : 'bg-stone-50 border-stone-100 text-stone-800 focus:border-gold'}`}
                            />
                          </div>
                          <div className={`p-2 rounded-xl border flex flex-col justify-center items-center ${theme === 'futuristic' ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-gold/5 border-gold/10'}`}>
                            <span className={`text-[8px] font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-cyan-400' : 'text-gold-dark'}`}>Продажи</span>
                            <span className={`text-xs font-bold ${theme === 'futuristic' ? 'text-cyan-300' : 'text-gold-dark'}`}>{totalSales.toLocaleString()}</span>
                          </div>
                          <div className={`p-2 rounded-xl border flex flex-col justify-center items-center ${theme === 'futuristic' ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-gold/5 border-gold/10'}`}>
                            <span className={`text-[8px] font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-cyan-400' : 'text-gold-dark'}`}>Комиссия</span>
                            <span className={`text-xs font-bold ${theme === 'futuristic' ? 'text-cyan-300' : 'text-gold-dark'}`}>{commission.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => {
                                setShowAddSalary(true);
                              }}
                              className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${theme === 'futuristic' ? 'bg-cyan-500 text-white neon-glow' : 'bg-stone-900 text-white hover:bg-stone-800'}`}
                            >
                              Выплатить
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100">
                    <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">История Выплат</h4>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                      {salaries.map(s => (
                        <div key={s.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-bold text-stone-400">{new Date(s.createdAt).toLocaleDateString()}</span>
                            <span className="text-[10px] font-black text-green-600 uppercase">{s.status}</span>
                          </div>
                          <p className="text-sm font-bold text-stone-800">{s.userName}</p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-stone-500">{s.type} ({s.period})</span>
                            <span className="text-sm font-black text-gold-dark">{s.amount.toLocaleString()} UZS</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        }

        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-stone-100 shadow-sm">
            <div className="w-16 h-16 border-4 border-uzum-primary border-t-transparent rounded-full animate-spin mb-6" />
            <p className="text-xs font-black text-stone-400 uppercase tracking-widest">Загрузка...</p>
          </div>
        }>
          {activeTab === 'debts' && (
            <AdminDebts
              setShowAddDebt={setShowAddDebt}
              setEditingDebt={setEditingDebt}
              setSelectedDebtForInfo={setSelectedDebtForInfo}
              theme={theme}
            />
          )}

          {activeTab === 'accounting' && (
            <AdminAccounting
              setShowAddExpense={setShowAddExpense}
              handleConfirm={handleConfirm}
              theme={theme}
            />
          )}

          {activeTab === 'shops' && (
            <AdminShops
              setShowAddShop={setShowAddShop}
              setEditingShop={setEditingShop}
              handleConfirm={handleConfirm}
              theme={theme}
            />
          )}

          {activeTab === 'tracker' && (
            <AdminTracker
              setShowAddShop={setShowAddShop}
              handleConfirm={handleConfirm}
              theme={theme}
            />
          )}

          {activeTab === 'reviews' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-20">
              <div className="flex justify-between items-center">
                <h2 className={`text-2xl font-bold ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>Отзывы и Оценки</h2>
                <div className="flex gap-2">
                  <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${theme === 'futuristic' ? 'bg-white/5 border-white/10 text-cyan-400' : 'bg-uzum-bg text-uzum-muted border-stone-100'}`}>
                    Всего отзывов: {reviews.length}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Product Reviews */}
                <div className="space-y-4">
                  <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${theme === 'futuristic' ? 'text-cyan-400' : 'text-stone-400'}`}>
                    <Package size={14} /> Отзывы о товарах
                  </h3>
                  <div className="space-y-3">
                    {reviews.filter(r => r.type === 'product').length > 0 ? (
                      reviews.filter(r => r.type === 'product').map(review => {
                        const product = products.find(p => p.id === (review.targetId as any));
                        return (
                          <div key={review.id} className={`p-4 rounded-3xl border transition-all ${theme === 'futuristic' ? 'bg-white/5 border-white/10' : 'bg-white border-stone-100'}`}>
                            <div className="flex justify-between items-start mb-2">
                              <StarRating rating={review.rating} size={10} />
                              <span className="text-[8px] font-bold text-stone-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs font-bold text-stone-800 mb-1">{product?.name || 'Удаленный товар'}</p>
                            <p className="text-[10px] text-stone-500 italic mb-2">"{review.comment}"</p>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-stone-100 overflow-hidden">
                                {users.find(u => u.id === review.userId)?.photo ? (
                                  <img src={users.find(u => u.id === review.userId)?.photo} className="w-full h-full object-cover" />
                                ) : <User size={10} className="m-auto text-stone-300" />}
                              </div>
                              <span className="text-[9px] font-black text-stone-400 uppercase">{users.find(u => u.id === review.userId)?.name || 'Аноним'}</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-[10px] text-stone-400 italic">Нет отзывов о товарах</p>
                    )}
                  </div>
                </div>

                {/* Agent Reviews */}
                <div className="space-y-4">
                  <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${theme === 'futuristic' ? 'text-purple-400' : 'text-stone-400'}`}>
                    <Users size={14} /> Отзывы об агентах
                  </h3>
                  <div className="space-y-3">
                    {reviews.filter(r => r.type === 'agent').length > 0 ? (
                      reviews.filter(r => r.type === 'agent').map(review => {
                        const agent = users.find(u => u.id === (review.targetId as any));
                        return (
                          <div key={review.id} className={`p-4 rounded-3xl border transition-all ${theme === 'futuristic' ? 'bg-white/5 border-white/10' : 'bg-white border-stone-100'}`}>
                            <div className="flex justify-between items-start mb-2">
                              <StarRating rating={review.rating} size={10} />
                              <span className="text-[8px] font-bold text-stone-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-lg bg-stone-100 overflow-hidden">
                                {agent?.photo ? <img src={agent.photo} className="w-full h-full object-cover" /> : <User size={12} className="m-auto" />}
                              </div>
                              <p className="text-xs font-bold text-stone-800">{agent?.name || 'Неизвестный агент'}</p>
                            </div>
                            <p className="text-[10px] text-stone-500 italic mb-2">"{review.comment}"</p>
                            <span className="text-[9px] font-black text-stone-400 uppercase">— {users.find(u => u.id === review.userId)?.name || 'Клиент'}</span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-[10px] text-stone-400 italic">Нет отзывов об агентах</p>
                    )}
                  </div>
                </div>

                {/* Courier Reviews */}
                <div className="space-y-4">
                  <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${theme === 'futuristic' ? 'text-orange-400' : 'text-stone-400'}`}>
                    <Truck size={14} /> Отзывы о курьерах
                  </h3>
                  <div className="space-y-3">
                    {reviews.filter(r => r.type === 'courier').length > 0 ? (
                      reviews.filter(r => r.type === 'courier').map(review => {
                        const courier = users.find(u => u.id === (review.targetId as any));
                        return (
                          <div key={review.id} className={`p-4 rounded-3xl border transition-all ${theme === 'futuristic' ? 'bg-white/5 border-white/10' : 'bg-white border-stone-100'}`}>
                            <div className="flex justify-between items-start mb-2">
                              <StarRating rating={review.rating} size={10} />
                              <span className="text-[8px] font-bold text-stone-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-lg bg-stone-100 overflow-hidden">
                                {courier?.photo ? <img src={courier.photo} className="w-full h-full object-cover" /> : <Truck size={12} className="m-auto" />}
                              </div>
                              <p className="text-xs font-bold text-stone-800">{courier?.name || 'Неизвестный курьер'}</p>
                            </div>
                            <p className="text-[10px] text-stone-500 italic mb-2">"{review.comment}"</p>
                            <span className="text-[9px] font-black text-stone-400 uppercase">— {users.find(u => u.id === review.userId)?.name || 'Клиент'}</span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-[10px] text-stone-400 italic">Нет отзывов о курьерах</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </Suspense>
      </main >


      {/* Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 px-2 py-2 flex justify-around items-center z-40 transition-all no-scrollbar overflow-x-auto ${theme === 'futuristic' ? 'glass-morphism border-t border-white/10 shadow-[0_-8px_32px_rgba(0,0,0,0.4)]' : 'bg-white border-t border-[#e2e5eb] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]'}`}>
        {[
          { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: t('dashboard') },
          { id: 'products', icon: <Package size={20} />, label: t('products') },
          { id: 'orders', icon: <ShoppingBag size={20} />, label: t('orders') },
          { id: 'ai', icon: <Bot size={20} />, label: 'AI' },
          { id: 'security', icon: <AlertCircle size={20} />, label: 'Security' },
          { id: 'deploy', icon: <Play size={20} />, label: 'Deploy' },
          { id: 'tracker', icon: <Navigation size={20} />, label: t('tracker') },
          { id: 'accounting', icon: <Calculator size={20} />, label: 'Accounting' },
          { id: 'telegram', icon: <Send size={20} />, label: 'Telegram' },
          { id: 'salaries', icon: <Banknote size={20} />, label: 'Salaries' },
          { id: 'banners', icon: <ImageIcon size={20} />, label: 'Banners' },
          { id: 'warehouse', icon: <Package size={20} />, label: 'Warehouse' },
          { id: 'debts', icon: <Wallet size={20} />, label: 'Debts' },
          { id: 'shops', icon: <Store size={20} />, label: 'Shops' },
          { id: 'users', icon: <Users size={20} />, label: t('users') },
          { id: 'settings', icon: <SettingsIcon size={20} />, label: t('settings') },
          { id: 'reviews', icon: <Star size={20} />, label: 'Reviews' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col items-center gap-1 min-w-[60px] transition-all ${activeTab === item.id ? (theme === 'futuristic' ? 'text-cyan-400 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'text-uzum-primary scale-110') : (theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted opacity-60')
              }`}
          >
            <div className={`p-2 rounded-xl transition-all ${activeTab === item.id ? (theme === 'futuristic' ? 'bg-cyan-500/20' : 'bg-uzum-primary/10') : ''}`}>
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

      <AnimatePresence>
        {showAddBanner && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-stone-100"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Добавить Баннер</h3>
                <button onClick={() => setShowAddBanner(false)} className="text-stone-400"><X /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await addBanner({
                  title: formData.get('title') as string,
                  imageUrl: imagePreview || formData.get('imageUrl') as string,
                  link: formData.get('link') as string,
                  isActive: 1
                });
                speak("Баннер добавлен");
                setShowAddBanner(false);
              }} className="space-y-4">
                <div className="h-40 rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 relative overflow-hidden flex flex-col items-center justify-center group">
                  {imagePreview ? (
                    <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <>
                      <Upload className="text-stone-300 mb-2" size={32} />
                      <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Загрузить фото</p>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Заголовок</label>
                  <input name="title" required className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:border-gold bg-stone-50" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Ссылка (необязательно)</label>
                  <input name="link" className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:border-gold bg-stone-50" />
                </div>
                <button type="submit" className="w-full gold-gradient text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg mt-4">
                  Сохранить
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingBanner && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-stone-100"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Изменить Баннер</h3>
                <button onClick={() => setEditingBanner(null)} className="text-stone-400"><X /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await updateBanner(Number(editingBanner.id), {
                  title: formData.get('title') as string,
                  imageUrl: imagePreview || editingBanner.imageUrl,
                  link: formData.get('link') as string,
                  isActive: formData.get('isActive') === 'on' ? 1 : 0
                });
                speak("Баннер обновлен");
                setEditingBanner(null);
              }} className="space-y-4">
                <div className="h-40 rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 relative overflow-hidden flex flex-col items-center justify-center group">
                  {imagePreview ? (
                    <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <>
                      <Upload className="text-stone-300 mb-2" size={32} />
                      <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Загрузить фото</p>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Заголовок</label>
                  <input name="title" defaultValue={editingBanner.title} required className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:border-gold bg-stone-50" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Ссылка</label>
                  <input name="link" defaultValue={editingBanner.link} className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:border-gold bg-stone-50" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" name="isActive" defaultChecked={editingBanner.isActive === 1} className="w-4 h-4 text-gold rounded" />
                  <label className="text-xs font-bold text-stone-600 uppercase tracking-widest">Активен</label>
                </div>
                <button type="submit" className="w-full gold-gradient text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg mt-4">
                  Сохранить
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Salary Modal */}
      <AnimatePresence>
        {showAddExpense && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-stone-100"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Добавить Расход</h3>
                <button onClick={() => setShowAddExpense(false)} className="text-stone-400"><X /></button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await addExpense({
                  title: formData.get('title') as string,
                  amount: Number(formData.get('amount')),
                  category: formData.get('category') as string,
                });
                speak(`Расход добавлен`);
                setShowAddExpense(false);
              }} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Название</label>
                  <input name="title" required className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:border-gold bg-stone-50" placeholder="Напр: Аренда офиса" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Сумма (UZS)</label>
                  <input name="amount" type="number" required className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:border-gold bg-stone-50" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Категория</label>
                  <select name="category" className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:border-gold bg-stone-50">
                    <option value="rent">Аренда</option>
                    <option value="utility">Коммунальные</option>
                    <option value="marketing">Маркетинг</option>
                    <option value="inventory">Закуп товара</option>
                    <option value="other">Прочее</option>
                  </select>
                </div>
                <button type="submit" className="w-full gold-gradient text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg mt-4">
                  Сохранить Расход
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAddSalary && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-stone-100"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Выплата Зарплаты</h3>
                <button onClick={() => setShowAddSalary(false)} className="text-stone-400"><X /></button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const salaryData = {
                  userId: Number(formData.get('userId')),
                  amount: Number(formData.get('amount')),
                  type: formData.get('type') as string,
                  period: formData.get('period') as string,
                };
                await createSalary(salaryData);
                speak(`Зарплата выплачена`);
                setShowAddSalary(false);
              }} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Сотрудник</label>
                  <select name="userId" required className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:border-gold bg-stone-50">
                    <option value="">Выберите сотрудника</option>
                    {users.filter(u => u.role !== 'client').map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Сумма (UZS)</label>
                  <input name="amount" type="number" required className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:border-gold bg-stone-50" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Тип</label>
                    <select name="type" className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:border-gold bg-stone-50">
                      <option value="salary">Зарплата</option>
                      <option value="bonus">Бонус</option>
                      <option value="advance">Аванс</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Период</label>
                    <input name="period" placeholder="Май 2024" className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:border-gold bg-stone-50" />
                  </div>
                </div>
                <button type="submit" className="w-full gold-gradient text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg mt-4">
                  Подтвердить Выплату
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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

      {/* Add Shop Modal */}
      <AnimatePresence>
        {showAddShop && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-stone-100"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold">Новый Магазин</h3>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mt-1">Добавление торговой точки</p>
                </div>
                <button onClick={() => setShowAddShop(false)} className="text-stone-400 p-2 hover:bg-stone-50 rounded-full transition-all"><X /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1 ml-1">Название</label>
                  <input
                    type="text"
                    className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold font-bold text-sm"
                    value={newShopData.name}
                    onChange={(e) => setNewShopData({ ...newShopData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1 ml-1">Адрес</label>
                  <input
                    type="text"
                    className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold font-bold text-sm"
                    value={newShopData.address}
                    onChange={(e) => setNewShopData({ ...newShopData, address: e.target.value })}
                  />
                </div>
                <div className="h-48 rounded-2xl overflow-hidden border border-stone-100 relative">
                  <MapContainer center={[newShopData.latitude, newShopData.longitude]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[newShopData.latitude, newShopData.longitude]} />
                    <LocationPicker onLocationSelect={(lat, lng, addr) => setNewShopData({ ...newShopData, latitude: lat, longitude: lng, address: addr || newShopData.address })} />
                  </MapContainer>
                  <div className="absolute bottom-2 left-2 z-[1000] bg-white/90 backdrop-blur-sm p-2 rounded-lg text-[8px] font-black uppercase tracking-widest border border-stone-200">
                    Нажмите на карту для выбора
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1 ml-1">Владелец (Клиент)</label>
                    <select
                      className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold font-bold text-sm appearance-none"
                      value={newShopData.clientId}
                      onChange={(e) => setNewShopData({ ...newShopData, clientId: e.target.value })}
                    >
                      <option value="">Выберите клиента</option>
                      {users.filter(u => u.role === 'client').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1 ml-1">Агент (Ответственный)</label>
                    <select
                      className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold font-bold text-sm appearance-none"
                      value={newShopData.agentId}
                      onChange={(e) => setNewShopData({ ...newShopData, agentId: e.target.value })}
                    >
                      <option value="">Без агента</option>
                      {users.filter(u => u.role === 'agent').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleCreateShop}
                  className="w-full py-5 gold-gradient text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-gold/20 mt-4 active:scale-95 transition-all text-xs"
                >
                  Создать Магазин
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingShop && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-stone-100"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold">Изменить Магазин</h3>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mt-1">Редактирование торговой точки</p>
                </div>
                <button onClick={() => setEditingShop(null)} className="text-stone-400 p-2 hover:bg-stone-50 rounded-full transition-all"><X /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1 ml-1">Название</label>
                  <input
                    type="text"
                    className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold font-bold text-sm"
                    value={editingShop.name}
                    onChange={(e) => setEditingShop({ ...editingShop, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1 ml-1">Адрес</label>
                  <input
                    type="text"
                    className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold font-bold text-sm"
                    value={editingShop.address}
                    onChange={(e) => setEditingShop({ ...editingShop, address: e.target.value })}
                  />
                </div>
                <div className="h-48 rounded-2xl overflow-hidden border border-stone-100 relative">
                  <MapContainer center={[editingShop.latitude || BUKHARA_CENTER[0], editingShop.longitude || BUKHARA_CENTER[1]]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[editingShop.latitude || BUKHARA_CENTER[0], editingShop.longitude || BUKHARA_CENTER[1]]} />
                    <LocationPicker onLocationSelect={(lat, lng, addr) => setEditingShop({ ...editingShop, latitude: lat, longitude: lng, address: addr || editingShop.address })} />
                    <ChangeView center={[editingShop.latitude || BUKHARA_CENTER[0], editingShop.longitude || BUKHARA_CENTER[1]]} zoom={13} />
                  </MapContainer>
                  <div className="absolute bottom-2 left-2 z-[1000] bg-white/90 backdrop-blur-sm p-2 rounded-lg text-[8px] font-black uppercase tracking-widest border border-stone-200">
                    Нажмите на карту для выбора
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1 ml-1">Владелец (Клиент)</label>
                    <select
                      className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold font-bold text-sm appearance-none"
                      value={editingShop.clientId}
                      onChange={(e) => setEditingShop({ ...editingShop, clientId: e.target.value })}
                    >
                      <option value="">Выберите клиента</option>
                      {users.filter(u => u.role === 'client').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1 ml-1">Агент (Ответственный)</label>
                    <select
                      className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold font-bold text-sm appearance-none"
                      value={editingShop.agentId || ''}
                      onChange={(e) => setEditingShop({ ...editingShop, agentId: e.target.value })}
                    >
                      <option value="">Без агента</option>
                      {users.filter(u => u.role === 'agent').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleUpdateShop}
                  className="w-full py-5 gold-gradient text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-gold/20 mt-4 active:scale-95 transition-all text-xs"
                >
                  Обновить Магазин
                </button>
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
                  costPrice: formData.get('costPrice') ? Number(formData.get('costPrice')) : undefined,
                  categoryId: Number(formData.get('categoryId')),
                  description: formData.get('description') as string,
                  image: productImages[0] || formData.get('imageUrl') as string || `https://picsum.photos/seed/${Math.random()}/400/300`,
                  images: productImages,
                  videoUrl: formData.get('videoUrl') as string,
                  stock: Number(formData.get('stock'))
                });
                speak(`Товар ${name} успешно добавлен`);
                setShowAddProduct(false);
                setProductImages([]);
              }} className="space-y-5">
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {productImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-stone-100">
                      <img src={img} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setProductImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {productImages.length < 5 && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center cursor-pointer hover:bg-stone-50 transition-all">
                      <Plus size={20} className="text-stone-300" />
                      <span className="text-[8px] font-black text-stone-400 uppercase">Фото</span>
                      <input type="file" accept="image/*" multiple onChange={(e) => handleFileChange(e, 'product')} className="hidden" />
                    </label>
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

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('price')}</label>
                      <input name="price" type="number" required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Себестоимость</label>
                      <input name="costPrice" type="number" className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" placeholder="0" />
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
                  costPrice: formData.get('costPrice') ? Number(formData.get('costPrice')) : undefined,
                  categoryId: Number(formData.get('categoryId')),
                  description: formData.get('description') as string,
                  image: productImages[0] || formData.get('imageUrl') as string || editingProduct.image,
                  images: productImages.length > 0 ? productImages : undefined,
                  videoUrl: formData.get('videoUrl') as string,
                  stock: Number(formData.get('stock'))
                });
                speak(`Товар ${name} успешно обновлен`);
                setEditingProduct(null);
                setProductImages([]);
              }} className="space-y-5">
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {productImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-stone-100">
                      <img src={img} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setProductImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {productImages.length < 5 && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center cursor-pointer hover:bg-stone-50 transition-all">
                      <Plus size={20} className="text-stone-300" />
                      <span className="text-[8px] font-black text-stone-400 uppercase">Фото</span>
                      <input type="file" accept="image/*" multiple onChange={(e) => handleFileChange(e, 'product')} className="hidden" />
                    </label>
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

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('price')}</label>
                      <input name="price" type="number" defaultValue={editingProduct.price} required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Себестоимость</label>
                      <input name="costPrice" type="number" defaultValue={editingProduct.costPrice} className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" placeholder="0" />
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

      {/* Add/Edit Banner Modal */}
      <AnimatePresence>
        {(showAddBanner || editingBanner) && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-stone-100"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold tracking-tight text-stone-800">{editingBanner ? 'Изменить баннер' : t('addBanner')}</h3>
                <button onClick={() => { setShowAddBanner(false); setEditingBanner(null); setImagePreview(null); setBannerImages([]); }} className="p-2 bg-stone-50 rounded-xl text-stone-400 hover:text-stone-800 transition-all"><X size={20} /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const title = formData.get('title') as string;
                const bannerData = {
                  title,
                  imageUrl: imagePreview || formData.get('imageUrl') as string || (editingBanner?.imageUrl || `https://picsum.photos/seed/${Math.random()}/800/400`),
                  images: bannerImages,
                  videoUrl: formData.get('videoUrl') as string,
                  link: formData.get('link') as string,
                  isActive: formData.get('isActive') === 'on' ? 1 : 0
                };

                if (editingBanner) {
                  await updateBanner(editingBanner.id, bannerData);
                  speak(`Баннер ${title} обновлен`);
                } else {
                  await addBanner(bannerData);
                  speak(`Баннер ${title} добавлен`);
                }
                setShowAddBanner(false);
                setEditingBanner(null);
                setImagePreview(null);
                setBannerImages([]);
              }} className="space-y-4">
                <div className="space-y-3">
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-stone-200 rounded-[2rem] bg-stone-50 hover:bg-stone-100 transition-all cursor-pointer relative overflow-hidden group h-32">
                    <div className="flex flex-col items-center">
                      <Upload className="text-stone-300 mb-2" size={32} />
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Добавить фото (макс. 5)</p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'banner')}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>

                  {bannerImages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto py-2 no-scrollbar">
                      {bannerImages.map((img, i) => (
                        <div key={i} className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden group/img">
                          <img src={img} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              const newImgs = bannerImages.filter((_, idx) => idx !== i);
                              setBannerImages(newImgs);
                              if (img === imagePreview) setImagePreview(newImgs[0] || null);
                            }}
                            className="absolute inset-0 bg-red-500/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Заголовок</label>
                  <input name="title" defaultValue={editingBanner?.title} required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Image URL (Optional)</label>
                  <input name="imageUrl" defaultValue={editingBanner?.imageUrl} placeholder="https://..." className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Video URL (Optional)</label>
                  <input name="videoUrl" defaultValue={editingBanner?.videoUrl} placeholder="https://..." className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Link (Optional)</label>
                  <input name="link" defaultValue={editingBanner?.link} placeholder="/promo/1" className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                </div>
                <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <input type="checkbox" name="isActive" id="isActive" defaultChecked={editingBanner ? editingBanner.isActive === 1 : true} className="w-5 h-5 accent-gold cursor-pointer" />
                  <label htmlFor="isActive" className="text-[10px] font-black text-stone-400 uppercase tracking-widest cursor-pointer">Активный баннер</label>
                </div>
                <button type="submit" className="w-full gold-gradient text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-xl hover:shadow-gold/30 transition-all active:scale-95">
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

        {showAddSalary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[3rem] w-full max-w-md p-8 shadow-2xl relative overflow-hidden"
            >
              <button onClick={() => setShowAddSalary(false)} className="absolute top-6 right-6 p-2 hover:bg-stone-100 rounded-full transition-colors">
                <X size={24} className="text-stone-400" />
              </button>

              <h3 className="text-2xl font-bold mb-6">Выплата Зарплаты</h3>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const salary = {
                  userId: Number(formData.get('userId')),
                  amount: Number(formData.get('amount')),
                  type: formData.get('type') as string,
                  period: formData.get('period') as string,
                  baseSalary: Number(formData.get('baseSalary') || 0),
                  salesAmount: Number(formData.get('salesAmount') || 0),
                  salesPercentage: Number(formData.get('salesPercentage') || 0),
                  bonus: Number(formData.get('bonus') || 0),
                  advance: Number(formData.get('advance') || 0),
                  date: new Date().toISOString()
                };

                await createSalary(salary);
                setShowAddSalary(false);
                speak('Выплата успешно зарегистрирована');
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Сотрудник</label>
                    <select name="userId" required className="w-full p-3 rounded-xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium appearance-none text-sm">
                      <option value="">Выберите сотрудника</option>
                      {users.filter(u => u.role === 'agent' || u.role === 'courier').map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Оклад</label>
                    <input name="baseSalary" type="number" className="w-full p-3 rounded-xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Продажи</label>
                    <input name="salesAmount" type="number" className="w-full p-3 rounded-xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">% Продаж</label>
                    <input name="salesPercentage" type="number" className="w-full p-3 rounded-xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Бонус</label>
                    <input name="bonus" type="number" className="w-full p-3 rounded-xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Аванс</label>
                    <input name="advance" type="number" className="w-full p-3 rounded-xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Итого (UZS)</label>
                    <input name="amount" type="number" required className="w-full p-3 rounded-xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Тип Выплаты</label>
                  <select name="type" className="w-full p-3 rounded-xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium appearance-none text-sm">
                    <option value="salary">Основная Зарплата</option>
                    <option value="bonus">Бонус / Премия</option>
                    <option value="advance">Аванс</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Период</label>
                  <input name="period" placeholder="Напр: Октябрь 2023" required className="w-full p-3 rounded-xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium text-sm" />
                </div>

                <button type="submit" className="w-full gold-gradient text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-xl hover:shadow-gold/30 transition-all active:scale-95">
                  Подтвердить Выплату
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showAddExpense && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[3rem] w-full max-w-md p-8 shadow-2xl relative overflow-hidden"
            >
              <button onClick={() => setShowAddExpense(false)} className="absolute top-6 right-6 p-2 hover:bg-stone-100 rounded-full transition-colors">
                <X size={24} className="text-stone-400" />
              </button>

              <h3 className="text-2xl font-bold mb-6">Добавить расход</h3>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const expense = {
                  category: formData.get('category') as string,
                  amount: Number(formData.get('amount')),
                  description: formData.get('description') as string,
                  date: new Date().toISOString()
                };

                await addExpense(expense);
                setShowAddExpense(false);
                speak('Расход успешно добавлен');
              }} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Категория</label>
                  <select name="category" required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium appearance-none">
                    <option value="rent">Аренда</option>
                    <option value="salary">Зарплата</option>
                    <option value="marketing">Маркетинг</option>
                    <option value="logistics">Логистика</option>
                    <option value="other">Другое</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Сумма (UZS)</label>
                  <input name="amount" type="number" required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Описание</label>
                  <textarea name="description" required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium h-24 resize-none" />
                </div>

                <button type="submit" className="w-full bg-red-500 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-xl hover:shadow-red-500/30 transition-all active:scale-95">
                  Добавить расход
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showAddDebt && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[3rem] w-full max-w-md p-8 shadow-2xl relative overflow-hidden"
            >
              <button onClick={() => setShowAddDebt(false)} className="absolute top-6 right-6 p-2 hover:bg-stone-100 rounded-full transition-colors">
                <X size={24} className="text-stone-400" />
              </button>

              <h3 className="text-2xl font-bold mb-6">Добавить долг</h3>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const debt = {
                  clientId: Number(formData.get('clientId')),
                  amount: Number(formData.get('amount')),
                  dueDate: formData.get('dueDate') as string
                };

                await handleCreateDebt(debt);
              }} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('client')}</label>
                  <select name="clientId" required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium appearance-none">
                    <option value="">Выберите клиента</option>
                    {users.filter(u => u.role === 'client').map(client => (
                      <option key={client.id} value={client.id}>{client.name} ({client.phone})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('debtAmount')} (UZS)</label>
                  <input name="amount" type="number" required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{t('dueDate')}</label>
                  <input name="dueDate" type="date" required className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium" />
                </div>

                <button type="submit" className="w-full bg-red-500 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-xl hover:shadow-red-500/30 transition-all active:scale-95">
                  Создать долг
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {editingDebt && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[3rem] w-full max-w-xl p-8 shadow-2xl relative overflow-hidden"
            >
              <button
                onClick={() => setEditingDebt(null)}
                className="absolute top-6 right-6 p-2 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X size={24} className="text-stone-400" />
              </button>

              <h3 className="text-2xl font-black text-stone-800 mb-6">Редактировать долг</h3>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const updates = {
                  amount: Number(formData.get('amount')),
                  dueDate: formData.get('dueDate') as string,
                };
                await updateDebt(editingDebt.id, updates);
                setEditingDebt(null);
                speak("Долг успешно обновлен");
              }} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Сумма долга (UZS)</label>
                  <input
                    name="amount"
                    type="number"
                    defaultValue={editingDebt.amount}
                    required
                    className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Срок оплаты (DueDate)</label>
                  <input
                    name="dueDate"
                    type="date"
                    defaultValue={editingDebt.dueDate ? editingDebt.dueDate.split('T')[0] : ''}
                    required
                    className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-gold transition-all font-medium"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingDebt(null)}
                    className="flex-1 py-4 bg-stone-100 text-stone-600 rounded-2xl font-black uppercase tracking-widest text-xs"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-red-500/20"
                  >
                    Сохранить
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {selectedDebtForInfo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[3rem] w-full max-w-xl p-8 shadow-2xl relative overflow-hidden"
            >
              <button
                onClick={() => setSelectedDebtForInfo(null)}
                className="absolute top-6 right-6 p-2 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X size={24} className="text-stone-400" />
              </button>

              <div className="flex items-center gap-6 mb-8">
                <UserProfileMiniature user={{ photo: selectedDebtForInfo.clientPhoto, name: selectedDebtForInfo.clientName }} size={80} />
                <div>
                  <h3 className="text-3xl font-black text-stone-800">{selectedDebtForInfo.clientName}</h3>
                  <p className="text-stone-400 font-bold">{selectedDebtForInfo.clientPhone}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-6 bg-stone-50 rounded-[2rem] space-y-1">
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Текущий долг</p>
                  <p className="text-2xl font-black text-stone-800">{(selectedDebtForInfo.amount || 0).toLocaleString()} UZS</p>
                </div>
                <div className="p-6 bg-stone-50 rounded-[2rem] space-y-1">
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Статус</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedDebtForInfo.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                    {selectedDebtForInfo.status === 'paid' ? 'Оплачено' : 'Активный долг'}
                  </span>
                </div>
                <div className="p-6 bg-stone-50 rounded-[2rem] space-y-1">
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Дата появления</p>
                  <p className="text-sm font-bold text-stone-600">{new Date(selectedDebtForInfo.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="p-6 bg-stone-50 rounded-[2rem] space-y-1">
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Срок оплаты</p>
                  <p className="text-sm font-bold text-stone-600">{selectedDebtForInfo.dueDate ? new Date(selectedDebtForInfo.dueDate).toLocaleDateString() : 'Не указан'}</p>
                </div>
              </div>

              {selectedDebtForInfo.increasedAmount > 0 && (
                <div className="p-6 bg-red-50 rounded-[2rem] mb-8 border border-red-100">
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">История повышений</p>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-black text-red-600">+{selectedDebtForInfo.increasedAmount.toLocaleString()} UZS</p>
                      <p className="text-xs font-bold text-red-400">{selectedDebtForInfo.increaseReason}</p>
                    </div>
                    <AlertCircle size={24} className="text-red-200" />
                  </div>
                </div>
              )}

              {selectedDebtForInfo.paidAt && (
                <div className="p-6 bg-green-50 rounded-[2rem] mb-8 border border-green-100 flex items-center gap-4">
                  <CheckCircle size={24} className="text-green-500" />
                  <div>
                    <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">Оплачено в</p>
                    <p className="text-sm font-bold text-stone-600">{new Date(selectedDebtForInfo.paidAt).toLocaleString()}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                {selectedDebtForInfo.orderId && (
                  <button
                    onClick={() => {
                      setSelectedDebtForInfo(null);
                      speak("Переход к заказу");
                      // Here you could add navigation logic to the order
                    }}
                    className="flex-1 py-4 bg-stone-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-stone-200"
                  >
                    К заказу #{selectedDebtForInfo.orderId}
                  </button>
                )}
                <button
                  onClick={() => setSelectedDebtForInfo(null)}
                  className="flex-1 py-4 bg-stone-100 text-stone-600 rounded-2xl font-black uppercase tracking-widest text-xs"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Notification Toast */}
      <AnimatePresence>
        {orderNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-white rounded-3xl shadow-2xl border border-stone-100 p-4 max-w-sm w-full cursor-pointer flex gap-4 items-start ring-4 ring-green-500/20"
            onClick={() => {
              setActiveTab('orders');
              setOrderNotification(null);
            }}
          >
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center flex-shrink-0 text-green-500 mt-1">
              <ShoppingBag size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded-md">Новый Заказ</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOrderNotification(null);
                  }}
                  className="text-stone-400 hover:text-stone-800 transition-colors p-1"
                >
                  <X size={16} />
                </button>
              </div>
              <h3 className="font-bold text-stone-800 mt-1 truncate">{orderNotification.clientName}</h3>
              <p className="text-sm font-black text-stone-800 mt-0.5">{orderNotification.totalAmount?.toLocaleString()} UZS</p>
              <p className="text-[10px] text-stone-500 mt-1 font-medium truncate">{orderNotification.deliveryAddress}</p>
              <p className="text-[10px] font-bold text-stone-400 mt-2">Нажмите, чтобы открыть меню заказов</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div >
  );
};

export default AdminApp;
