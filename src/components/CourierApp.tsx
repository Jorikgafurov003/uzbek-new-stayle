import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Truck, CheckCircle, LogOut, MapPin, Phone, Clock, Navigation, Package, ChevronDown, ChevronUp, Store, Users, Plus, Volume2, CreditCard, Banknote, Calendar, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { ConfirmDialog } from './ConfirmDialog';


import { BUKHARA_CENTER } from '../context/DataContext';
import { Routing } from './Routing';
import { courierIcon, storeIcon } from '../utils/MapIcons';

const STORE_LOCATION = BUKHARA_CENTER;

export const CourierApp: React.FC = () => {
  const { orders, updateOrder, users, updateUserLocation, updateUser, speak, addDebt, products, isOnline } = useData();
  const { logout, user: authUser } = useAuth();
  const { t } = useLanguage();
  
  const user = users.find(u => u.id === authUser?.id) || authUser;
  const [activeTab, setActiveTab] = useState<'deliveries' | 'warehouse' | 'history' | 'profile'>('deliveries');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [userPhotoPreview, setUserPhotoPreview] = useState<string | null>(user?.photo || null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; onConfirm: () => void; title?: string; message?: string }>({ isOpen: false, onConfirm: () => {} });
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [handoverPayment, setHandoverPayment] = useState<'cash' | 'card' | 'debt'>('cash');
  const [dueDate, setDueDate] = useState('');
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);

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
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          updateUserLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.speed || 0);
        },
        (err) => console.error('Geolocation error:', err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const myDeliveries = orders.filter(o => o.courierId === user?.id && (o.orderStatus === 'confirmed' || o.orderStatus === 'on_way'));
  const historyDeliveries = orders.filter(o => o.courierId === user?.id && o.orderStatus === 'delivered');

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
    }
  };

  const handleHandover = async () => {
    if (!selectedOrder) return;
    if (!deliveryPhoto) return alert('Пожалуйста, сделайте фотоотчет о доставке');

    const updates: any = { orderStatus: 'delivered', deliveryPhoto };
    
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
    setShowHandoverModal(false);
    setSelectedOrder(null);
  };

  return (
    <div className="min-h-screen bg-[#f2f4f7] pb-24 font-sans">
      <header className="bg-white p-4 shadow-sm flex justify-between items-center sticky top-0 z-30 border-b border-[#e2e5eb]">
        <h1 className="text-2xl font-black text-uzum-primary tracking-tighter">UZBECHKA</h1>
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
        <div className="space-y-4">
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
                  <div key={product.id} className="bg-white p-4 rounded-[2rem] border border-[#e2e5eb] shadow-sm flex gap-4 items-center">
                    <div className="w-16 h-16 bg-uzum-bg rounded-2xl overflow-hidden flex-shrink-0">
                      <img src={product.image} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-uzum-text text-sm">{product.name}</h4>
                      <p className="text-[10px] text-uzum-muted font-medium uppercase tracking-widest">{product.categoryName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-uzum-muted uppercase tracking-widest mb-1">На складе</p>
                      <p className={`text-lg font-black ${product.stock && product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {product.stock || 0} шт
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-[#e2e5eb] text-center space-y-6 relative group overflow-hidden">
              <div className="w-32 h-32 bg-uzum-bg rounded-full mx-auto flex items-center justify-center border-4 border-uzum-primary/10 overflow-hidden relative">
                {user?.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : <Truck size={48} className="text-uzum-primary" />}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-uzum-text">{user?.name}</h2>
                <p className="text-uzum-muted font-bold uppercase tracking-widest text-xs mt-1">{user?.phone}</p>
              </div>
              <button onClick={logout} className="w-full p-4 bg-red-50 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-2">
                <LogOut size={20} /> Выйти
              </button>
            </motion.div>
          )}

          {(activeTab === 'deliveries' || activeTab === 'history') && (activeTab === 'deliveries' ? myDeliveries : historyDeliveries).map(order => (
            <motion.div 
              layout
              key={order.id} 
              className="bg-white rounded-[2rem] shadow-sm border border-[#e2e5eb] overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-uzum-muted uppercase tracking-widest">Заказ #{order.id}</span>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                      order.paymentStatus === 'paid' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
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
                  </div>
                  <a href={`tel:${order.clientPhone}`} className="p-4 bg-uzum-primary text-white rounded-2xl shadow-lg shadow-uzum-primary/20">
                    <Phone size={24} />
                  </a>
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
                    <MapContainer 
                      center={order.latitude && order.longitude ? [(STORE_LOCATION[0] + order.latitude) / 2, (STORE_LOCATION[1] + order.longitude) / 2] : STORE_LOCATION} 
                      zoom={13} 
                      className="h-full w-full z-0"
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={STORE_LOCATION as [number, number]} icon={storeIcon} />
                      {order.latitude && order.longitude && <Marker position={[order.latitude, order.longitude]} />}
                      {user.lat && user.lng && <Marker position={[user.lat, user.lng]} icon={courierIcon} />}
                      {order.latitude && order.longitude && <Routing from={STORE_LOCATION as [number, number]} to={[order.latitude, order.longitude]} />}
                    </MapContainer>
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
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e2e5eb] p-4 flex justify-around items-center z-50">
        {[
          { id: 'deliveries', label: 'Доставка', icon: Truck },
          { id: 'warehouse', label: 'Склад', icon: Package },
          { id: 'history', label: 'История', icon: Clock },
          { id: 'profile', label: 'Профиль', icon: User }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'text-uzum-primary scale-110' : 'text-uzum-muted opacity-70'}`}
          >
            <tab.icon size={24} />
            <span className="text-[8px] font-black uppercase tracking-tighter">{tab.label}</span>
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
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-black text-uzum-text uppercase tracking-widest">Передача товара</h2>
                  <p className="text-[10px] font-black text-uzum-muted uppercase tracking-widest">Заказ #{selectedOrder?.id}</p>
                </div>
                <button onClick={() => setShowHandoverModal(false)} className="p-2 bg-uzum-bg rounded-full text-uzum-muted"><X size={20} /></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-uzum-muted uppercase tracking-widest ml-1">Способ оплаты</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cash', label: 'Наличные', icon: Banknote },
                      { id: 'card', label: 'Картой', icon: CreditCard },
                      { id: 'debt', label: 'В долг', icon: Clock }
                    ].map(method => (
                      <button 
                        key={method.id}
                        onClick={() => setHandoverPayment(method.id as any)}
                        className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                          handoverPayment === method.id 
                            ? 'border-uzum-primary bg-uzum-primary/5 text-uzum-primary' 
                            : 'border-stone-100 text-stone-400 bg-stone-50'
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
                    <label className="block text-[10px] font-black text-uzum-muted uppercase tracking-widest ml-1">Срок оплаты (Долг)</label>
                    <input 
                      type="date" 
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full p-4 rounded-2xl bg-stone-50 border-none outline-none font-bold text-sm"
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-uzum-muted uppercase tracking-widest ml-1">Фотоотчет доставки</label>
                  <div className="relative">
                    {deliveryPhoto ? (
                      <div className="relative w-full h-40 rounded-2xl overflow-hidden border-2 border-uzum-primary">
                        <img src={deliveryPhoto} className="w-full h-full object-cover" />
                        <button onClick={() => setDeliveryPhoto(null)} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"><X size={16} /></button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-40 rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 cursor-pointer">
                        <Plus size={32} className="text-stone-300 mb-2" />
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Сделать фото</p>
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

                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">К оплате:</span>
                  <span className="text-xl font-black text-uzum-primary">{(selectedOrder?.totalPrice || 0).toLocaleString()} сум</span>
                </div>

                <button 
                  onClick={handleHandover}
                  className="w-full py-5 bg-uzum-primary text-white rounded-2xl font-bold text-sm shadow-xl shadow-uzum-primary/20 uppercase tracking-widest"
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
