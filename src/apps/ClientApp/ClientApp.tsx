import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ShoppingCart, Package, Clock, User, LogOut, Plus, Minus, Trash2, MapPin, CreditCard, Wallet, Banknote, Play, ChevronRight, ChevronLeft, LayoutDashboard, Search, Users, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';



const MapEvents = ({ setCoords }: { setCoords: (coords: [number, number]) => void }) => {
  useMapEvents({
    click(e) {
      setCoords([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

import { BUKHARA_CENTER } from '../../context/DataContext';

export const ClientApp: React.FC = () => {
  const { products, categories, orders, banners, createOrder, users, debts, settings, updateUser } = useData();
  const { user: authUser, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  
  const user = users.find(u => u.id === authUser?.id) || authUser;
  const [activeTab, setActiveTab] = useState<'menu' | 'orders' | 'profile'>('menu');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<{ product: any, quantity: number }[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [paymentType, setPaymentType] = useState<'payme' | 'click' | 'cash' | 'uzum_nasiya'>('cash');
  const [currentBanner, setCurrentBanner] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [currentProductImage, setCurrentProductImage] = useState(0);
  const [userPhotoPreview, setUserPhotoPreview] = useState<string | null>(user?.photo || null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; onConfirm: () => void; title?: string; message?: string }>({ isOpen: false, onConfirm: () => {} });

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
    if (banners.length > 0) {
      const timer = setInterval(() => {
        setCurrentBanner(prev => (prev + 1) % banners.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [banners]);

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory ? p.categoryId === selectedCategory : true;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const total = cart.reduce((sum, item) => {
    const price = item.product.discountPrice || item.product.price;
    return sum + price * item.quantity;
  }, 0);

  const handleCheckout = async () => {
    if (!location) return alert(t('address'));
    handleConfirmAction(async () => {
      await createOrder({
        clientId: user?.id,
        clientPhone: user?.phone,
        items: cart.map(item => ({ ...item.product, quantity: item.quantity, price: item.product.discountPrice || item.product.price })),
        totalPrice: total,
        paymentType,
        location,
        latitude: coords ? coords[0] : undefined,
        longitude: coords ? coords[1] : undefined
      });
      setCart([]);
      setShowCart(false);
      setActiveTab('orders');
    }, t('confirmOrder'), t('areYouSure'));
  };

  const myOrders = orders.filter(o => o.clientId === user?.id);
  const myDebts = debts.filter(d => d.clientId === user?.id);

  return (
    <div className="min-h-screen bg-[#f2f4f7] text-uzum-text pb-24 font-sans">
      {/* Header */}
      <header className="bg-white p-4 sticky top-0 z-30 border-b border-[#e2e5eb] space-y-3">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-uzum-primary tracking-tighter">UZBECHKA</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => setLanguage(language === 'ru' ? 'uz' : 'ru')} className="text-xs font-bold text-uzum-muted uppercase">
              {language === 'ru' ? 'UZ' : 'RU'}
            </button>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-uzum-muted uppercase tracking-widest">Client</span>
              <span className="text-xs font-bold text-uzum-text">{user?.name}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-uzum-bg overflow-hidden border-2 border-white shadow-sm">
              {user?.photo ? (
                <img src={user.photo} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-uzum-muted">
                  <User size={20} />
                </div>
              )}
            </div>
            <button onClick={logout} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all">
              <LogOut size={20} />
            </button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-uzum-muted" size={18} />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Искать в Uzbechka..."
            className="w-full pl-11 pr-4 py-3 bg-uzum-bg rounded-xl border-none outline-none focus:ring-2 focus:ring-uzum-primary/20 text-sm font-medium transition-all"
          />
        </div>
      </header>

      <main className="p-4 space-y-6">
        {activeTab === 'menu' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="space-y-6"
          >
            {/* Banners Carousel */}
            {banners.filter(b => b.isActive).length > 0 && (
              <div className="relative h-44 rounded-2xl overflow-hidden shadow-sm group">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentBanner}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0"
                  >
                    <img src={banners.filter(b => b.isActive)[currentBanner % banners.filter(b => b.isActive).length].imageUrl} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex flex-col justify-end p-6">
                      <h2 className="text-white text-xl font-bold leading-tight">{banners.filter(b => b.isActive)[currentBanner % banners.filter(b => b.isActive).length].title}</h2>
                    </div>
                  </motion.div>
                </AnimatePresence>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {banners.filter(b => b.isActive).map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentBanner % banners.filter(b => b.isActive).length ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} />
                  ))}
                </div>
              </div>
            )}

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-5 py-2 rounded-xl whitespace-nowrap text-sm font-semibold transition-all ${!selectedCategory ? 'bg-uzum-primary text-white' : 'bg-white text-uzum-text border border-[#e2e5eb]'}`}
              >
                {t('all')}
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-5 py-2 rounded-xl whitespace-nowrap text-sm font-semibold transition-all ${selectedCategory === cat.id ? 'bg-uzum-primary text-white' : 'bg-white text-uzum-text border border-[#e2e5eb]'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map(product => (
                <motion.div 
                  key={product.id}
                  layout
                  className="bg-white rounded-xl overflow-hidden border border-[#e2e5eb] flex flex-col"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-uzum-bg cursor-pointer" onClick={() => { setSelectedProduct(product); setCurrentProductImage(0); }}>
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    {product.discountPrice && (
                      <div className="absolute bottom-2 left-2 bg-uzum-primary text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        Акция
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <h3 className="text-xs font-medium text-uzum-text line-clamp-2 mb-2 h-8 leading-tight">{product.name}</h3>
                    
                    <div className="mt-auto">
                      {product.discountPrice ? (
                        <div className="flex flex-col">
                          <span className="text-[10px] text-uzum-muted line-through">{(product.price || 0).toLocaleString()}</span>
                          <span className="text-sm font-bold text-uzum-text">{(product.discountPrice || 0).toLocaleString()} сум</span>
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-uzum-text">{(product.price || 0).toLocaleString()} сум</span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => addToCart(product)}
                      className="mt-3 w-full py-2 border border-uzum-primary/20 text-uzum-primary rounded-lg flex items-center justify-center hover:bg-uzum-primary/5 transition-all active:scale-95"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'orders' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="space-y-4"
          >
            <h2 className="text-xl font-bold">{t('myOrders')}</h2>
            {myOrders.length === 0 ? (
              <div className="text-center py-20 text-uzum-muted">
                <Package size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-sm font-medium">{t('noOrders')}</p>
              </div>
            ) : (
              myOrders.map(order => (
                <div key={order.id} className="bg-white p-6 rounded-3xl border border-[#e2e5eb] shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-uzum-muted uppercase tracking-widest">Заказ #{order.id}</span>
                    <div className="flex gap-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                        order.orderStatus === 'delivered' ? 'bg-green-100 text-green-600' :
                        order.orderStatus === 'cancelled' ? 'bg-red-100 text-red-600' :
                        'bg-uzum-primary/10 text-uzum-primary'
                      }`}>
                        {order.orderStatus.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                      order.paymentStatus === 'paid' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                    }`}>
                      {order.paymentStatus === 'paid' ? 'Оплачено' : 'Ожидает оплаты'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                      order.collectionStatus === 'collected' ? 'bg-blue-100 text-blue-600' : 'bg-stone-100 text-stone-600'
                    }`}>
                      {order.collectionStatus === 'collected' ? 'Собрано' : 'В сборке'}
                    </span>
                  </div>

                  <div className="space-y-2 bg-uzum-bg p-4 rounded-2xl">
                    {order.items.map(item => (
                      <div key={item.id} className="flex justify-between text-sm font-medium">
                        <span className="text-uzum-muted">{item.quantity}x {item.productName}</span>
                        <span className="text-uzum-text">{((item.price || 0) * (item.quantity || 0)).toLocaleString()} сум</span>
                      </div>
                    ))}
                    <div className="border-t border-white/50 pt-2 mt-2 flex justify-between font-bold text-lg">
                      <span className="text-uzum-primary">{t('total')}</span>
                      <span className="text-uzum-text">{(order.totalPrice || 0).toLocaleString()} сум</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-uzum-muted font-bold uppercase tracking-widest">
                    <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                    <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'profile' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-[#e2e5eb] flex items-center gap-4 relative overflow-hidden group">
              <div className="w-16 h-16 bg-uzum-bg rounded-full flex items-center justify-center text-uzum-primary overflow-hidden border-2 border-white shadow-sm relative">
                {user?.photo ? (
                  <img src={user.photo} className="w-full h-full object-cover" />
                ) : (
                  <User size={32} />
                )}
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <Plus size={16} className="text-white" />
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
              </div>
              <div>
                <h2 className="text-lg font-bold">{user?.name}</h2>
                <p className="text-sm text-uzum-muted">{user?.phone}</p>
              </div>
            </div>

            {myDebts.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-red-500">
                  <CreditCard size={20} />
                  <h3 className="font-bold text-sm uppercase tracking-widest">{t('debts')}</h3>
                </div>
                <div className="space-y-3">
                  {myDebts.map(debt => (
                    <div key={debt.id} className="flex justify-between items-center p-3 bg-red-50 rounded-xl">
                      <div>
                        <p className="text-xs font-bold text-red-600">{(debt.amount || 0).toLocaleString()} UZS</p>
                        <p className="text-[10px] text-red-400 font-medium">{debt.dueDate ? new Date(debt.dueDate).toLocaleDateString() : '-'}</p>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-red-500">{debt.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-[#e2e5eb] overflow-hidden">
              <button 
                onClick={() => { setShowCart(true); setActiveTab('menu'); }}
                className="w-full p-4 flex justify-between items-center border-b border-[#f2f4f7] hover:bg-uzum-bg transition-all"
              >
                <div className="flex items-center gap-3">
                  <MapPin size={20} className="text-uzum-muted" />
                  <span className="text-sm font-medium">{t('address')}</span>
                </div>
                <ChevronRight size={18} className="text-uzum-muted" />
              </button>
              <button 
                onClick={() => { setShowCart(true); setActiveTab('menu'); }}
                className="w-full p-4 flex justify-between items-center border-b border-[#f2f4f7] hover:bg-uzum-bg transition-all"
              >
                <div className="flex items-center gap-3">
                  <CreditCard size={20} className="text-uzum-muted" />
                  <span className="text-sm font-medium">{t('paymentMethod')}</span>
                </div>
                <ChevronRight size={18} className="text-uzum-muted" />
              </button>
              <button 
                onClick={() => {
                  if ('contacts' in navigator && 'ContactsManager' in window) {
                    // @ts-ignore
                    navigator.contacts.select(['name', 'tel'], { multiple: true });
                  } else {
                    alert('Ваше устройство не поддерживает прямой доступ к контактам через браузер, но разрешение добавлено в систему.');
                  }
                }}
                className="w-full p-4 flex justify-between items-center border-b border-[#f2f4f7] hover:bg-uzum-bg transition-all"
              >
                <div className="flex items-center gap-3">
                  <Users size={20} className="text-uzum-muted" />
                  <span className="text-sm font-medium">Импорт контактов</span>
                </div>
                <ChevronRight size={18} className="text-uzum-muted" />
              </button>
              <button 
                onClick={logout}
                className="w-full p-4 flex justify-between items-center text-red-500 hover:bg-red-50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <LogOut size={20} />
                  <span className="text-sm font-medium">{t('signOut')}</span>
                </div>
                <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e2e5eb] px-2 py-3 flex justify-around items-center z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {[
          { id: 'menu', img: 'https://picsum.photos/seed/menu/100/100', label: t('menu'), color: 'bg-uzum-primary' },
          { id: 'cart', img: 'https://picsum.photos/seed/cart/100/100', label: t('cart'), color: 'bg-orange-500' },
          { id: 'orders', img: 'https://picsum.photos/seed/clock/100/100', label: t('orders'), color: 'bg-green-500' },
          { id: 'profile', img: 'https://picsum.photos/seed/user/100/100', label: t('profile'), color: 'bg-stone-500' },
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => {
              if (item.id === 'cart') {
                setShowCart(true);
              } else {
                setActiveTab(item.id as any);
              }
            }}
            className={`flex flex-col items-center gap-1 transition-all relative ${
              activeTab === item.id ? 'scale-110' : 'opacity-70'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl shadow-md overflow-hidden border-2 ${activeTab === item.id ? 'border-uzum-primary' : 'border-transparent'}`}>
              <img src={item.img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            {item.id === 'cart' && cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
            <span className={`text-[8px] font-black uppercase tracking-tighter ${activeTab === item.id ? 'text-uzum-primary' : 'text-uzum-muted'}`}>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Cart Modal */}
      <AnimatePresence>
        {showCart && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white w-full rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl"
            >
              <div className="p-5 border-b border-[#f2f4f7] flex justify-between items-center">
                <h2 className="text-lg font-bold">{t('checkout')}</h2>
                <button onClick={() => setShowCart(false)} className="text-uzum-muted text-sm font-medium">{t('cancel')}</button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {cart.length === 0 ? (
                  <div className="text-center py-16 text-uzum-muted">
                    <ShoppingCart size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-medium">Ваша корзина пуста</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.product.id} className="flex gap-4 items-center">
                      <img src={item.product.image} className="w-16 h-16 rounded-lg object-cover bg-uzum-bg" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-uzum-text truncate">{item.product.name}</h4>
                        <p className="text-uzum-primary font-bold text-sm mt-0.5">
                          {((item.product.discountPrice || item.product.price) || 0).toLocaleString()} сум
                        </p>
                      </div>
                      <div className="flex items-center gap-3 bg-uzum-bg rounded-lg p-1.5">
                        <button onClick={() => updateQuantity(item.product.id, -1)} className="text-uzum-muted"><Minus size={14} /></button>
                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, 1)} className="text-uzum-muted"><Plus size={14} /></button>
                      </div>
                      <button onClick={() => removeFromCart(item.product.id)} className="text-red-400 p-1"><Trash2 size={18} /></button>
                    </div>
                  ))
                )}

                {cart.length > 0 && (
                  <div className="space-y-5 pt-5 border-t border-[#f2f4f7]">
                    <div>
                      <label className="block text-xs font-bold text-uzum-muted uppercase mb-2">{t('address')}</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-uzum-muted" size={18} />
                        <input 
                          type="text" 
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Введите адрес доставки..."
                          className="w-full pl-10 pr-4 py-3 bg-uzum-bg rounded-xl border-none outline-none text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-uzum-muted uppercase">{t('location')} на карте</label>
                      <div className="rounded-xl overflow-hidden border border-[#e2e5eb] h-40 relative flex items-center justify-center bg-stone-50">
                        <MapContainer 
                          center={BUKHARA_CENTER} 
                          zoom={13} 
                          className="h-full w-full z-0"
                        >
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          <MapEvents setCoords={setCoords} />
                          {coords && <Marker position={coords} />}
                        </MapContainer>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-uzum-muted uppercase mb-2">{t('paymentMethod')}</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'payme', icon: Wallet, label: 'Payme' },
                          { id: 'click', icon: CreditCard, label: 'Click' },
                          { id: 'uzum_nasiya', icon: Sparkles, label: 'Uzum Nasiya' },
                          { id: 'cash', icon: Banknote, label: 'Нал' }
                        ].map(method => (
                          <button 
                            key={method.id}
                            onClick={() => setPaymentType(method.id as any)}
                            className={`py-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${paymentType === method.id ? 'border-uzum-primary bg-uzum-primary/5 text-uzum-primary' : 'border-[#e2e5eb] text-uzum-muted bg-white'}`}
                          >
                            <method.icon size={20} />
                            <span className="text-[10px] font-bold">{method.label}</span>
                          </button>
                        ))}
                      </div>
                      {(paymentType === 'click' || paymentType === 'payme') && (
                        <div className="mt-4 p-4 bg-uzum-primary/5 border border-uzum-primary/10 rounded-2xl">
                          <p className="text-[10px] font-black text-uzum-primary uppercase tracking-widest mb-1">Реквизиты для оплаты</p>
                          <p className="text-sm font-bold text-uzum-text">
                            {paymentType === 'click' ? settings.click_card : settings.payme_card}
                          </p>
                          <p className="text-[9px] text-uzum-muted mt-2">После оплаты прикрепите скриншот или сообщите оператору.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-[#f2f4f7] bg-white">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-uzum-muted font-medium text-sm">{t('total')}:</span>
                  <span className="text-xl font-bold text-uzum-text">{(total || 0).toLocaleString()} сум</span>
                </div>
                <button 
                  disabled={cart.length === 0}
                  onClick={handleCheckout}
                  className="w-full py-4 bg-uzum-primary text-white font-bold text-sm rounded-xl shadow-lg shadow-uzum-primary/20 disabled:opacity-50 transition-all active:scale-95"
                >
                  {t('confirmOrder')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedProduct && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="relative h-80 bg-stone-100">
                <img 
                  src={selectedProduct.images?.[currentProductImage] || selectedProduct.image} 
                  className="w-full h-full object-cover" 
                />
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-4 right-4 p-2 bg-black/20 backdrop-blur-md text-white rounded-full"
                >
                  <X size={20} />
                </button>
                
                {selectedProduct.images && selectedProduct.images.length > 1 && (
                  <>
                    <button 
                      onClick={() => setCurrentProductImage(prev => (prev - 1 + selectedProduct.images.length) % selectedProduct.images.length)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-md text-white rounded-full"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button 
                      onClick={() => setCurrentProductImage(prev => (prev + 1) % selectedProduct.images.length)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-md text-white rounded-full"
                    >
                      <ChevronRight size={20} />
                    </button>
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1">
                      {selectedProduct.images.map((_: any, i: number) => (
                        <div key={i} className={`h-1 rounded-full transition-all ${i === currentProductImage ? 'w-4 bg-white' : 'w-1 bg-white/50'}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              <div className="p-8 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-bold text-stone-800">{selectedProduct.name}</h3>
                    <p className="text-sm text-stone-400 font-medium">{selectedProduct.categoryName || 'Категория'}</p>
                  </div>
                  <div className="text-right">
                    {selectedProduct.discountPrice ? (
                      <>
                        <p className="text-xs text-stone-400 line-through">{(selectedProduct.price || 0).toLocaleString()} сум</p>
                        <p className="text-xl font-black text-uzum-primary">{(selectedProduct.discountPrice || 0).toLocaleString()} сум</p>
                      </>
                    ) : (
                      <p className="text-xl font-black text-uzum-primary">{(selectedProduct.price || 0).toLocaleString()} сум</p>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-stone-600 leading-relaxed">{selectedProduct.description}</p>
                
                <div className="pt-4 flex gap-4">
                  <button 
                    onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                    className="flex-1 py-4 bg-uzum-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-uzum-primary/20"
                  >
                    Добавить в корзину
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
      />
    </div>
  );
};
