import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
   ShoppingBag, CheckCircle, User, LogOut, Plus, Search,
   Clock, MapPin, Package, Users, ChevronRight, X, Minus, Trash2, Truck, CreditCard, Navigation, Volume2, TrendingUp, Banknote, Calendar, Store, Settings, List
 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';

import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BUKHARA_CENTER } from '../../context/DataContext';

// Fix Leaflet default icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
});

const LocationPicker = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number, address?: string) => void }) => {
  const { apiFetch } = useData();
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

export const AgentApp: React.FC = () => {
  const { products, categories, orders, stats, users, createOrder, updateOrder, updateUser, speak, isOnline, apiFetch, refreshData, logActivity, theme } = useData();
  const { logout, user: authUser } = useAuth();
  const { t } = useLanguage();

  const user = users.find(u => u.id === authUser?.id) || authUser;
  const [activeTab, setActiveTab] = useState<'cart' | 'orders' | 'partners' | 'reports' | 'profile' | 'settings'>('cart');
  const [partnersSubTab, setPartnersSubTab] = useState<'clients' | 'shops'>('clients');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [agentCart, setAgentCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'debt'>('cash');
  const [dueDate, setDueDate] = useState('');
  const [userPhotoPreview, setUserPhotoPreview] = useState<string | null>(user?.photo || null);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; onConfirm: () => void; title?: string; message?: string }>({ isOpen: false, onConfirm: () => { } });
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: '', phone: '', password: 'client_password' });
  const [showAddShop, setShowAddShop] = useState(false);
  const [newShopData, setNewShopData] = useState({ name: '', address: '', latitude: 39.7747, longitude: 64.4286, clientId: '' });
  const { shops, addShop, debts, banners } = useData();

  const filteredProducts = React.useMemo(() => 
    products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())), 
    [products, searchQuery]
  );

  const activeBanners = React.useMemo(() => banners.filter(b => b.isActive), [banners]);

  useEffect(() => {
    if (activeBanners.length > 0) {
      const timer = setInterval(() => {
        setCurrentBanner(prev => (prev + 1) % activeBanners.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [activeBanners]);


  const clients = React.useMemo(() => users.filter(u => u.role === 'client' && Number(u.agent_id) === Number(user?.id)), [users, user?.id]);

  const handleCreateClient = async () => {
    if (!newClientData.name || !newClientData.phone) return;
    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newClientData, role: 'client', agentId: user?.id }),
      });
      await refreshData();
      setShowAddClient(false);
      setNewClientData({ name: '', phone: '', password: 'client_password' });
      speak(`${t('client')} ${newClientData.name} ${t('clientRegisteredSuccess')}`);
      logActivity(t('clientRegisteredSuccess'), `${t('name')}: ${newClientData.name}, ${t('phone')}: ${newClientData.phone}`);
    } catch (err) {
      console.error(err);
      alert(t('errorClientRegister'));
    }
  };

  const [selectedCourierId, setSelectedCourierId] = useState<string>('');
  const [selectedShopId, setSelectedShopId] = useState<string>('');

  const handleCreateOrder = async () => {
    if (!selectedClient || agentCart.length === 0) return;

    const totalPrice = agentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shop = shops.find(s => s.id === Number(selectedShopId));

    await createOrder({
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      clientPhone: selectedClient.phone,
      agentId: user?.id,
      agentName: user?.name,
      courierId: selectedCourierId ? Number(selectedCourierId) : undefined,
      shopId: selectedShopId ? Number(selectedShopId) : undefined,
      items: agentCart.map(item => ({
        id: item.id,
        productName: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      totalPrice,
      orderStatus: selectedCourierId ? 'confirmed' : 'confirmed', // Keep as confirmed, courier will see it
      location: shop ? `${shop.name} (${shop.address})` : 'Store Pickup / Agent Order',
      paymentType: paymentMethod,
      paymentStatus: paymentMethod === 'debt' ? 'pending' : 'paid',
      dueDate: paymentMethod === 'debt' ? (dueDate || new Date(Date.now() + 86400000).toISOString()) : undefined
    });

    speak(`${t('orders')} ${t('client')} ${selectedClient.name} ${t('orderCreatedSuccess')}${selectedCourierId ? ` ${t('assignedToCourier')}` : ''}`);
    logActivity(t('orderCreatedSuccess'), `${t('total')}: ${totalPrice} сум, ${t('client')}: ${selectedClient.name}`);
    setSelectedClient(null);
    setAgentCart([]);
    setPaymentMethod('cash');
    setSelectedCourierId('');
    setSelectedShopId('');
  };

  const addToAgentCart = (product: any) => {
    const price = product.discountPrice || product.price;
    const existing = agentCart.find(item => item.id === product.id);
    if (existing) {
      setAgentCart(agentCart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setAgentCart([...agentCart, { ...product, quantity: 1, price }]);
    }
  };

  const removeFromAgentCart = (productId: number) => {
    const existing = agentCart.find(item => item.id === productId);
    if (existing?.quantity === 1) {
      setAgentCart(agentCart.filter(item => item.id !== productId));
    } else {
      setAgentCart(agentCart.map(item => item.id === productId ? { ...item, quantity: item.quantity - 1 } : item));
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setUserPhotoPreview(base64);
        handleConfirmAction(async () => {
          await updateUser(user.id, { photo: base64 });
        }, t('save'), t('areYouSure'));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmAction = (onConfirm: () => void, title?: string, message?: string) => {
    setConfirmDialog({ isOpen: true, onConfirm, title, message });
  };

  const handleCreateShopAgent = async () => {
    if (!newShopData.name || !newShopData.clientId) {
      alert(t('enterNameAndClient'));
      return;
    }
    await addShop({
      ...newShopData,
      clientId: Number(newShopData.clientId),
      agentId: user?.id
    });
    setShowAddShop(false);
    setNewShopData({ name: '', address: '', latitude: 39.7747, longitude: 64.4286, clientId: '' });
    speak(`${t('store')} ${newShopData.name} ${t('shopAddedSuccess')}`);
    logActivity(t('shopAddedSuccess'), `${t('name')}: ${newShopData.name}, ${t('address')}: ${newShopData.address}`);
    refreshData();
  };

  return (
    <div className={`min-h-screen pb-24 font-sans transition-all duration-500 ${theme === 'futuristic' ? 'bg-[#050505] text-white' : 'bg-[#f2f4f7] text-uzum-text'}`}>
      <header className={`p-4 shadow-sm flex justify-between items-center sticky top-0 z-30 border-b transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-[#e2e5eb]'}`}>
        <h1 className={`text-2xl font-black tracking-tighter transition-all flex items-center gap-2 ${theme === 'futuristic' ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500' : 'text-uzum-primary'}`}>
          <img src="/logo.png" alt="Logo" className="h-8 object-contain" />
          UZBECHKA <span className="text-sm font-bold text-stone-500 tracking-normal hidden sm:inline">DENAN bekary</span>
        </h1>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-2 py-1 rounded-full border ${isOnline ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className={`text-[8px] font-black uppercase tracking-widest ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>Agent</span>
            <span className={`text-xs font-bold ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>{user?.name}</span>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        {/* Banner Section */}
        {activeBanners.length > 0 && (
          <div className={`mb-6 relative h-[500px] rounded-[2.5rem] overflow-hidden shadow-lg border ${theme === 'futuristic' ? 'border-white/20' : 'border-stone-100'}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentBanner}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute inset-0"
              >
                <img src={activeBanners[currentBanner % activeBanners.length].imageUrl} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                  <h2 className="text-white text-lg font-bold leading-tight">{activeBanners[currentBanner % activeBanners.length].title}</h2>
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="absolute bottom-4 right-6 flex gap-1.5">
              {activeBanners.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentBanner % activeBanners.length ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cart' && (
          <div className="space-y-6">
            <div className={`p-6 rounded-[2.5rem] shadow-sm border space-y-6 transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-[#e2e5eb]'}`}>
              <h2 className={`text-xl font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>{t('cart')}</h2>

              {/* Client Selection */}
              <div className="space-y-3">
                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('selectClient')}</label>
                <div className="relative">
                  <select
                    className={`w-full p-4 rounded-2xl border-none outline-none font-bold text-sm appearance-none ${theme === 'futuristic' ? 'bg-white/5 text-white' : 'bg-uzum-bg text-uzum-text'}`}
                    onChange={(e) => setSelectedClient(clients.find(c => c.id === Number(e.target.value)))}
                    value={selectedClient?.id || ''}
                  >
                    <option value="">-- {t('selectClient')} --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                  </select>
                  <Users className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`} size={20} />
                </div>
              </div>

              {/* Product Selection (Catalog) */}
              <div className="space-y-3">
                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('items')}</label>
                <div className="relative">
                  <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`} size={20} />
                  <input
                    type="text"
                    placeholder={t('searchProduct')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full p-4 pl-12 rounded-2xl border-none outline-none font-bold text-sm ${theme === 'futuristic' ? 'bg-white/5 text-white' : 'bg-uzum-bg text-uzum-text'}`}
                  />
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2">
                  {filteredProducts.map(product => (
                    <div key={product.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${theme === 'futuristic' ? 'bg-white/5 border-white/5' : 'bg-stone-50 border-stone-100'}`}>
                      <div className="flex items-center gap-3">
                        <img src={product.image} className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <p className={`text-sm font-bold ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>{product.name}</p>
                          <p className={`text-[10px] ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{((product.discountPrice || product.price) || 0).toLocaleString()} сум</p>
                        </div>
                      </div>
                      <button
                        onClick={() => addToAgentCart(product)}
                        className={`p-2 rounded-lg transition-all ${theme === 'futuristic' ? 'bg-cyan-500 text-black hover:bg-cyan-400' : 'bg-uzum-primary text-white'}`}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cart Summary */}
              {agentCart.length > 0 && (
                <div className={`space-y-4 pt-4 border-t ${theme === 'futuristic' ? 'border-white/5' : 'border-stone-100'}`}>
                  <div className="space-y-2">
                    {agentCart.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <span className={`font-medium ${theme === 'futuristic' ? 'text-white/70' : 'text-uzum-text'}`}>{item.quantity}x {item.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>{((item.price || 0) * (item.quantity || 0)).toLocaleString()} сум</span>
                          <button onClick={() => removeFromAgentCart(item.id)} className="text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-3">
                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('paymentMethod')}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'cash', label: t('cash'), icon: Banknote },
                        { id: 'card', label: t('card'), icon: CreditCard },
                        { id: 'debt', label: t('debt'), icon: Clock }
                      ].map(method => (
                        <button
                          key={method.id}
                          onClick={() => setPaymentMethod(method.id as any)}
                          className={`py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${paymentMethod === method.id
                            ? (theme === 'futuristic' ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-uzum-primary bg-uzum-primary/5 text-uzum-primary')
                            : (theme === 'futuristic' ? 'border-white/5 text-white/40 bg-white/5' : 'border-stone-100 text-stone-400 bg-stone-50')
                            }`}
                        >
                          <method.icon size={20} />
                          <span className="text-[8px] font-black uppercase tracking-widest">{method.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Due Date Picker for Debt */}
                  {paymentMethod === 'debt' && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('dueDate')}</label>
                      <div className="relative">
                        <input
                          type="datetime-local"
                          className={`w-full p-4 rounded-2xl border-none outline-none font-bold text-sm ${theme === 'futuristic' ? 'bg-white/5 text-white color-scheme-dark' : 'bg-uzum-bg text-uzum-text'}`}
                          value={dueDate ? dueDate.slice(0, 16) : ''}
                          onChange={(e) => setDueDate(e.target.value)}
                        />
                        <Calendar className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-primary'}`} size={20} />
                      </div>
                    </motion.div>
                  )}

                  {/* Courier & Shop Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('store')}</label>
                      <div className="relative">
                        <select
                          className={`w-full p-4 rounded-2xl border-none outline-none font-bold text-sm appearance-none ${theme === 'futuristic' ? 'bg-white/5 text-white' : 'bg-uzum-bg text-uzum-text'}`}
                          onChange={(e) => setSelectedShopId(e.target.value)}
                          value={selectedShopId}
                        >
                          <option value="">-- {t('selectStore')} --</option>
                          {shops.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} {s.clientId !== selectedClient?.id && s.clientName ? `(${s.clientName})` : ''}
                            </option>
                          ))}
                        </select>
                        <MapPin className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`} size={20} />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('assignCourier')}</label>
                      <div className="relative">
                        <select
                          className={`w-full p-4 rounded-2xl border-none outline-none font-bold text-sm appearance-none ${theme === 'futuristic' ? 'bg-white/5 text-white' : 'bg-uzum-bg text-uzum-text'}`}
                          onChange={(e) => setSelectedCourierId(e.target.value)}
                          value={selectedCourierId}
                        >
                          <option value="">{t('autoSelect')}</option>
                          {users.filter(u => u.role === 'courier').map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                        <Truck className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`} size={20} />
                      </div>
                    </div>
                  </div>

                  <div className={`flex justify-between items-center p-4 rounded-2xl transition-all ${theme === 'futuristic' ? 'bg-white/5' : 'bg-uzum-bg'}`}>
                    <span className={`text-sm font-bold uppercase tracking-widest ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('total')}:</span>
                    <span className={`text-xl font-black ${theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-primary'}`}>
                      {(agentCart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0)).toLocaleString()} сум
                    </span>
                  </div>

                  <button
                    onClick={handleCreateOrder}
                    disabled={!selectedClient || agentCart.length === 0}
                    className={`w-full py-5 text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl transition-all disabled:opacity-50 ${theme === 'futuristic' ? 'bg-gradient-to-r from-cyan-600 to-purple-600 shadow-cyan-500/20' : 'bg-uzum-primary shadow-uzum-primary/20'}`}
                  >
                    {t('createOrder')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className={`p-8 rounded-[3rem] shadow-sm border space-y-6 transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-[#e2e5eb]'}`}>
              <h3 className={`text-sm font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>{t('recentOrders')}</h3>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                {orders.filter(o => Number(o.agentId) === Number(user?.id)).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(order => (
                  <div key={order.id} className={`p-4 rounded-2xl border flex justify-between items-center transition-all ${theme === 'futuristic' ? 'bg-white/5 border-white/5' : 'bg-stone-50 border-stone-100'}`}>
                    <div>
                      <h4 className={`text-sm font-bold ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>#{order.id} — {order.clientName}</h4>
                      <p className={`text-[10px] font-medium uppercase tracking-widest ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>
                        {new Date(order.createdAt).toLocaleString()} — {order.orderStatus}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-primary'}`}>{(order.totalPrice || 0).toLocaleString()} сум</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'partners' && (
          <div className="space-y-6">
            <div className="flex gap-2">
              <button 
                onClick={() => setPartnersSubTab('clients')}
                className={`flex-1 py-3 rounded-2xl font-bold transition-all ${partnersSubTab === 'clients' ? (theme === 'futuristic' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'bg-uzum-primary text-white') : (theme === 'futuristic' ? 'bg-white/5 text-white/40 border border-white/5' : 'bg-white text-uzum-muted border border-stone-100')}`}
              >
                {t('clients')}
              </button>
              <button 
                onClick={() => setPartnersSubTab('shops')}
                className={`flex-1 py-3 rounded-2xl font-bold transition-all ${partnersSubTab === 'shops' ? (theme === 'futuristic' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'bg-uzum-primary text-white') : (theme === 'futuristic' ? 'bg-white/5 text-white/40 border border-white/5' : 'bg-white text-uzum-muted border border-stone-100')}`}
              >
                {t('store')}
              </button>
            </div>

            {partnersSubTab === 'clients' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <h2 className={`text-xl font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>{t('clients')}</h2>
                  <button
                    onClick={() => setShowAddClient(true)}
                    className={`p-2 rounded-xl shadow-lg transition-all ${theme === 'futuristic' ? 'bg-cyan-500 text-black shadow-cyan-500/20' : 'bg-uzum-primary text-white shadow-uzum-primary/20'}`}
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {clients.map(client => {
                    const clientDebts = debts.filter(d => d.clientId === client.id && d.status === 'pending');
                    const totalDebt = clientDebts.reduce((sum, d) => sum + (d.amount || 0), 0);
                    return (
                      <div key={client.id} className={`p-5 rounded-[2rem] border transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/5 shadow-xl' : 'bg-white border-[#e2e5eb] shadow-sm'} space-y-4`}>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${theme === 'futuristic' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-uzum-bg text-uzum-primary'}`}>
                              {client.name[0]}
                            </div>
                            <div>
                              <h4 className={`font-bold text-lg ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>{client.name}</h4>
                              <p className={`text-xs ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{client.phone}</p>
                            </div>
                          </div>
                          <button onClick={() => { setSelectedClient(client); setActiveTab('cart'); }} className={`p-3 rounded-2xl transition-all ${theme === 'futuristic' ? 'bg-white/5 text-cyan-400 hover:bg-cyan-500 hover:text-black' : 'bg-uzum-bg text-uzum-primary'}`}>
                            <Package size={20} />
                          </button>
                        </div>
                        {totalDebt > 0 && (
                          <div className={`p-4 rounded-2xl space-y-2 ${theme === 'futuristic' ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50'}`}>
                            <div className="flex justify-between items-center">
                              <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-red-400' : 'text-red-400'}`}>{t('totalDebt')}</span>
                              <span className={`text-sm font-black ${theme === 'futuristic' ? 'text-red-400' : 'text-red-600'}`}>{totalDebt.toLocaleString()} сум</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {partnersSubTab === 'shops' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <h2 className={`text-xl font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>{t('myShops')}</h2>
                  <button
                    onClick={() => setShowAddShop(true)}
                    className={`p-2 rounded-xl shadow-lg transition-all ${theme === 'futuristic' ? 'bg-cyan-500 text-black shadow-cyan-500/20' : 'bg-uzum-primary text-white shadow-uzum-primary/20'}`}
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {shops.filter(s => s.agentId === user?.id).map(shop => (
                    <div key={shop.id} className={`p-5 rounded-[2rem] border shadow-sm space-y-3 transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/5' : 'bg-white border-[#e2e5eb]'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className={`font-bold text-lg ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>{shop.name}</h4>
                          <p className={`text-xs flex items-center gap-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>
                            <MapPin size={12} /> {shop.address || t('addressNotSpecified')}
                          </p>
                        </div>
                        <div className={`p-2 rounded-xl transition-all ${theme === 'futuristic' ? 'bg-white/5 text-cyan-400' : 'bg-uzum-bg text-uzum-primary'}`}>
                          <Store size={20} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <h2 className={`text-xl font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>{t('financeReport')}</h2>
            
            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`p-6 rounded-[2.5rem] shadow-sm border text-center transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-[#e2e5eb]'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('agentOrders')}</p>
                <p className={`text-2xl font-black ${theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-primary'}`}>
                  {orders.filter(o => Number(o.agentId) === Number(user?.id)).length}
                </p>
              </div>
              <div className={`p-6 rounded-[2.5rem] shadow-sm border text-center transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-[#e2e5eb]'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('commission')}</p>
                <p className={`text-2xl font-black ${theme === 'futuristic' ? 'text-purple-400' : 'text-uzum-primary'}`}>
                  {user?.commission || 0}%
                </p>
              </div>
              <div className={`p-6 rounded-[2.5rem] shadow-sm border text-center transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-[#e2e5eb]'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('totalRevenue')}</p>
                <p className={`text-lg font-black ${theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-primary'}`}>
                  {(orders.filter(o => Number(o.agentId) === Number(user?.id))
                    .reduce((sum, o) => sum + (o.totalPrice || 0), 0)).toLocaleString()}
                </p>
              </div>
              <div className={`p-6 rounded-[2.5rem] shadow-sm border text-center transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-[#e2e5eb]'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('totalProfit')}</p>
                <p className={`text-lg font-black ${theme === 'futuristic' ? 'text-green-400' : 'text-green-600'}`}>
                  {((orders.filter(o => Number(o.agentId) === Number(user?.id)).reduce((sum, o) => sum + (o.totalPrice || 0), 0)) * ((user?.commission || 0) / 100)).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Agent Contract / Salary Card */}
            <div className={`p-6 rounded-[2.5rem] shadow-sm border space-y-4 transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-[#e2e5eb]'}`}>
              <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>
                📋 {t('agentContract')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl ${theme === 'futuristic' ? 'bg-white/5' : 'bg-stone-50'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('commissionRate')}</p>
                  <p className={`text-2xl font-black ${theme === 'futuristic' ? 'text-purple-400' : 'text-purple-600'}`}>{user?.commission || 0}%</p>
                </div>
                <div className={`p-4 rounded-2xl ${theme === 'futuristic' ? 'bg-white/5' : 'bg-stone-50'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('currentSalary')}</p>
                  <p className={`text-2xl font-black ${theme === 'futuristic' ? 'text-green-400' : 'text-green-600'}`}>
                    {((orders.filter(o => Number(o.agentId) === Number(user?.id)).reduce((sum, o) => sum + (o.totalPrice || 0), 0)) * ((user?.commission || 0) / 100)).toLocaleString()} сум
                  </p>
                </div>
              </div>
            </div>

            {/* History Section */}
            <div className={`p-8 rounded-[3rem] shadow-sm border space-y-6 transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-[#e2e5eb]'}`}>
              <h3 className={`text-sm font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>{t('myOrdersHistory')}</h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                {orders.filter(o => Number(o.agentId) === Number(user?.id)).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(order => (
                  <div key={order.id} className={`p-4 rounded-2xl border flex justify-between items-center transition-all ${theme === 'futuristic' ? 'bg-white/5 border-white/5' : 'bg-stone-50 border-stone-100'}`}>
                    <div>
                      <h4 className={`text-sm font-bold ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>#{order.id} — {order.clientName}</h4>
                      <p className={`text-[10px] font-medium uppercase tracking-widest ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>
                        {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-primary'}`}>{(order.totalPrice || 0).toLocaleString()} сум</p>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        order.orderStatus === 'delivered' ? 'bg-green-500/20 text-green-400' : 
                        order.orderStatus === 'cancelled' ? 'bg-red-500/20 text-red-400' : 'bg-uzum-primary/10 text-uzum-primary'
                      }`}>
                        {order.orderStatus}
                      </span>
                    </div>
                  </div>
                ))}
                {orders.filter(o => Number(o.agentId) === Number(user?.id)).length === 0 && (
                  <div className="text-center py-10 opacity-30">
                    <ShoppingBag size={48} className="mx-auto mb-2" />
                    <p className="text-xs font-bold uppercase tracking-widest">{t('noOrdersYet')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className={`p-8 rounded-[2.5rem] shadow-sm border text-center space-y-4 relative group overflow-hidden transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-[#e2e5eb]'}`}>
              <div className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center border-4 overflow-hidden relative ${theme === 'futuristic' ? 'border-cyan-500/20 bg-white/5' : 'bg-uzum-bg border-uzum-primary/10'}`}>
                {user?.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : <User size={48} className={theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-primary'} />}
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <Plus size={24} className="text-white" />
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
              </div>
              <div>
                <h3 className={`text-2xl font-bold ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>{user?.name}</h3>
                <p className={`font-medium ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{user?.phone}</p>
              </div>
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full p-4 rounded-2xl font-bold flex items-center justify-center gap-2 mb-2 border transition-all ${theme === 'futuristic' ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-stone-50 border-stone-200 text-stone-700'}`}
              >
                <Settings size={20} /> {t('appSettings')}
              </button>
              <button onClick={logout} className={`w-full p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${theme === 'futuristic' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-500'}`}>
                <LogOut size={20} /> {t('signOut')}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setActiveTab('profile')} className={`p-2 rounded-xl shadow-sm transition-all ${theme === 'futuristic' ? 'bg-white/5 text-white' : 'bg-white text-uzum-text'}`}><ChevronRight className="rotate-180" size={20} /></button>
              <h2 className={`text-xl font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>{t('settings')}</h2>
            </div>

            <div className={`p-6 rounded-[2.5rem] shadow-sm border space-y-6 transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-[#e2e5eb]'}`}>
              <div className={`space-y-4 pb-6 border-b ${theme === 'futuristic' ? 'border-white/5' : 'border-stone-100'}`}>
                <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>
                  <Volume2 size={16} className={theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-primary'} /> {t('soundAndNotifications')}
                </h3>
                <div className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${theme === 'futuristic' ? 'bg-white/5 border-white/5' : 'bg-stone-50 border-stone-100'}`}>
                  <div>
                    <span className={`font-bold text-sm block ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{t('voiceNotifications')}</span>
                    <span className={`text-[10px] uppercase tracking-widest ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('orderStatusVoice')}</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${theme === 'futuristic' ? 'bg-white/10 peer-checked:bg-cyan-500' : 'bg-stone-200 peer-checked:bg-uzum-primary'}`}></div>
                  </label>
                </div>
              </div>

              <div className={`space-y-4 pb-6 border-b ${theme === 'futuristic' ? 'border-white/5' : 'border-stone-100'}`}>
                <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>
                  <MapPin size={16} className={theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-primary'} /> {t('mapSettings')}
                </h3>
                <div className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${theme === 'futuristic' ? 'bg-white/5 border-white/5' : 'bg-stone-50 border-stone-100'}`}>
                  <div>
                    <span className={`font-bold text-sm block ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{t('locationAccuracy')}</span>
                    <span className={`text-[10px] uppercase tracking-widest ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('highAccuracy')}</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${theme === 'futuristic' ? 'bg-white/10 peer-checked:bg-cyan-500' : 'bg-stone-200 peer-checked:bg-uzum-primary'}`}></div>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>
                  <Navigation size={16} className={theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-primary'} /> {t('device')}
                </h3>
                <div className={`p-4 rounded-2xl border space-y-2 transition-all ${theme === 'futuristic' ? 'bg-white/5 border-white/5' : 'bg-stone-50 border-stone-100'}`}>
                  <div className="flex justify-between">
                    <span className={`text-xs font-bold ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('appVersion')}</span>
                    <span className={`text-xs font-black ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>1.1.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-xs font-bold ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('role')}</span>
                    <span className={`text-xs font-black uppercase ${theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-primary'}`}>{t('agent')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-xs font-bold ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('hardware')}</span>
                    <span className={`text-xs font-black truncate max-w-[150px] ${theme === 'futuristic' ? 'text-white' : 'text-stone-600'}`}>{navigator.userAgent.substring(0, 20)}...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
      />

      {/* Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 p-4 transition-all flex justify-around items-center z-50 ${theme === 'futuristic' ? 'glass-morphism border-t border-white/10 rounded-t-[2.5rem] pb-8' : 'bg-white border-t border-[#e2e5eb]'}`}>
        {[
          { id: 'cart', label: t('cart'), icon: Package },
          { id: 'orders', label: t('orders'), icon: List },
          { id: 'partners', label: t('partners'), icon: Users },
          { id: 'reports', label: t('history'), icon: TrendingUp },
          { id: 'profile', label: t('profile'), icon: User }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center gap-1 transition-all relative ${activeTab === tab.id ? 'scale-110' : 'opacity-50 hover:opacity-100'}`}
          >
            <div className={`p-2 rounded-xl transition-all ${activeTab === tab.id
              ? (theme === 'futuristic' ? 'bg-gradient-to-br from-cyan-500 to-purple-600 text-white neon-blue-glow' : 'bg-uzum-primary/10 text-uzum-primary')
              : (theme === 'futuristic' ? 'text-white/60' : 'text-uzum-muted')}`}>
              <tab.icon size={22} />
            </div>
            <span className={`text-[8px] font-black uppercase tracking-tighter transition-all ${activeTab === tab.id
              ? (theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-primary')
              : (theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted')}`}>{tab.label}</span>
          </button>
        ))}
      </nav>

      <AnimatePresence>
        {showAddClient && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-md rounded-[3rem] p-8 shadow-2xl transition-all border ${theme === 'futuristic' ? 'glass-morphism border-white/20 text-white' : 'bg-white border-stone-100'}`}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-xl font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>{t('addClient')}</h3>
                <button onClick={() => setShowAddClient(false)} className={`p-2 rounded-full transition-all ${theme === 'futuristic' ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-uzum-bg text-uzum-muted'}`}><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('name')}</label>
                  <input
                    type="text"
                    placeholder={t('name')}
                    className={`w-full p-4 rounded-2xl border-none outline-none font-bold text-sm ${theme === 'futuristic' ? 'bg-white/5 text-white' : 'bg-uzum-bg text-uzum-text'}`}
                    value={newClientData.name}
                    onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('phone')}</label>
                  <input
                    type="tel"
                    placeholder="+998"
                    className={`w-full p-4 rounded-2xl border-none outline-none font-bold text-sm ${theme === 'futuristic' ? 'bg-white/5 text-white' : 'bg-uzum-bg text-uzum-text'}`}
                    value={newClientData.phone}
                    onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
                  />
                </div>
                <button
                  onClick={handleCreateClient}
                  className={`w-full py-5 text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl transition-all mt-4 ${theme === 'futuristic' ? 'bg-gradient-to-r from-cyan-600 to-purple-600 shadow-cyan-500/20' : 'bg-uzum-primary shadow-uzum-primary/20'}`}
                >
                  {t('register')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showAddShop && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-md rounded-[3rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh] transition-all border ${theme === 'futuristic' ? 'glass-morphism border-white/20 text-white' : 'bg-white border-stone-100'}`}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-xl font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>{t('addShopTitle')}</h3>
                <button onClick={() => setShowAddShop(false)} className={`p-2 rounded-full transition-all ${theme === 'futuristic' ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-uzum-bg text-uzum-muted'}`}><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('storeName')}</label>
                  <input
                    type="text"
                    placeholder={t('name')}
                    className={`w-full p-4 rounded-2xl border-none outline-none font-bold text-sm ${theme === 'futuristic' ? 'bg-white/5 text-white' : 'bg-uzum-bg text-uzum-text'}`}
                    value={newShopData.name}
                    onChange={(e) => setNewShopData({ ...newShopData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('ownerClient')}</label>
                  <div className="relative">
                    <select
                      className={`w-full p-4 rounded-2xl border-none outline-none font-bold text-sm appearance-none ${theme === 'futuristic' ? 'bg-white/5 text-white' : 'bg-uzum-bg text-uzum-text'}`}
                      value={newShopData.clientId}
                      onChange={(e) => setNewShopData({ ...newShopData, clientId: e.target.value })}
                    >
                      <option value="">{t('selectClient')}</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronRight className={`absolute right-4 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`} size={20} />
                  </div>
                </div>
                {/* Shop Location Map */}
                {/* Map 2: Shop Location (Draggable) */}
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>🏪 {t('shopLocation') || 'Локация магазина'}</label>
                  <div className={`h-36 rounded-[2rem] overflow-hidden border relative transition-all ${theme === 'futuristic' ? 'border-white/10' : 'border-stone-100'}`}>
                    <MapContainer center={[newShopData.latitude, newShopData.longitude]} zoom={13} style={{ height: '100%', width: '100%' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[newShopData.latitude, newShopData.longitude]} />
                      <LocationPicker onLocationSelect={(lat, lng, addr) => setNewShopData({ ...newShopData, latitude: lat, longitude: lng, address: addr || newShopData.address })} />
                    </MapContainer>
                    <div className={`absolute top-2 right-2 p-2 rounded-lg text-[8px] font-black uppercase pointer-events-none ${theme === 'futuristic' ? 'bg-black/60 text-cyan-400 border border-white/10' : 'bg-white/80 text-uzum-muted'}`}>
                      {t('clickOnMap')}
                    </div>
                  </div>
                </div>
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('addressManual')}</label>
                  <input
                    type="text"
                    placeholder={t('address')}
                    className={`w-full p-4 rounded-2xl border-none outline-none font-bold text-sm ${theme === 'futuristic' ? 'bg-white/5 text-white' : 'bg-uzum-bg text-uzum-text'}`}
                    value={newShopData.address}
                    onChange={(e) => setNewShopData({ ...newShopData, address: e.target.value })}
                  />
                </div>
                <button
                  onClick={handleCreateShopAgent}
                  className={`w-full py-5 text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl transition-all mt-4 ${theme === 'futuristic' ? 'bg-gradient-to-r from-cyan-600 to-purple-600 shadow-cyan-500/20' : 'bg-uzum-primary shadow-uzum-primary/20'}`}
                >
                  {t('createShop')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
