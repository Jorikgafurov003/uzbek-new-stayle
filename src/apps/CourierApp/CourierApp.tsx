import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Truck, CheckCircle, LogOut, MapPin, Phone, Clock, Navigation, Package, ChevronDown, ChevronUp, Store, Users, Plus, Volume2, CreditCard, Banknote, Calendar, X, User, Settings, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { CourierNavigation } from '../../modules/navigation/CourierNavigation';


import { BUKHARA_CENTER } from '../../context/DataContext';
import { Routing } from '../../components/shared/Routing';
import { courierIcon, storeIcon } from '../../utils/MapIcons';

const STORE_LOCATION = BUKHARA_CENTER;

export const CourierApp: React.FC = () => {
  const { orders, updateOrder, users, updateUserLocation, updateUser, speak, addDebt, products, isOnline, banners, debts, shops, logActivity, theme } = useData();
  const { logout, user: authUser } = useAuth();
  const { t } = useLanguage();

  const user = users.find(u => u.id === authUser?.id) || authUser;
  const [activeTab, setActiveTab] = useState<'deliveries' | 'warehouse' | 'history' | 'profile' | 'settings'>('deliveries');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [showMap, setShowMap] = useState<number | null>(null);
  const [userPhotoPreview, setUserPhotoPreview] = useState<string | null>(user?.photo || null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; onConfirm: () => void; title?: string; message?: string }>({ isOpen: false, onConfirm: () => { } });
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [handoverPayment, setHandoverPayment] = useState<'cash' | 'card' | 'debt'>('cash');
  const [dueDate, setDueDate] = useState('');
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);
  const [invoicePhoto, setInvoicePhoto] = useState<string | null>(null);
  const [currentBanner, setCurrentBanner] = useState(0);

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

  useEffect(() => {
    // Request permissions
    const requestPermissions = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).catch(() => { });
        }
      } catch (e) { }
    };
    requestPermissions();
  }, []);

  useEffect(() => {
    if (banners.length > 0) {
      const timer = setInterval(() => {
        setCurrentBanner(prev => (prev + 1) % banners.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [banners]);

  const myDeliveries = orders.filter(o => o.courierId === user?.id && (o.orderStatus === 'confirmed' || o.orderStatus === 'on_way'));
  const availableOrders = orders.filter(o => o.orderStatus === 'confirmed' && !o.courierId);
  const historyDeliveries = orders.filter(o => o.courierId === user?.id && o.orderStatus === 'delivered');

  useEffect(() => {
    const assignedOrders = orders.filter(o => o.courierId === user?.id && o.orderStatus === 'confirmed');
    if (assignedOrders.length > 0) {
      const lastOrder = assignedOrders[assignedOrders.length - 1];
      const notifiedKey = `notified_order_${lastOrder.id}`;
      if (!sessionStorage.getItem(notifiedKey)) {
        speak(`Вам назначен новый заказ номер ${lastOrder.id}. Пожалуйста, проверьте список доставок.`);
        sessionStorage.setItem(notifiedKey, 'true');
      }
    }

    // Also notify about available orders if the courier is not busy
    const available = orders.filter(o => o.orderStatus === 'confirmed' && !o.courierId);
    if (available.length > 0 && myDeliveries.length === 0) {
      const lastAvailable = available[available.length - 1];
      const alertedKey = `alerted_available_${lastAvailable.id}`;
      if (!sessionStorage.getItem(alertedKey)) {
        speak(`Доступен новый заказ для доставки. Проверьте список доступных заказов.`);
        sessionStorage.setItem(alertedKey, 'true');
      }
    }
  }, [orders, user?.id, myDeliveries.length]);

  const acceptOrder = async (orderId: number) => {
    await updateOrder(orderId, { courierId: user?.id });
    speak(`Вы приняли заказ номер ${orderId}. Пожалуйста, заберите его со склада.`);
    logActivity('Принял заказ', `Заказ #${orderId}`);
  };

  const updateStatus = async (orderId: number, status: string) => {
    if (status === 'delivered') {
      const order = orders.find(o => o.id === orderId);
      setSelectedOrder(order);
      setShowHandoverModal(true);
      return;
    }
    await updateOrder(orderId, { orderStatus: status });
    if (status === 'on_way') {
      speak(`Вы начали доставку заказа номер ${orderId}. Пожалуйста, будьте осторожны на дороге.`);
      logActivity('Начал доставку', `Заказ #${orderId} в пути`);
    }
  };

  const handleHandover = async () => {
    if (!selectedOrder) return;
    if (!deliveryPhoto) return alert('Пожалуйста, сделайте фотоотчет о доставке');

    const updates: any = { orderStatus: 'delivered', deliveryPhoto, invoicePhoto };

    if (handoverPayment === 'debt') {
      if (!dueDate) return alert('Пожалуйста, выберите срок оплаты');
      await addDebt({
        clientId: selectedOrder.clientId,
        orderId: selectedOrder.id,
        amount: selectedOrder.totalPrice,
        dueDate: dueDate,
        status: 'pending'
      });
      updates.paymentType = 'debt';
      updates.paymentStatus = 'pending';
    } else {
      updates.paymentType = handoverPayment;
      updates.paymentStatus = 'paid';
    }

    await updateOrder(selectedOrder.id, updates);
    speak(`Заказ номер ${selectedOrder.id} успешно доставлен. Оплата: ${handoverPayment === 'debt' ? 'В долг' : handoverPayment === 'cash' ? 'Наличными' : 'Картой'}.`);
    logActivity('Доставил заказ', `Заказ #${selectedOrder.id}, Оплата: ${handoverPayment}, На сумму: ${selectedOrder.totalPrice}`);
    setShowHandoverModal(false);
    setSelectedOrder(null);
  };

  return (
    <div className={`min-h-screen pb-24 font-sans transition-all duration-500 ${theme === 'futuristic' ? 'bg-[#050505] text-white' : 'bg-[#f2f4f7] text-uzum-text'}`}>
      <header className={`p-4 shadow-sm flex justify-between items-center sticky top-0 z-30 border-b transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-[#e2e5eb]'}`}>
        <h1 className={`text-2xl font-black tracking-tighter transition-all ${theme === 'futuristic' ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500' : 'text-uzum-primary'}`}>UZBECHKA</h1>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-2 py-1 rounded-full border ${isOnline ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className={`text-[8px] font-black uppercase tracking-widest ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-uzum-muted uppercase tracking-widest">Courier</span>
            <span className="text-xs font-bold text-uzum-text">{user?.name}</span>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        {/* Banners Carousel */}
        {banners.filter(b => b.isActive).length > 0 && (
          <div className="mb-6 relative h-32 rounded-3xl overflow-hidden shadow-sm border border-white/20">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentBanner}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0"
              >
                <img src={banners.filter(b => b.isActive)[currentBanner % banners.filter(b => b.isActive).length].imageUrl} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
                  <h2 className="text-white text-sm font-bold leading-tight">{banners.filter(b => b.isActive)[currentBanner % banners.filter(b => b.isActive).length].title}</h2>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        <div className="space-y-4">
          {activeTab === 'deliveries' && availableOrders.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-uzum-muted uppercase tracking-[0.2em] px-2">Доступные заказы ({availableOrders.length})</h3>
              {availableOrders.map(order => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={order.id}
                  className={`rounded-[2rem] p-6 transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/5 shadow-xl shadow-cyan-500/5' : 'bg-uzum-primary/5 border border-uzum-primary/10'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-uzum-text">{order.clientName}</h4>
                      <p className="text-xs text-uzum-muted flex items-center gap-1 mt-1">
                        <MapPin size={12} /> {order.location}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-uzum-muted uppercase tracking-widest">Сумма</p>
                      <p className="text-lg font-black text-uzum-primary">{(order.totalPrice || 0).toLocaleString()} сум</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleConfirmAction(() => acceptOrder(order.id), 'Принять заказ', 'Вы уверены, что хотите взять этот заказ?')}
                    className="w-full py-4 bg-uzum-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-uzum-primary/20"
                  >
                    Принять заказ
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'warehouse' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h2 className="text-xl font-black text-uzum-text uppercase tracking-widest">{t('warehouse')}</h2>
                <div className="bg-uzum-primary/10 px-3 py-1 rounded-full">
                  <span className="text-uzum-primary text-[10px] font-black uppercase">{products.length} {t('items')}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {products.map(product => (
                  <div key={product.id} className={`p-4 rounded-[2rem] border transition-all flex gap-4 items-center ${theme === 'futuristic' ? 'glass-morphism border-white/5 shadow-xl' : 'bg-white border-[#e2e5eb] shadow-sm'}`}>
                    <div className={`w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 ${theme === 'futuristic' ? 'bg-white/5' : 'bg-uzum-bg'}`}>
                      <img src={product.image} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-bold text-sm ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>{product.name}</h4>
                      <p className={`text-[10px] font-medium uppercase tracking-widest ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{product.categoryName}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>На складе</p>
                      <p className={`text-lg font-black ${product.stock && product.stock > 0 ? (theme === 'futuristic' ? 'text-cyan-400' : 'text-green-600') : 'text-red-500'}`}>
                        {product.stock || 0} шт
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`p-8 rounded-[2.5rem] shadow-sm border text-center space-y-6 relative group overflow-hidden transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-[#e2e5eb]'}`}>
              <div className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center border-4 overflow-hidden relative ${theme === 'futuristic' ? 'bg-white/5 border-cyan-500/30 neon-blue-glow' : 'bg-uzum-bg border-uzum-primary/10'}`}>
                {user?.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : <Truck size={48} className={theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-primary'} />}
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>{user?.name}</h2>
                <p className={`font-bold uppercase tracking-widest text-xs mt-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{user?.phone}</p>
              </div>
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full p-4 rounded-2xl font-bold flex items-center justify-center gap-2 mb-2 border transition-all ${theme === 'futuristic' ? 'bg-white/5 text-white border-white/10 hover:bg-white/10' : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'}`}
              >
                <Settings size={20} /> Настройки приложения
              </button>
              <button onClick={logout} className="w-full p-4 bg-red-500/10 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all">
                <LogOut size={20} /> Выйти
              </button>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => setActiveTab('profile')} className={`p-2 rounded-xl shadow-sm border transition-all ${theme === 'futuristic' ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-stone-100 text-stone-600'}`}><ChevronRight className="rotate-180" size={20} /></button>
                <h2 className={`text-xl font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>Настройки</h2>
              </div>

              <div className={`p-6 rounded-[2.5rem] shadow-sm border space-y-6 transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-[#e2e5eb]'}`}>
                <div className={`space-y-4 pb-6 border-b ${theme === 'futuristic' ? 'border-white/5' : 'border-stone-100'}`}>
                  <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-text'}`}>
                    <Volume2 size={16} /> Звук и Уведомления
                  </h3>
                  <div className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${theme === 'futuristic' ? 'bg-white/5 border-white/5' : 'bg-stone-50 border-stone-100'}`}>
                    <div>
                      <span className={`font-bold text-sm block ${theme === 'futuristic' ? 'text-white' : ''}`}>Звуковые оповещения</span>
                      <span className={`text-[10px] uppercase tracking-widest ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>О заказах и статусах</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-uzum-primary ${theme === 'futuristic' ? 'bg-white/10' : 'bg-stone-200'}`}></div>
                    </label>
                  </div>
                </div>

                <div className={`space-y-4 pb-6 border-b ${theme === 'futuristic' ? 'border-white/5' : 'border-stone-100'}`}>
                  <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-text'}`}>
                    <MapPin size={16} /> Настройки карты
                  </h3>
                  <div className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${theme === 'futuristic' ? 'bg-white/5 border-white/5' : 'bg-stone-50 border-stone-100'}`}>
                    <div>
                      <span className={`font-bold text-sm block ${theme === 'futuristic' ? 'text-white' : ''}`}>Точность локации</span>
                      <span className={`text-[10px] uppercase tracking-widest ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>Высокая (повышенный расход)</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-uzum-primary ${theme === 'futuristic' ? 'bg-white/10' : 'bg-stone-200'}`}></div>
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-text'}`}>
                    <Navigation size={16} /> Устройство
                  </h3>
                  <div className={`p-4 rounded-2xl border space-y-2 transition-all ${theme === 'futuristic' ? 'bg-white/5 border-white/5' : 'bg-stone-50 border-stone-100'}`}>
                    <div className="flex justify-between">
                      <span className={`text-xs font-bold ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>Версия приложения</span>
                      <span className={`text-xs font-black ${theme === 'futuristic' ? 'text-white' : ''}`}>1.1.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-xs font-bold ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>Роль</span>
                      <span className="text-xs font-black uppercase text-uzum-primary">Курьер</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-xs font-bold ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>Аппарат</span>
                      <span className={`text-xs font-black truncate max-w-[150px] ${theme === 'futuristic' ? 'text-white' : 'text-stone-600'}`}>{navigator.userAgent.substring(0, 20)}...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(activeTab === 'deliveries' || activeTab === 'history') && (activeTab === 'deliveries' ? myDeliveries : historyDeliveries).map(order => (
            <motion.div
              layout
              key={order.id}
              className={`rounded-[2rem] shadow-sm border overflow-hidden transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/5' : 'bg-white border-[#e2e5eb]'}`}
            >
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-uzum-muted uppercase tracking-widest">Заказ #{order.id}</span>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                      }`}>
                      {order.paymentStatus === 'paid' ? 'Оплачено' : 'Ожидает оплаты'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-uzum-text">{order.clientName}</h3>
                    <div className="flex items-center gap-2 text-uzum-muted text-sm mt-1">
                      <MapPin size={16} className="text-uzum-primary" />
                      <span className="font-medium">{order.location}</span>
                    </div>
                    {/* Customer Debt Info */}
                    <div className="mt-3 p-4 bg-red-50 rounded-[2rem] border border-red-100 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500 text-white rounded-xl">
                          <CreditCard size={16} />
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-red-400 uppercase tracking-widest">Общий долг клиента</p>
                          <p className="text-sm font-black text-red-600">
                            {(debts.filter(d => d.clientId === order.clientId && d.status === 'pending').reduce((sum, d) => sum + d.amount, 0)).toLocaleString()} сум
                          </p>
                        </div>
                      </div>

                      {debts.filter(d => d.clientId === order.clientId && d.status === 'pending').length > 0 && (
                        <div className="pt-2 border-t border-red-200/50 space-y-2">
                          {debts.filter(d => d.clientId === order.clientId && d.status === 'pending').map((debt, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[10px]">
                              <span className="text-red-400 font-medium">Заказ #{debt.orderId || 'N/A'}</span>
                              <span className="text-red-600 font-bold">{debt.amount.toLocaleString()} сум</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a href={`tel:${order.clientPhone}`} className="flex-1 p-4 bg-uzum-primary text-white rounded-2xl shadow-lg shadow-uzum-primary/20 flex items-center justify-center gap-2">
                      <Phone size={20} /> Позвонить
                    </a>
                    <button
                      onClick={() => setShowMap(showMap === order.id ? null : order.id)}
                      className="flex-1 p-4 bg-white border border-uzum-primary text-uzum-primary rounded-2xl flex items-center justify-center gap-2"
                    >
                      <Navigation size={20} /> {showMap === order.id ? 'Закрыть карту' : 'Маршрут'}
                    </button>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 300 }}
                    className="rounded-2xl overflow-hidden border border-stone-100 relative"
                  >
                    <CourierNavigation
                      user={user}
                      orders={orders}
                      shops={shops}
                      activeOrderId={order.id}
                      onLocationUpdate={updateUserLocation}
                    />
                    <div className="absolute top-2 right-2 z-[1000] bg-white/90 backdrop-blur-sm p-2 rounded-lg text-[8px] font-black uppercase tracking-widest border border-stone-200">
                      Авто-маршрут построен
                    </div>
                  </motion.div>
                </div>

                <div className="bg-uzum-bg p-4 rounded-2xl space-y-3">
                  <h4 className="text-[10px] font-black text-uzum-muted uppercase tracking-widest border-b border-white/50 pb-2">Состав заказа</h4>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-uzum-muted font-medium">{item.quantity}x {item.productName}</span>
                      <span className="font-bold text-uzum-text">{(item.price || 0).toLocaleString()} сум</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-white/50 flex justify-between items-center font-bold text-lg text-uzum-primary">
                    <span>{t('total')}</span>
                    <span>{(order.totalPrice || 0).toLocaleString()} сум</span>
                  </div>
                </div>

                {activeTab === 'deliveries' && (
                  <div className="h-60 rounded-3xl overflow-hidden border border-[#e2e5eb] relative shadow-inner">
                    <CourierNavigation
                      user={user}
                      orders={orders}
                      shops={shops}
                      activeOrderId={order.id}
                      onLocationUpdate={updateUserLocation}
                    />
                  </div>
                )}

                {activeTab === 'deliveries' && (
                  <div className="flex gap-3">
                    {order.orderStatus === 'confirmed' && (
                      <button
                        onClick={() => handleConfirmAction(() => updateStatus(order.id, 'on_way'), t('startDelivery'), t('areYouSure'))}
                        className="flex-1 py-5 bg-uzum-primary text-white rounded-2xl font-bold text-sm shadow-xl shadow-uzum-primary/20 flex items-center justify-center gap-2"
                      >
                        <Navigation size={20} /> {t('startDelivery')}
                      </button>
                    )}
                    {order.orderStatus === 'on_way' && (
                      <button
                        onClick={() => handleConfirmAction(() => updateStatus(order.id, 'delivered'), t('markDelivered'), t('areYouSure'))}
                        className="flex-1 py-5 bg-green-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-green-500/20 flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={20} /> {t('markDelivered')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 p-4 transition-all flex justify-around items-center z-50 ${theme === 'futuristic' ? 'glass-morphism border-t border-white/10 rounded-t-[2.5rem] pb-8' : 'bg-white border-t border-[#e2e5eb]'}`}>
        {[
          { id: 'deliveries', label: 'Доставка', icon: Truck },
          { id: 'warehouse', label: 'Склад', icon: Package },
          { id: 'history', label: 'История', icon: Clock },
          { id: 'profile', label: 'Профиль', icon: User }
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

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
      />

      <AnimatePresence>
        {showHandoverModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-md">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className={`w-full max-w-md rounded-t-[2.5rem] sm:rounded-[3rem] p-8 shadow-2xl transition-all border ${theme === 'futuristic' ? 'glass-morphism border-white/20' : 'bg-white border-stone-100'}`}
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className={`text-xl font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>Передача товара</h2>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>Заказ #{selectedOrder?.id}</p>
                </div>
                <button onClick={() => setShowHandoverModal(false)} className={`p-2 rounded-full transition-all ${theme === 'futuristic' ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-uzum-bg text-uzum-muted'}`}><X size={20} /></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>Способ оплаты</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cash', label: 'Наличные', icon: Banknote },
                      { id: 'card', label: 'Картой', icon: CreditCard },
                      { id: 'debt', label: 'В долг', icon: Clock }
                    ].map(method => (
                      <button
                        key={method.id}
                        onClick={() => setHandoverPayment(method.id as any)}
                        className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${handoverPayment === method.id
                          ? (theme === 'futuristic' ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-uzum-primary bg-uzum-primary/5 text-uzum-primary')
                          : (theme === 'futuristic' ? 'border-white/5 text-white/40 bg-white/5' : 'border-stone-100 text-stone-400 bg-stone-50')
                          }`}
                      >
                        <method.icon size={24} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {handoverPayment === 'debt' && (
                  <div className="space-y-3">
                    <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>Срок оплаты (Долг)</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className={`w-full p-4 rounded-2xl border-none outline-none font-bold text-sm ${theme === 'futuristic' ? 'bg-white/5 text-white' : 'bg-stone-50 text-stone-900'}`}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-3">
                    <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>Фото доставки</label>
                    <div className="relative">
                      {deliveryPhoto ? (
                        <div className={`relative w-full h-32 rounded-2xl overflow-hidden border-2 ${theme === 'futuristic' ? 'border-cyan-500' : 'border-uzum-primary'}`}>
                          <img src={deliveryPhoto} className="w-full h-full object-cover" />
                          <button onClick={() => setDeliveryPhoto(null)} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"><X size={16} /></button>
                        </div>
                      ) : (
                        <label className={`flex flex-col items-center justify-center w-full h-32 rounded-2xl border-2 border-dashed border-stone-200 cursor-pointer ${theme === 'futuristic' ? 'bg-white/5 border-white/10' : 'bg-stone-50 border-stone-100'}`}>
                          <Plus size={24} className="text-stone-300 mb-1" />
                          <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Фото</p>
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => setDeliveryPhoto(reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          }} />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>Фото накладной</label>
                    <div className="relative">
                      {invoicePhoto ? (
                        <div className={`relative w-full h-32 rounded-2xl overflow-hidden border-2 ${theme === 'futuristic' ? 'border-cyan-500' : 'border-uzum-primary'}`}>
                          <img src={invoicePhoto} className="w-full h-full object-cover" />
                          <button onClick={() => setInvoicePhoto(null)} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"><X size={16} /></button>
                        </div>
                      ) : (
                        <label className={`flex flex-col items-center justify-center w-full h-32 rounded-2xl border-2 border-dashed border-stone-200 cursor-pointer ${theme === 'futuristic' ? 'bg-white/5 border-white/10' : 'bg-stone-50 border-stone-100'}`}>
                          <Plus size={24} className="text-stone-300 mb-1" />
                          <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Накладная</p>
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => setInvoicePhoto(reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          }} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border flex justify-between items-center ${theme === 'futuristic' ? 'bg-white/5 border-white/5' : 'bg-stone-50 border-stone-100'}`}>
                  <span className={`text-xs font-bold uppercase tracking-widest ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-500'}`}>К оплате:</span>
                  <span className={`text-xl font-black ${theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-primary'}`}>{(selectedOrder?.totalPrice || 0).toLocaleString()} сум</span>
                </div>

                <button
                  onClick={handleHandover}
                  className={`w-full py-5 text-white rounded-2xl font-bold text-sm shadow-xl uppercase tracking-widest transition-all ${theme === 'futuristic' ? 'bg-gradient-to-r from-cyan-600 to-purple-600 shadow-cyan-500/20' : 'bg-uzum-primary shadow-uzum-primary/20'}`}
                >
                  Завершить передачу
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
