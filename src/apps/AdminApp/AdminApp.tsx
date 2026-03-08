import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  LayoutDashboard, Package, ShoppingBag, Users, LogOut, 
  TrendingUp, CheckCircle, Check, Truck, Plus, Trash2, Edit, X, Search, Image as ImageIcon, Play, User, MapPin, Sparkles, Upload, Settings as SettingsIcon, Volume2, List, CreditCard, Navigation, Bot, AlertCircle, Send, MessageSquare, Banknote, Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set Mapbox token - user should replace this with their own
mapboxgl.accessToken = 'pk.eyJ1IjoiZGV2ZWxvcGVyLWFpIiwiYSI6ImNsdHh6eHh6eDAxMnIya216eHh6eHh6eHgifQ.placeholder';

// Helper to update map center
const ChangeView = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};
import { AdminAI } from './AdminAI';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';

import { apiFetch } from '../../utils/api';



const BUKHARA_CENTER: [number, number] = [39.7747, 64.4286];
const WAREHOUSE_LOCATION: [number, number] = [39.7750, 64.4300]; // Example warehouse location
import { courierIcon, agentIcon, storeIcon } from '../../utils/MapIcons';

// Mapbox Tracker Component
const MapboxTracker: React.FC<{ users: any[], orders: any[], settings: any, t: any }> = ({ users, orders, settings, t }) => {
  const [webGlSupported, setWebGlSupported] = React.useState(true);
  const mapContainer = React.useRef<HTMLDivElement>(null);
  const map = React.useRef<mapboxgl.Map | null>(null);
  const markers = React.useRef<{ [key: string]: mapboxgl.Marker }>({});

  React.useEffect(() => {
    if (!mapboxgl.supported()) {
      setWebGlSupported(false);
      return;
    }

    if (!mapContainer.current) return;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [BUKHARA_CENTER[1], BUKHARA_CENTER[0]], // Mapbox uses [lng, lat]
        zoom: 13,
        pitch: 45,
        bearing: -17.6,
        antialias: true
      });

      map.current.addControl(new mapboxgl.NavigationControl());

      map.current.on('load', () => {
        if (!map.current) return;
        
        // Add Warehouse Marker
        const warehouseEl = document.createElement('div');
        warehouseEl.className = 'warehouse-marker';
        warehouseEl.style.width = '40px';
        warehouseEl.style.height = '40px';
        warehouseEl.style.backgroundColor = '#1c1917';
        warehouseEl.style.borderRadius = '12px';
        warehouseEl.style.display = 'flex';
        warehouseEl.style.alignItems = 'center';
        warehouseEl.style.justifyContent = 'center';
        warehouseEl.style.color = 'white';
        warehouseEl.style.boxShadow = '0 0 15px rgba(0,0,0,0.5)';
        warehouseEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';

        new mapboxgl.Marker(warehouseEl)
          .setLngLat([WAREHOUSE_LOCATION[1], WAREHOUSE_LOCATION[0]])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <h4 class="font-bold">Склад / Склад</h4>
              <p class="text-xs">Основной пункт отгрузки</p>
            </div>`
          ))
          .addTo(map.current);

        // Add 3D buildings layer
        const layers = map.current.getStyle().layers;
        const labelLayerId = layers?.find(
          (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
        )?.id;

        map.current.addLayer(
          {
            'id': 'add-3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 15,
            'paint': {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'min_height']
              ],
              'fill-extrusion-opacity': 0.6
            }
          },
          labelLayerId
        );
      });
    } catch (e) {
      console.error("Mapbox initialization failed:", e);
      setWebGlSupported(false);
    }

    return () => {
      map.current?.remove();
    };
  }, []);

  React.useEffect(() => {
    if (!map.current || !webGlSupported) return;

    // Update markers
    const activeUsers = users.filter(u => (u.role === 'agent' || u.role === 'courier') && u.lat != null && u.lng != null);
    
    // Remove old markers
    Object.keys(markers.current).forEach(id => {
      if (!activeUsers.find(u => u.id.toString() === id)) {
        markers.current[id].remove();
        delete markers.current[id];
      }
    });

    // Add/Update markers
    activeUsers.forEach(u => {
      const id = u.id.toString();
      const isOnline = u.lastSeen && (new Date().getTime() - new Date(u.lastSeen).getTime() < 60000);
      
      if (markers.current[id]) {
        markers.current[id].setLngLat([u.lng, u.lat]);
      } else {
        const el = document.createElement('div');
        el.className = 'marker';
        el.style.backgroundImage = `url(${u.photo || 'https://picsum.photos/seed/user/50/50'})`;
        el.style.width = '40px';
        el.style.height = '40px';
        el.style.backgroundSize = 'cover';
        el.style.borderRadius = '50%';
        el.style.border = `3px solid ${u.role === 'agent' ? '#3b82f6' : '#f97316'}`;
        el.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
        
        const statusDot = document.createElement('div');
        statusDot.style.width = '12px';
        statusDot.style.height = '12px';
        statusDot.style.borderRadius = '50%';
        statusDot.style.backgroundColor = isOnline ? '#22c55e' : '#94a3b8';
        statusDot.style.position = 'absolute';
        statusDot.style.bottom = '0';
        statusDot.style.right = '0';
        statusDot.style.border = '2px solid white';
        el.appendChild(statusDot);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([u.lng, u.lat])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <h4 class="font-bold">${u.name}</h4>
              <p class="text-xs">${u.role} • ${isOnline ? 'Online' : 'Offline'}</p>
              <p class="text-xs">${u.phone}</p>
            </div>`
          ))
          .addTo(map.current!);
        
        markers.current[id] = marker;
      }
    });
  }, [users, webGlSupported]);

  if (!webGlSupported) {
    return (
      <div className="w-full h-full rounded-3xl overflow-hidden relative">
        <MapContainer center={BUKHARA_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={WAREHOUSE_LOCATION} icon={L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: #1c1917; color: white; padding: 8px; border-radius: 8px; display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
          })}>
            <Popup>
              <div className="p-1">
                <h4 className="font-bold">Склад</h4>
                <p className="text-xs">Основной пункт отгрузки</p>
              </div>
            </Popup>
          </Marker>
          {users.filter(u => (u.role === 'agent' || u.role === 'courier') && u.lat != null && u.lng != null).map(u => (
            <Marker 
              key={u.id} 
              position={[u.lat, u.lng]}
              icon={L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-image: url(${u.photo || 'https://picsum.photos/seed/user/50/50'}); width: 40px; height: 40px; background-size: cover; border-radius: 50%; border: 3px solid ${u.role === 'agent' ? '#3b82f6' : '#f97316'}; box-shadow: 0 0 10px rgba(0,0,0,0.3); position: relative;">
                  <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${u.lastSeen && (new Date().getTime() - new Date(u.lastSeen).getTime() < 60000) ? '#22c55e' : '#94a3b8'}; position: absolute; bottom: 0; right: 0; border: 2px solid white;"></div>
                </div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
              })}
            >
              <Popup>
                <div className="p-1">
                  <h4 className="font-bold">{u.name}</h4>
                  <p className="text-xs">{u.role}</p>
                  <p className="text-xs">{u.phone}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl border border-stone-200 shadow-lg flex items-center gap-2">
          <AlertCircle size={14} className="text-amber-500" />
          <span className="text-[10px] font-bold text-stone-600 uppercase tracking-widest">WebGL Fallback Mode</span>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className="w-full h-full rounded-3xl overflow-hidden" />;
};

const UserProfileMiniature: React.FC<{ user: any; size?: number }> = ({ user, size = 32 }) => (
  <div 
    className="rounded-full bg-stone-100 overflow-hidden border border-stone-200 flex-shrink-0"
    style={{ width: size, height: size }}
  >
    {user?.photo ? (
      <img src={user.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-stone-300">
        <User size={size * 0.6} />
      </div>
    )}
  </div>
);

export const AdminApp: React.FC = () => {
  const { 
    products, categories, orders, stats, users, banners, settings, debts, systemErrors,
    insights, kpis, forecasts, healthLogs, securityAlerts, commissions, salaryConfigs, salaries, accounting,
    addProduct, updateProduct, deleteProduct, addCategory, deleteCategory, updateOrder, deleteOrder, deleteUser, updateUser, addBanner, updateBanner, deleteBanner, updateSettings, addDebt, updateDebt, speak,
    deployUpdate, setCommission, updateSalaryConfig, createSalary, fixSystemError, apiFetch, refreshData, addExpense, deleteExpense,
    payDebt, increaseDebt
  } = useData();
  const { logout, user: currentUser } = useAuth();
  const { register } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'users' | 'banners' | 'ai' | 'settings' | 'debts' | 'tracker' | 'security' | 'deploy' | 'telegram' | 'salaries' | 'accounting' | 'warehouse'>('dashboard');
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
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddBanner, setShowAddBanner] = useState(false);
  const [showAddSalary, setShowAddSalary] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [selectedOrderForMap, setSelectedOrderForMap] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [showAddBanner, setShowAddBanner] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'user' | 'banner' = 'product') => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (type === 'product') {
        const newImages: string[] = [...productImages];
        Array.from(files).forEach(file => {
          if (newImages.length < 5) {
            const reader = new FileReader();
            reader.onloadend = () => {
              newImages.push(reader.result as string);
              setProductImages([...newImages]);
            };
            reader.readAsDataURL(file);
          }
        });
      } else {
        const file = files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
          if (type === 'user') {
            setUserPhotoPreview(reader.result as string);
          } else if (type === 'banner') {
            setImagePreview(reader.result as string);
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Bento Grid Header Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: t('revenue'), value: (stats?.revenue || 0).toLocaleString(), icon: <TrendingUp size={18} />, color: 'bg-uzum-primary/10 text-uzum-primary', suffix: ' UZS' },
                { label: t('orders'), value: stats.orders, icon: <ShoppingBag size={18} />, color: 'bg-blue-50 text-blue-500' },
                { label: t('users'), value: stats.users, icon: <Users size={18} />, color: 'bg-purple-50 text-purple-500' },
                { label: t('products'), value: products.length, icon: <Package size={18} />, color: 'bg-orange-50 text-orange-500' },
                { label: t('debts'), value: debts.filter(d => d.status === 'pending').length, icon: <CreditCard size={18} />, color: 'bg-red-50 text-red-500' },
                { label: 'System Health', value: healthLogs.some(l => l.status === 'error') ? 'Warning' : 'Healthy', icon: <CheckCircle size={18} />, color: healthLogs.some(l => l.status === 'error') ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500' },
              ].map((item, i) => (
                <div key={i} className="bg-white p-4 rounded-3xl shadow-sm border border-stone-100 flex flex-col justify-between h-32 hover:shadow-md transition-all">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${item.color}`}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest mb-1">{item.label}</p>
                    <h3 className="text-lg font-black text-stone-800 truncate">{item.value}{item.suffix}</h3>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* AI Director Recommendation - Spans 8 */}
              <div className="lg:col-span-8 space-y-6">
                {insights.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gold/5 border border-gold/10 p-8 rounded-[3rem] flex flex-col md:flex-row items-start md:items-center gap-8 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                    <div className="p-6 bg-gold text-white rounded-[2rem] shadow-xl shadow-gold/20 relative z-10">
                      <Bot size={40} />
                    </div>
                    <div className="flex-1 relative z-10">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-black text-gold-dark uppercase tracking-[0.2em]">AI Business Director</span>
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          insights[0].risk_level === 'high' ? 'bg-red-500 text-white' :
                          insights[0].risk_level === 'medium' ? 'bg-orange-500 text-white' :
                          'bg-green-500 text-white'
                        }`}>
                          {insights[0].risk_level} Risk
                        </span>
                      </div>
                      <h3 className="text-2xl font-black text-stone-800 mb-2 leading-tight">{insights[0].summary}</h3>
                      <p className="text-stone-600 leading-relaxed font-medium">{insights[0].recommendation}</p>
                    </div>
                  </motion.div>
                )}

                {/* Forecast Chart - Spans 8 */}
                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-stone-100">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h4 className="text-xs font-black text-stone-400 uppercase tracking-[0.2em] mb-1">AI Profit Forecast</h4>
                      <p className="text-xl font-black text-stone-800">Next 30 Days</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gold"></div>
                        <span className="text-[10px] font-bold text-stone-400 uppercase">Revenue</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-stone-800"></div>
                        <span className="text-[10px] font-bold text-stone-400 uppercase">Orders</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={forecasts}>
                        <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="expected_revenue" fill="#D4AF37" radius={[6, 6, 0, 0]} name="Expected Revenue" />
                        <Bar dataKey="expected_orders" fill="#1c1917" radius={[6, 6, 0, 0]} name="Expected Orders" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Sidebar Bento Items - Spans 4 */}
              <div className="lg:col-span-4 space-y-6">
                {/* Sales by Category Pie */}
                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-stone-100">
                  <h4 className="text-xs font-black text-stone-400 uppercase tracking-[0.2em] mb-6">Sales by Category</h4>
                  <div className="h-48 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.salesByCategory}
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {stats.salesByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-black text-stone-400 uppercase">Total</span>
                      <span className="text-lg font-black text-stone-800">{stats.salesByCategory.length}</span>
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-2">
                    {stats.salesByCategory.slice(0, 4).map((cat, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                        <span className="text-[10px] font-bold text-stone-500 truncate">{cat.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* System Status Summary */}
                <div className="bg-stone-900 p-8 rounded-[3rem] shadow-xl text-white relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full blur-3xl"></div>
                    <div className="absolute bottom-10 right-10 w-20 h-20 bg-gold rounded-full blur-3xl"></div>
                  </div>
                  <h4 className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] mb-6 relative z-10">System Health</h4>
                  <div className="space-y-4 relative z-10">
                    {healthLogs.slice(0, 3).map((log, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${log.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{log.component}</p>
                          <p className="text-[9px] text-stone-500 uppercase tracking-widest">{log.status === 'ok' ? 'Running' : 'Issue'}</p>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setActiveTab('health' as any)} className="w-full mt-4 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10">
                      View Full Logs
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: KPI Leaderboard & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Top Performers - Spans 4 */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-stone-100">
                  <h4 className="text-xs font-black text-stone-400 uppercase tracking-[0.2em] mb-6">Top Performers</h4>
                  <div className="space-y-6">
                    {topStats?.topAgent && (
                      <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-3xl border border-blue-100/50">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-sm">
                          <img src={topStats.topAgent.photo || 'https://picsum.photos/seed/agent/50/50'} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Top Agent</p>
                          <p className="text-sm font-bold text-stone-800">{topStats.topAgent.name}</p>
                          <p className="text-[10px] text-stone-400 font-bold">{topStats.topAgent.count} orders</p>
                        </div>
                      </div>
                    )}
                    {topStats?.topCourier && (
                      <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-3xl border border-orange-100/50">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-sm">
                          <img src={topStats.topCourier.photo || 'https://picsum.photos/seed/courier/50/50'} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Top Courier</p>
                          <p className="text-sm font-bold text-stone-800">{topStats.topCourier.name}</p>
                          <p className="text-[10px] text-stone-400 font-bold">{topStats.topCourier.count} deliveries</p>
                        </div>
                      </div>
                    )}
                    {topStats?.topSeller && (
                      <div className="flex items-center gap-4 p-4 bg-gold/10 rounded-3xl border border-gold/20">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-sm">
                          <img src={topStats.topSeller.image || 'https://picsum.photos/seed/product/50/50'} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black text-gold-dark uppercase tracking-widest">Top Seller</p>
                          <p className="text-sm font-bold text-stone-800 truncate">{topStats.topSeller.name}</p>
                          <p className="text-[10px] text-stone-400 font-bold">{topStats.topSeller.count} sold</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-uzum-primary p-8 rounded-[3.5rem] text-white shadow-xl relative overflow-hidden group cursor-pointer" onClick={() => setActiveTab('telegram')}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-150 transition-all duration-700" />
                  <Send size={32} className="mb-4 text-white/50" />
                  <h3 className="text-xl font-black mb-2">Telegram Ads</h3>
                  <p className="text-xs text-white/70 mb-6 font-medium">Publish new advertisements and promotions to your Telegram channel instantly.</p>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                    Open Publisher <Play size={10} />
                  </div>
                </div>
              </div>

              {/* KPI Leaderboard - Spans 8 */}
              <div className="lg:col-span-8 bg-white p-8 rounded-[3.5rem] shadow-sm border border-stone-100">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h4 className="text-xs font-black text-stone-400 uppercase tracking-[0.2em] mb-1">Performance Leaderboard</h4>
                    <p className="text-xl font-black text-stone-800">Top Employees</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="p-2 bg-stone-50 rounded-xl text-stone-400"><Users size={18} /></div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {['agent', 'courier'].map(role => (
                    <div key={role} className="space-y-4">
                      <h5 className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-2">{role}s</h5>
                      <div className="space-y-3">
                        {kpis.filter(k => k.role === role).slice(0, 3).map((kpi, i) => {
                          const u = users.find(user => user.id === kpi.user_id);
                          return (
                            <div key={i} className="flex items-center gap-4 p-3 hover:bg-stone-50 rounded-[1.5rem] transition-all group">
                              <div className="w-12 h-12 rounded-2xl bg-stone-100 overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                                {u?.photo ? <img src={u.photo} className="w-full h-full object-cover" /> : <User size={20} className="m-auto mt-3 text-stone-300" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-stone-800 truncate">{u?.name || 'Unknown'}</p>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    kpi.level === 'platinum' ? 'bg-blue-500 text-white' :
                                    kpi.level === 'gold' ? 'bg-gold text-white' :
                                    kpi.level === 'silver' ? 'bg-stone-400 text-white' :
                                    'bg-orange-400 text-white'
                                  }`}>{kpi.level}</span>
                                  <span className="text-[10px] text-stone-400 font-bold">Score: {kpi.score}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity - Spans 5 */}
              <div className="lg:col-span-5 bg-white p-8 rounded-[3.5rem] shadow-sm border border-stone-100">
                <h4 className="text-xs font-black text-stone-400 uppercase tracking-[0.2em] mb-8">Recent Orders</h4>
                <div className="space-y-5">
                  {orders.slice(0, 5).map(order => (
                    <div key={order.id} className="flex items-center gap-4 group">
                      <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400 group-hover:bg-gold/10 group-hover:text-gold transition-all">
                        <ShoppingBag size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-stone-800 truncate">#{order.id} — {order.clientName}</p>
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-gold-dark">{(order.totalPrice || 0).toLocaleString()} UZS</p>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
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

            {/* Row 4: Top Products & System Errors */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Top Products - Spans 6 */}
              <div className="lg:col-span-6 bg-white p-8 rounded-[3.5rem] shadow-sm border border-stone-100">
                <h4 className="text-xs font-black text-stone-400 uppercase tracking-[0.2em] mb-8">Top Selling Products</h4>
                <div className="space-y-6">
                  {topProducts.map((product, index) => (
                    <div key={index} className="flex items-center gap-5">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${
                        index === 0 ? 'bg-gold text-white shadow-lg shadow-gold/20' : 
                        index === 1 ? 'bg-stone-200 text-stone-600' : 
                        index === 2 ? 'bg-orange-100 text-orange-600' : 
                        'bg-stone-50 text-stone-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-stone-800">{product.name}</p>
                        <div className="w-full h-1.5 bg-stone-50 rounded-full mt-2 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(product.revenue / topProducts[0].revenue) * 100}%` }}
                            className="h-full bg-gold"
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-stone-800">{(product.revenue || 0).toLocaleString()}</p>
                        <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{product.count} Sold</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Critical Errors - Spans 6 */}
              <div className="lg:col-span-6 bg-white p-8 rounded-[3.5rem] shadow-sm border border-stone-100">
                <div className="flex justify-between items-center mb-8">
                  <h4 className="text-xs font-black text-stone-400 uppercase tracking-[0.2em]">System Monitoring</h4>
                  <span className="text-[10px] font-black text-red-500 bg-red-50 px-3 py-1 rounded-full uppercase tracking-widest">
                    {systemErrors.filter(e => !e.fixed).length} Critical Errors
                  </span>
                </div>
                <div className="space-y-4">
                  {systemErrors.filter(e => !e.fixed).slice(0, 4).map((err, i) => (
                    <div key={i} className="p-5 border border-red-100 bg-red-50/20 rounded-[2rem] flex items-start gap-4">
                      <div className="p-3 bg-red-500 text-white rounded-2xl shadow-lg shadow-red-500/20">
                        <AlertCircle size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">{err.route}</span>
                          <button 
                            onClick={() => fixSystemError(err.id)}
                            className="text-[9px] font-black text-blue-500 hover:text-blue-600 uppercase tracking-widest"
                          >
                            Fix
                          </button>
                        </div>
                        <p className="text-xs font-bold text-stone-800 leading-relaxed">{err.message}</p>
                      </div>
                    </div>
                  ))}
                  {systemErrors.filter(e => !e.fixed).length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={32} />
                      </div>
                      <p className="text-sm font-bold text-stone-800">No Critical Issues</p>
                      <p className="text-[10px] text-stone-400 uppercase tracking-widest mt-1">System is running optimally</p>
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
                        {/* Stock removed as per user request, moved to Warehouse tab */}
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
              <h2 className="text-2xl font-bold">Telegram Ad Publisher</h2>
              <div className="flex gap-2">
                <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
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

        {activeTab === 'warehouse' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Складской учет</h2>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-500 flex items-center gap-2">
                  Товаров: {products.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.map(product => (
                <div key={product.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100 flex items-center gap-4">
                  <img src={product.image} className="w-16 h-16 rounded-2xl object-cover" />
                  <div className="flex-1">
                    <h3 className="font-bold text-stone-800">{product.name}</h3>
                    <p className="text-xs text-stone-400 uppercase tracking-widest font-black">{categories.find(c => c.id === product.categoryId)?.name}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                        product.stock <= 10 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'
                      }`}>
                        Остаток: {product.stock} {product.unit}
                      </span>
                    </div>
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

        {activeTab === 'banners' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Управление Баннерами</h2>
              <button 
                onClick={() => { setShowAddBanner(true); setImagePreview(null); }}
                className="gold-gradient text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl"
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
                        onClick={() => { setEditingBanner(banner); setImagePreview(banner.imageUrl); }}
                        className="p-3 bg-white text-stone-800 rounded-xl hover:bg-gold hover:text-white transition-all"
                      >
                        <Edit2 size={20} />
                      </button>
                      <button 
                        onClick={() => handleConfirm(() => deleteBanner(Number(banner.id)), t('delete'), t('areYouSure'))}
                        className="p-3 bg-white text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                    <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      banner.isActive ? 'bg-green-500 text-white' : 'bg-stone-500 text-white'
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
                
                <div className="pt-4">
                  <button type="submit" className="w-full gold-gradient text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-xl hover:shadow-gold/30 transition-all active:scale-95">
                    {t('saveSettings')}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {activeTab === 'salaries' && (
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
                    <div key={emp.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div className="flex items-center gap-4">
                          <UserProfileMiniature user={emp} size={48} />
                          <div>
                            <h4 className="font-bold text-stone-800">{emp.name}</h4>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                              emp.role === 'agent' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                            }`}>{emp.role}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">Итого к выплате</span>
                          <span className="text-xl font-black text-gold-dark">{totalSalary.toLocaleString()} UZS</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">Оклад (Фикс)</label>
                          <input 
                            type="number" 
                            defaultValue={config.baseSalary}
                            onBlur={(e) => {
                              const val = Number(e.target.value);
                              updateSalaryConfig(emp.id, { ...config, baseSalary: val });
                              speak(`Оклад для ${emp.name} обновлен`);
                            }}
                            className="w-full p-2 bg-stone-50 border border-stone-100 rounded-xl text-xs font-bold outline-none focus:border-gold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">Комиссия (%)</label>
                          <input 
                            type="number" 
                            defaultValue={config.commissionPercent}
                            onBlur={(e) => {
                              const val = Number(e.target.value);
                              updateSalaryConfig(emp.id, { ...config, commissionPercent: val });
                              speak(`Процент комиссии для ${emp.name} изменен`);
                            }}
                            className="w-full p-2 bg-stone-50 border border-stone-100 rounded-xl text-xs font-bold outline-none focus:border-gold"
                          />
                        </div>
                        <div className="bg-gold/5 p-2 rounded-xl border border-gold/10 flex flex-col justify-center items-center">
                          <span className="text-[8px] font-black text-gold-dark uppercase tracking-widest">Продажи</span>
                          <span className="text-xs font-bold text-gold-dark">{totalSales.toLocaleString()}</span>
                        </div>
                        <div className="bg-gold/5 p-2 rounded-xl border border-gold/10 flex flex-col justify-center items-center">
                          <span className="text-[8px] font-black text-gold-dark uppercase tracking-widest">Комиссия</span>
                          <span className="text-xs font-bold text-gold-dark">{commission.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-center">
                           <button 
                            onClick={() => {
                              setShowAddSalary(true);
                              // Pre-fill salary data logic would go here
                            }}
                            className="w-full py-2 bg-stone-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-stone-800 transition-all"
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
        )}

        {activeTab === 'debts' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">{t('debts')}</h2>
              <div className="flex bg-stone-100 p-1 rounded-xl">
                <button 
                  onClick={() => setDebtSubTab('list')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${debtSubTab === 'list' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400'}`}
                >
                  Список долгов
                </button>
                <button 
                  onClick={() => setDebtSubTab('history')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${debtSubTab === 'history' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400'}`}
                >
                  История повышений
                </button>
              </div>
            </div>

            {debtSubTab === 'list' ? (
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
                                <UserProfileMiniature user={{ photo: debt.clientPhoto, name: debt.clientName }} size={40} />
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
                              <span className="text-xs text-stone-400 italic">Не указан</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="space-y-0.5">
                              <p className="text-sm font-black text-stone-800">{(debt.amount || 0).toLocaleString()} UZS</p>
                              {debt.increasedAmount > 0 && (
                                <p className="text-[10px] font-bold text-red-500">+{debt.increasedAmount.toLocaleString()} ({debt.increaseReason})</p>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-xs font-medium">{debt.dueDate ? new Date(debt.dueDate).toLocaleDateString() : '-'}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              debt.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                            }`}>
                              {debt.status === 'paid' ? 'Оплачено' : 'Долг'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              {debt.status !== 'paid' && (
                                <>
                                  <button 
                                    onClick={() => {
                                      if(confirm(`Подтвердить оплату долга от ${debt.clientName}?`)) {
                                        payDebt(debt.id);
                                        speak(`Долг от ${debt.clientName} погашен`);
                                      }
                                    }}
                                    className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-sm"
                                    title="Погасить долг"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const amount = prompt("Введите сумму увеличения долга:");
                                      const reason = prompt("Причина увеличения:");
                                      if(amount && reason) {
                                        increaseDebt(debt.id, Number(amount), reason);
                                        speak(`Долг ${debt.clientName} увеличен на ${amount}`);
                                      }
                                    }}
                                    className="p-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-all shadow-sm"
                                    title="Увеличить долг"
                                  >
                                    <Plus size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-6">
                <div className="space-y-4">
                  {debts.filter(d => d.increasedAmount > 0).map(debt => (
                    <div key={debt.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
                      <div className="flex items-center gap-4">
                        <UserProfileMiniature user={{ photo: debt.clientPhoto, name: debt.clientName }} size={48} />
                        <div>
                          <h4 className="font-bold text-stone-800">{debt.clientName}</h4>
                          <p className="text-xs text-stone-500">Причина: {debt.increaseReason}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-red-600">+{debt.increasedAmount.toLocaleString()} UZS</p>
                        <p className="text-[10px] text-stone-400 uppercase font-bold tracking-widest">Увеличен</p>
                      </div>
                    </div>
                  ))}
                  {debts.filter(d => d.increasedAmount > 0).length === 0 && (
                    <div className="text-center py-12 text-stone-400 italic">Истории повышений пока нет</div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'accounting' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Бухгалтерия</h2>
              <button 
                onClick={() => setShowAddExpense(true)}
                className="px-6 py-3 bg-red-500 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-red-500/20 hover:scale-105 transition-all"
              >
                <Plus size={20} />
                Добавить расход
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100">
                <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest mb-1">Приход (Выручка)</p>
                <h3 className="text-2xl font-black text-green-600">{(accounting?.income || 0).toLocaleString()} UZS</h3>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100">
                <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest mb-1">Расход (Затраты)</p>
                <h3 className="text-2xl font-black text-red-600">{(accounting?.totalExpenses || 0).toLocaleString()} UZS</h3>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100">
                <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest mb-1">Чистая прибыль</p>
                <h3 className="text-2xl font-black text-uzum-primary">{(accounting?.netProfit || 0).toLocaleString()} UZS</h3>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-stone-100 overflow-hidden">
              <div className="p-6 border-b border-stone-50 flex justify-between items-center">
                <h3 className="font-black text-stone-800 uppercase tracking-wider">История расходов</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 border-b">
                    <tr>
                      <th className="p-4 text-xs font-bold text-stone-400 uppercase">Дата</th>
                      <th className="p-4 text-xs font-bold text-stone-400 uppercase">Категория</th>
                      <th className="p-4 text-xs font-bold text-stone-400 uppercase">Описание</th>
                      <th className="p-4 text-xs font-bold text-stone-400 uppercase">Сумма</th>
                      <th className="p-4 text-xs font-bold text-stone-400 uppercase">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(accounting?.expenses || []).map((exp: any) => (
                      <tr key={exp.id} className="hover:bg-stone-50 transition-colors">
                        <td className="p-4 text-sm">{new Date(exp.date).toLocaleDateString()}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-stone-100 text-stone-600 text-[10px] font-black uppercase rounded-lg">
                            {exp.category}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-stone-600">{exp.description}</td>
                        <td className="p-4 font-bold text-red-500">{exp.amount.toLocaleString()} UZS</td>
                        <td className="p-4">
                          <button 
                            onClick={() => handleConfirm(() => deleteExpense(exp.id), 'Удалить расход', 'Вы уверены?')}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
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
              <MapboxTracker users={users} orders={orders} settings={settings} t={t} />
              
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
          { id: 'security', icon: <AlertCircle size={20} />, label: 'Security' },
          { id: 'deploy', icon: <Play size={20} />, label: 'Deploy' },
          { id: 'tracker', icon: <Navigation size={20} />, label: t('tracker') },
          { id: 'accounting', icon: <Calculator size={20} />, label: 'Accounting' },
          { id: 'telegram', icon: <Send size={20} />, label: 'Telegram' },
          { id: 'salaries', icon: <Banknote size={20} />, label: 'Salaries' },
          { id: 'banners', icon: <Image size={20} />, label: 'Banners' },
          { id: 'warehouse', icon: <Package size={20} />, label: 'Warehouse' },
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
      </AnimatePresence>
    </div>
  );
};
