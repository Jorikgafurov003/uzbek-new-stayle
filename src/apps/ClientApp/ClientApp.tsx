import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ShoppingCart, Package, Clock, User, LogOut, Plus, Minus, Trash2, MapPin, CreditCard, Wallet, Banknote, Play, ChevronRight, ChevronLeft, LayoutDashboard, Search, Users, Sparkles, X, LocateFixed, Loader2, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';

const StarRating: React.FC<{ rating: number, size?: number, interactive?: boolean, onChange?: (val: number) => void }> = ({ rating, size = 12, interactive = false, onChange }) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          size={size}
          className={`transition-all ${star <= (hover || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-stone-300'}`}
          onClick={() => interactive && onChange && onChange(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          style={{ cursor: interactive ? 'pointer' : 'default' }}
        />
      ))}
    </div>
  );
};



const MapEvents = ({ coords, setCoords }: { coords: [number, number] | null, setCoords: (coords: [number, number]) => void }) => {
  const map = useMapEvents({
    click(e) {
      setCoords([e.latlng.lat, e.latlng.lng]);
    },
  });

  useEffect(() => {
    if (coords) {
      map.flyTo(coords, 15);
    }
  }, [coords, map]);

  return null;
};

import { BUKHARA_CENTER } from '../../context/DataContext';

export const ClientApp: React.FC = () => {
  const { products, categories, orders, banners, createOrder, users, debts, settings, updateUser, theme, setTheme, brandTheme, setBrandTheme } = useData();
  const { user: authUser, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const user = users.find(u => u.id === authUser?.id) || authUser;
  const [activeTab, setActiveTab] = useState<'menu' | 'catalog' | 'orders' | 'profile'>('menu');
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
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; onConfirm: () => void; title?: string; message?: string }>({ isOpen: false, onConfirm: () => { } });
  const [isLocating, setIsLocating] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingOrder, setRatingOrder] = useState<any>(null);
  const { apiFetch, refreshData } = useData();

  useEffect(() => {
    const unratedDelivered = orders.find(o => o.clientId === authUser?.id && o.orderStatus === 'delivered' && !o.isRated);
    if (unratedDelivered) {
      setRatingOrder(unratedDelivered);
      setShowRatingModal(true);
    }
  }, [orders, authUser]);

  const submitRating = async (ratings: any) => {
    try {
      await apiFetch(`/api/ratings/order/${ratingOrder.id}`, {
        method: 'POST',
        body: JSON.stringify(ratings)
      });
      setShowRatingModal(false);
      setRatingOrder(null);
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Геолокация не поддерживается вашим браузером');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords([latitude, longitude]); // Set coords immediately so map marker appears

        try {
          // Reverse geocode via Nominatim OSM with proper headers to prevent 403
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
            headers: {
              'Accept-Language': 'ru-RU,ru;q=0.9',
              'User-Agent': 'UzbechkaDeliveryApp/1.0'
            }
          });

          if (!res.ok) throw new Error('Network response was not ok');

          const data = await res.json();
          if (data && data.display_name) {
            // Simplify address display (take first 3 parts if too long)
            const addressParts = data.display_name.split(', ');
            const shortAddress = addressParts.slice(0, 3).join(', ');
            setLocation(shortAddress || data.display_name);
          } else {
            setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          }
        } catch (error) {
          console.error('Ошибка при получении адреса:', error);
          setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`); // Fallback to raw coords
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        console.error('Geolocation error:', error);

        let errorMsg = 'Не удалось получить геоданные.';
        if (error.code === 1) errorMsg += ' Разрешите доступ к геолокации в настройках браузера (значок замочка слева от адресной строки).';
        else if (error.code === 2) errorMsg += ' Сеть недоступна или позиция не определена.';
        else if (error.code === 3) errorMsg += ' Превышено время ожидания.';

        alert(errorMsg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (showCart && !coords && !location && !isLocating) {
      handleGetLocation();
    }
  }, [showCart]);

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

  const activeBanners = banners.filter(b => b.isActive);
  const slides = activeBanners.flatMap(b => {
    const bannerImages = (b.images && b.images.length > 0) ? b.images : [b.imageUrl];
    return bannerImages.map((img, i) => ({ bannerId: b.id, title: b.title, imageUrl: img, key: `${b.id}-${i}` }));
  });

  useEffect(() => {
    if (slides.length > 0) {
      const timer = setInterval(() => {
        setCurrentBanner(prev => (prev + 1) % slides.length);
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [slides.length]);

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
    <div className={`min-h-screen pb-24 font-sans transition-all duration-500 ${theme === 'futuristic' ? 'bg-futuristic-bg text-white' : 'bg-uzum-bg text-uzum-text'}`}>
      {/* Header */}
      <header className={`p-4 sticky top-0 z-30 transition-all ${theme === 'futuristic' ? 'glass-morphism border-b border-white/5 shadow-2xl' : 'bg-white border-b border-uzum-border shadow-sm'}`}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl font-black tracking-tighter transition-all flex items-center gap-2 ${theme === 'futuristic' ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-500 drop-shadow-neon' : 'text-uzum-primary'}`}>
              <img src="/logo.png" alt="Logo" className="h-8 object-contain" />
              UZBECHKA <span className="text-sm font-bold text-stone-500 tracking-normal hidden sm:inline">DENAN bekary</span>
            </h1>
            <div className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${theme === 'futuristic' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-uzum-primary/5 text-uzum-primary border border-uzum-primary/10'}`}>MARKET</div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setLanguage(language === 'ru' ? 'uz' : 'ru')} className={`text-xs font-black p-2 rounded-xl transition-all ${theme === 'futuristic' ? 'bg-white/5 text-white/60 hover:text-white' : 'bg-uzum-bg text-uzum-muted hover:text-uzum-primary'}`}>
              {language === 'ru' ? 'UZ' : 'RU'}
            </button>
            <div className="flex flex-col items-end">
              <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>Cabinet</span>
              <span className="text-xs font-bold truncate max-w-[80px]">{user?.name}</span>
            </div>
            <div className={`w-10 h-10 rounded-full overflow-hidden border-2 shadow-sm ${theme === 'futuristic' ? 'bg-white/5 border-white/10' : 'bg-uzum-bg border-white'}`}>
              {user?.photo ? (
                <img src={user.photo} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-uzum-muted">
                  <User size={20} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative group">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${theme === 'futuristic' ? 'text-purple-400/60 group-focus-within:text-purple-400' : 'text-uzum-muted group-focus-within:text-uzum-primary'}`} size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Искать в Uzbechka..."
            className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border-none outline-none transition-all text-sm font-medium ${theme === 'futuristic' ? 'bg-white/5 border border-white/5 focus:bg-white/10 text-white placeholder:text-white/30 focus:shadow-neon focus:border-purple-500/50' : 'bg-uzum-bg focus:bg-white focus:ring-4 focus:ring-uzum-primary/10 border border-transparent focus:border-uzum-primary/20 shadow-inner'}`}
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
            {slides.length > 0 && (
              <div className="relative h-56 -mx-4 overflow-hidden group">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={slides[currentBanner % slides.length].key}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="absolute inset-0"
                  >
                    <img
                      src={slides[currentBanner % slides.length].imageUrl}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex flex-col justify-end p-8">
                      <motion.h2
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-white text-2xl font-black leading-tight tracking-tight max-w-[80%]"
                      >
                        {slides[currentBanner % slides.length].title}
                      </motion.h2>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Navigation Dots */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 px-4 z-10">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentBanner(i)}
                      className={`h-1 rounded-full transition-all duration-500 ${i === currentBanner % slides.length ? 'w-8 bg-white' : 'w-2 bg-white/40'
                        }`}
                    />
                  ))}
                </div>

                {/* Glass Blur Overlay on edges */}
                <div className="absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-black/10 to-transparent pointer-events-none" />
                <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-black/10 to-transparent pointer-events-none" />
              </div>
            )}

            {/* Categories */}
            <div className="flex gap-2.5 overflow-x-auto pb-4 pt-2 px-1 no-scrollbar">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-6 py-2.5 rounded-2xl whitespace-nowrap text-xs font-black transition-all ${!selectedCategory
                  ? (theme === 'futuristic' ? 'bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white shadow-neon border border-purple-400/20' : 'bg-uzum-primary text-white shadow-premium')
                  : (theme === 'futuristic' ? 'bg-white/5 text-white/50 border border-white/5 hover:bg-white/10 hover:text-white' : 'bg-white text-uzum-text border border-uzum-border hover:bg-gray-50')
                  }`}
              >
                {t('all')}
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-6 py-2.5 rounded-2xl whitespace-nowrap text-xs font-black transition-all ${selectedCategory === cat.id
                    ? (theme === 'futuristic' ? 'bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white shadow-neon border border-purple-400/20' : 'bg-uzum-primary text-white shadow-premium')
                    : (theme === 'futuristic' ? 'bg-white/5 text-white/50 border border-white/5 hover:bg-white/10 hover:text-white' : 'bg-white text-uzum-text border border-uzum-border hover:bg-gray-50')
                    }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 gap-4">
              {filteredProducts.map(product => (
                <motion.div
                  key={product.id}
                  layout
                  className={`rounded-3xl overflow-hidden flex flex-col transition-all duration-300 group ${theme === 'futuristic' ? 'glass-morphism border-white/5 hover:border-purple-500/50 hover:shadow-neon bg-black/20' : 'bg-white shadow-premium hover:shadow-xl border border-transparent hover:border-uzum-primary/10'}`}
                >
                  <div className="relative aspect-[4/5] overflow-hidden cursor-pointer group/card" onClick={() => { setSelectedProduct(product); setCurrentProductImage(0); }}>
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110" />
                    {product.videoUrl && (
                      <video 
                        src={product.videoUrl} 
                        className="video-miniature opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"
                        autoPlay 
                        muted 
                        loop 
                        playsInline
                      />
                    )}
                    {product.discountPrice && (
                      <div className={`absolute top-3 left-3 z-10 text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest backdrop-blur-md ${theme === 'futuristic' ? 'bg-purple-500/80 text-white border border-purple-400/30' : 'bg-red-500 text-white'}`}>
                        Sale
                      </div>
                    )}
                    {(product.rating > 0 || theme === 'futuristic') && (
                      <div className={`absolute top-2 right-2 z-10 backdrop-blur-md px-2 py-1 rounded-xl flex items-center gap-1.5 ${theme === 'futuristic' ? 'bg-black/60 border border-white/10' : 'bg-white/90 shadow-sm border border-black/5'}`}>
                        <Star size={10} className="fill-yellow-400 text-yellow-400" />
                        <span className={`text-[10px] font-black ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>{product.rating?.toFixed(1) || '0.0'}</span>
                        {product.ratingCount !== undefined && (
                          <span className={`text-[8px] opacity-60 ${theme === 'futuristic' ? 'text-white' : 'text-uzum-muted'}`}>({product.ratingCount})</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className={`text-[13px] font-medium line-clamp-2 mb-2 h-10 leading-tight transition-colors ${theme === 'futuristic' ? 'text-white/90 group-hover:text-purple-400' : 'text-uzum-text group-hover:text-uzum-primary'}`}>{product.name}</h3>

                    <div className="mt-auto">
                      <div className="flex flex-col mb-3">
                        {product.discountPrice ? (
                          <>
                            <span className={`text-[10px] line-through mb-0.5 ${theme === 'futuristic' ? 'text-white/30' : 'text-uzum-muted'}`}>{(product.price || 0).toLocaleString()} сум</span>
                            <span className={`text-sm tracking-tight font-black ${theme === 'futuristic' ? 'text-purple-400 drop-shadow-neon' : 'text-uzum-text'}`}>{(product.discountPrice || 0).toLocaleString()} сум</span>
                          </>
                        ) : (
                          <span className={`text-sm tracking-tight font-black ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>{(product.price || 0).toLocaleString()} сум</span>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                        className={`w-full py-2.5 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 text-xs font-black uppercase tracking-widest ${theme === 'futuristic' ? 'bg-white/5 text-purple-400 border border-white/5 hover:bg-purple-500 hover:text-white hover:border-purple-400 hover:shadow-neon' : 'bg-uzum-bg text-uzum-primary hover:bg-uzum-primary hover:text-white shadow-sm'}`}
                      >
                        <Plus size={14} strokeWidth={3} />
                        {t('add')}
                      </button>
                    </div>
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
                <div key={order.id} className={`p-6 rounded-[2.5rem] transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/5 shadow-xl' : 'bg-white border border-[#e2e5eb] shadow-sm'} space-y-4`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-muted'}`}>Заказ #{order.id}</span>
                    <div className="flex gap-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${order.orderStatus === 'delivered' ? (theme === 'futuristic' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600') :
                        order.orderStatus === 'cancelled' ? (theme === 'futuristic' ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600') :
                          (theme === 'futuristic' ? 'bg-cyan-500/20 text-cyan-400 neon-blue-glow' : 'bg-uzum-primary/10 text-uzum-primary')
                        }`}>
                        {order.orderStatus.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${order.paymentStatus === 'paid' ? (theme === 'futuristic' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600') : (theme === 'futuristic' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600')
                      }`}>
                      {order.paymentStatus === 'paid' ? 'Оплачено' : 'Ожидает'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${order.collectionStatus === 'collected' ? (theme === 'futuristic' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-100 text-blue-600') : (theme === 'futuristic' ? 'bg-white/5 text-white/40' : 'bg-stone-100 text-stone-600')
                      }`}>
                      {order.collectionStatus === 'collected' ? 'Собрано' : 'В сборке'}
                    </span>
                  </div>

                  <div className={`space-y-2 p-4 rounded-2xl ${theme === 'futuristic' ? 'bg-black/40 border border-white/5' : 'bg-uzum-bg'}`}>
                    {order.items.map(item => (
                      <div key={item.id} className="flex justify-between text-xs font-bold">
                        <span className={theme === 'futuristic' ? 'text-white/60' : 'text-uzum-muted'}>{item.quantity}x {item.productName}</span>
                        <span className={theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}>{((item.price || 0) * (item.quantity || 0)).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className={`border-t pt-2 mt-2 flex justify-between font-black text-base ${theme === 'futuristic' ? 'border-white/10' : 'border-white/50'}`}>
                      <span className={theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-primary'}>{t('total')}</span>
                      <span className={theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}>{(order.totalPrice || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className={`flex justify-between items-center text-[10px] font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white/20' : 'text-uzum-muted'}`}>
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
            <div className={`p-6 rounded-[2.5rem] transition-all flex items-center gap-4 relative overflow-hidden group ${theme === 'futuristic' ? 'glass-morphism border-white/5' : 'bg-white border border-[#e2e5eb]'}`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden border-2 shadow-sm relative transition-all ${theme === 'futuristic' ? 'bg-white/5 border-cyan-500/30 text-cyan-400' : 'bg-uzum-bg border-white text-uzum-primary'}`}>
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
                <h2 className="text-xl font-black tracking-tight">{user?.name}</h2>
                <p className={`text-xs font-bold ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{user?.phone}</p>
              </div>
            </div>

            {myDebts.length > 0 && (
              <div className={`p-6 rounded-2xl border shadow-sm space-y-3 ${theme === 'futuristic' ? 'glass-morphism border-red-500/20' : 'bg-white border-red-100'}`}>
                <div className="flex items-center gap-2 text-red-500">
                  <CreditCard size={20} />
                  <h3 className="font-bold text-sm uppercase tracking-widest">{t('debts')}</h3>
                </div>
                <div className="space-y-3">
                  {myDebts.map(debt => (
                    <div key={debt.id} className={`flex justify-between items-center p-3 rounded-xl ${theme === 'futuristic' ? 'bg-red-500/10' : 'bg-red-50'}`}>
                      <div>
                        <p className={`text-xs font-bold ${theme === 'futuristic' ? 'text-red-400' : 'text-red-600'}`}>{(debt.amount || 0).toLocaleString()} UZS</p>
                        <p className={`text-[10px] font-medium ${theme === 'futuristic' ? 'text-red-400/60' : 'text-red-400'}`}>{debt.dueDate ? new Date(debt.dueDate).toLocaleDateString() : '-'}</p>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-red-400' : 'text-red-500'}`}>{debt.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={`rounded-2xl border p-4 transition-all space-y-4 mb-4 ${theme === 'futuristic' ? 'glass-morphism border-white/5' : 'bg-white border-[#e2e5eb]'}`}>
              <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-3 w-1/2">
                  <div className={`p-2 rounded-xl flex-shrink-0 ${theme === 'futuristic' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-uzum-primary/10 text-uzum-primary'}`}>
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold leading-tight ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>Тема</h4>
                    <p className={`text-[9px] uppercase font-black tracking-widest ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>Стиль</p>
                  </div>
                </div>
                <div className="flex gap-2 w-1/2 justify-end">
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${theme === 'light' ? 'bg-gold text-white shadow-md' : 'bg-stone-50 text-stone-400 border border-stone-100 hover:bg-stone-100'}`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => setTheme('futuristic')}
                    className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${theme === 'futuristic' ? 'bg-cyan-500 text-white shadow-neon neon-glow' : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'}`}
                  >
                    Future
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center gap-4 border-t pt-4 border-dashed border-stone-200/50">
                <div className="flex items-center gap-3 w-1/3">
                  <div className={`p-2 rounded-xl flex-shrink-0 ${theme === 'futuristic' ? 'bg-purple-500/20 text-purple-400' : 'bg-uzum-primary/10 text-uzum-primary'}`}>
                    <LayoutDashboard size={20} />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold leading-tight ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>Бренд</h4>
                    <p className={`text-[9px] uppercase font-black tracking-widest ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>Дизайн</p>
                  </div>
                </div>
                <div className="flex gap-1.5 w-2/3 justify-end">
                  <button
                    onClick={() => setBrandTheme('uzum')}
                    className={`px-2 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex-1 ${brandTheme === 'uzum' ? 'bg-uzum-primary text-white shadow-md' : 'bg-stone-50 text-stone-400 border border-stone-100 hover:bg-stone-100'}`}
                  >
                    Uzum
                  </button>
                  <button
                    onClick={() => setBrandTheme('yandex')}
                    className={`px-2 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex-1 ${brandTheme === 'yandex' ? 'bg-yellow-400 text-black shadow-md' : 'bg-stone-50 text-stone-400 border border-stone-100 hover:bg-stone-100'}`}
                  >
                    Yandex
                  </button>
                  <button
                    onClick={() => setBrandTheme('ozon')}
                    className={`px-2 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex-1 ${brandTheme === 'ozon' ? 'bg-blue-600 text-white shadow-md' : 'bg-stone-50 text-stone-400 border border-stone-100 hover:bg-stone-100'}`}
                  >
                    Ozon
                  </button>
                </div>
              </div>
            </div>

            <div className={`rounded-2xl border overflow-hidden transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/5' : 'bg-white border-[#e2e5eb]'}`}>
              {[
                { label: t('address'), icon: MapPin, onClick: () => { setShowCart(true); setActiveTab('menu'); } },
                { label: t('paymentMethod'), icon: CreditCard, onClick: () => { setShowCart(true); setActiveTab('menu'); } },
                {
                  label: 'Импорт контактов', icon: Users, onClick: () => {
                    if ('contacts' in navigator && 'ContactsManager' in window) {
                      // @ts-ignore
                      navigator.contacts.select(['name', 'tel'], { multiple: true });
                    } else {
                      alert('Ваше устройство не поддерживает прямой доступ к контактам через браузер, но разрешение добавлено в систему.');
                    }
                  }
                },
                { label: t('signOut'), icon: LogOut, onClick: logout, weight: 'text-red-500' }
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={item.onClick}
                  className={`w-full p-4 flex justify-between items-center border-b transition-all ${theme === 'futuristic' ? 'border-white/5 hover:bg-white/5' : 'border-[#f2f4f7] hover:bg-uzum-bg'} ${item.weight || ''}`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={20} className={item.weight ? '' : (theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted')} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <ChevronRight size={18} className={item.weight ? '' : (theme === 'futuristic' ? 'text-white/20' : 'text-uzum-muted')} />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className={`fixed bottom-8 left-6 right-6 px-4 py-4 flex justify-around items-center z-40 transition-all rounded-[2rem] ${theme === 'futuristic' ? 'glass-morphism shadow-2xl' : 'bg-white/95 backdrop-blur-xl border border-uzum-border shadow-premium'}`}>
        {[
          { id: 'menu', icon: <LayoutDashboard size={20} />, label: t('home') },
          { id: 'cart', icon: <ShoppingCart size={20} />, label: t('cart') },
          { id: 'orders', icon: <Clock size={20} />, label: t('orders') },
          { id: 'profile', icon: <User size={20} />, label: t('profile') },
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
            className={`flex flex-col items-center justify-center min-w-[64px] transition-all duration-300 relative ${activeTab === item.id ? 'scale-105' : 'opacity-50 hover:opacity-100'}`}
          >
            <div className={`p-2 rounded-2xl transition-all duration-300 ${activeTab === item.id
              ? (theme === 'futuristic' ? 'text-purple-400 drop-shadow-neon' : 'text-uzum-primary bg-uzum-primary/5')
              : (theme === 'futuristic' ? 'text-white/60' : 'text-uzum-muted')
              }`}>
              {item.icon}
            </div>
            {item.id === 'cart' && cart.length > 0 && (
              <span className={`absolute top-1 right-2.5 text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 ${theme === 'futuristic' ? 'bg-purple-500 text-white border-black shadow-neon' : 'bg-uzum-primary text-white border-white shadow-sm'}`}>
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
            <span className={`text-[8px] font-black uppercase tracking-tight mt-1 transition-all ${activeTab === item.id ? 'opacity-100 h-2' : 'opacity-0 h-0'
              } ${theme === 'futuristic' ? 'text-purple-400' : 'text-uzum-primary'}`}>
              {item.label}
            </span>
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
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-end"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={`w-full rounded-t-[3rem] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden transition-all ${theme === 'futuristic' ? 'glass-morphism border-t border-white/20' : 'bg-white'}`}
            >
              <div className={`px-6 py-5 border-b flex justify-between items-center ${theme === 'futuristic' ? 'border-white/5' : 'border-uzum-border'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl scale-90 ${theme === 'futuristic' ? 'bg-purple-500/20 text-purple-400' : 'bg-uzum-primary/10 text-uzum-primary'}`}>
                    <ShoppingCart size={20} />
                  </div>
                  <h2 className={`text-lg font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>{t('cart')}</h2>
                </div>
                <button onClick={() => setShowCart(false)} className={`p-2.5 rounded-full transition-all ${theme === 'futuristic' ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-uzum-bg text-uzum-muted hover:text-uzum-primary'}`}><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                {cart.length === 0 ? (
                  <div className="text-center py-20">
                    <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${theme === 'futuristic' ? 'bg-white/5 text-white/10' : 'bg-uzum-bg text-uzum-muted/20'}`}>
                      <ShoppingCart size={48} />
                    </div>
                    <p className={`text-xs font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>Ваша корзина пуста</p>
                    <button onClick={() => setShowCart(false)} className={`mt-6 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${theme === 'futuristic' ? 'bg-white/10 text-white border border-white/10' : 'bg-uzum-primary text-white shadow-premium'}`}>К покупкам</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.product.id} className={`flex gap-4 items-center p-4 rounded-3xl transition-all ${theme === 'futuristic' ? 'bg-white/5 border border-white/5' : 'bg-uzum-bg/50 border border-uzum-border/50 shadow-sm'}`}>
                        <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-sm">
                          <img src={item.product.image} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-bold truncate ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>{item.product.name}</h4>
                          <p className={`font-black text-sm mt-1.5 ${theme === 'futuristic' ? 'text-purple-400' : 'text-uzum-primary'}`}>
                            {((item.product.discountPrice || item.product.price) || 0).toLocaleString()} сум
                          </p>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <button onClick={() => removeFromCart(item.product.id)} className="text-red-400 p-2 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={16} /></button>
                          <div className={`flex items-center gap-3 rounded-xl px-2.5 py-1.5 border ${theme === 'futuristic' ? 'bg-white/10 text-white border-white/10' : 'bg-white shadow-sm text-uzum-text border-uzum-border'}`}>
                            <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 hover:text-uzum-primary transition-colors"><Minus size={10} strokeWidth={3} /></button>
                            <span className="text-xs font-black min-w-[20px] text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 hover:text-uzum-primary transition-colors"><Plus size={10} strokeWidth={3} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}


                {cart.length > 0 && (
                  <div className="space-y-8">
                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-widest mb-3 ml-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('address')}</label>
                      <div className="relative">
                        <MapPin className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-muted'}`} size={18} />
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Введите адрес доставки..."
                          className={`w-full pl-12 pr-4 py-4 rounded-2xl border-none outline-none font-bold text-sm ${theme === 'futuristic' ? 'bg-white/5 text-white placeholder:text-white/20' : 'bg-uzum-bg text-uzum-text'}`}
                        />
                        <button
                          onClick={handleGetLocation}
                          disabled={isLocating}
                          className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${theme === 'futuristic' ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/40' : 'bg-uzum-primary/10 text-uzum-primary hover:bg-uzum-primary/20'} disabled:opacity-50`}
                          title="Определить мое местоположение"
                        >
                          {isLocating ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('location')} на карте</label>
                      </div>
                      <div className={`rounded-[2.5rem] overflow-hidden border h-48 relative transition-all ${theme === 'futuristic' ? 'border-white/10' : 'border-[#e2e5eb]'}`}>
                        <MapContainer
                          center={coords || BUKHARA_CENTER}
                          zoom={13}
                          className="h-full w-full z-0"
                        >
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <MapEvents coords={coords} setCoords={setCoords} />
                          {coords && <Marker position={coords} />}
                        </MapContainer>
                        <div className={`absolute top-3 right-3 p-2 rounded-lg text-[8px] font-black uppercase pointer-events-none ${theme === 'futuristic' ? 'bg-black/60 text-cyan-400 border border-white/10' : 'bg-white/80 text-uzum-muted'}`}>
                          Нажмите на карту
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-widest mb-3 ml-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('paymentMethod')}</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: 'payme', icon: Wallet, label: 'Payme' },
                          { id: 'click', icon: CreditCard, label: 'Click' },
                          { id: 'uzum_nasiya', icon: Sparkles, label: 'Nasiya' },
                          { id: 'cash', icon: Banknote, label: 'Наличные' }
                        ].map(method => (
                          <button
                            key={method.id}
                            onClick={() => setPaymentType(method.id as any)}
                            className={`py-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${paymentType === method.id
                              ? (theme === 'futuristic' ? 'bg-cyan-500 border-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'border-uzum-primary bg-uzum-primary text-white')
                              : (theme === 'futuristic' ? 'border-white/5 bg-white/5 text-white/40' : 'border-[#e2e5eb] text-uzum-muted bg-white')}`}
                          >
                            <method.icon size={20} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{method.label}</span>
                          </button>
                        ))}
                      </div>
                      {(paymentType === 'click' || paymentType === 'payme') && (
                        <div className={`mt-4 p-5 rounded-3xl border transition-all ${theme === 'futuristic' ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-uzum-primary/5 border-uzum-primary/10'}`}>
                          <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-primary'}`}>Реквизиты для оплаты</p>
                          <p className={`text-lg font-black tracking-wider ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>
                            {paymentType === 'click' ? settings.click_card : settings.payme_card}
                          </p>
                          <p className={`text-[10px] mt-3 font-medium ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>После оплаты прикрепите скриншот или сообщите оператору.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className={`p-8 border-t flex flex-col gap-4 ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-[#f2f4f7]'}`}>
                <div className="flex justify-between items-center mb-4">
                  <span className={`font-black uppercase tracking-widest text-[10px] ${theme === 'futuristic' ? 'text-white/40' : 'text-uzum-muted'}`}>{t('total')}:</span>
                  <span className={`text-xl font-black ${theme === 'futuristic' ? 'text-white' : 'text-uzum-text'}`}>{(total || 0).toLocaleString()}</span>
                </div>
                <button
                  disabled={cart.length === 0}
                  onClick={handleCheckout}
                  className={`w-full py-4 font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50 ${theme === 'futuristic' ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white neon-blue-glow' : 'bg-uzum-primary text-white shadow-uzum-primary/20'}`}
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
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[60] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className={`rounded-[3.5rem] w-full max-w-lg overflow-hidden shadow-2xl relative border transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/20 shadow-cyan-500/10' : 'bg-white border-stone-100'}`}
            >
              <div className="relative h-96">
                <img
                  src={selectedProduct.images?.[currentProductImage] || selectedProduct.image}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedProduct(null)}
                  className={`absolute top-6 right-6 p-3 backdrop-blur-md rounded-full transition-all ${theme === 'futuristic' ? 'bg-black/40 text-white hover:bg-black/60' : 'bg-white/80 text-uzum-muted hover:bg-white shadow-sm'}`}
                >
                  <X size={20} />
                </button>

                {selectedProduct.images && selectedProduct.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentProductImage(prev => (prev - 1 + selectedProduct.images.length) % selectedProduct.images.length)}
                      className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-black/20 backdrop-blur-md text-white rounded-full transition-all hover:bg-black/40"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      onClick={() => setCurrentProductImage(prev => (prev + 1) % selectedProduct.images.length)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-black/20 backdrop-blur-md text-white rounded-full transition-all hover:bg-black/40"
                    >
                      <ChevronRight size={24} />
                    </button>
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
                      {selectedProduct.images.map((_: any, i: number) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentProductImage ? 'w-8 bg-white' : 'w-2 bg-white/40'}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="p-10 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`text-2xl font-black tracking-tight ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{selectedProduct.name}</h3>
                    <p className={`text-xs font-black uppercase tracking-widest mt-1 ${theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-muted'}`}>{selectedProduct.categoryName || 'Категория'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <StarRating rating={selectedProduct.rating || 0} size={14} />
                      <span className={`text-xs font-bold ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>({selectedProduct.ratingCount || 0} оценок)</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {selectedProduct.discountPrice ? (
                      <>
                        <p className={`text-xs line-through ${theme === 'futuristic' ? 'text-white/20' : 'text-stone-400'}`}>{(selectedProduct.price || 0).toLocaleString()} сум</p>
                        <p className={`text-2xl font-black ${theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-primary'}`}>{(selectedProduct.discountPrice || 0).toLocaleString()} сум</p>
                      </>
                    ) : (
                      <p className={`text-2xl font-black ${theme === 'futuristic' ? 'text-white' : 'text-uzum-primary'}`}>{(selectedProduct.price || 0).toLocaleString()} сум</p>
                    )}
                  </div>
                </div>

                <p className={`text-sm leading-relaxed font-medium ${theme === 'futuristic' ? 'text-white/60' : 'text-stone-600'}`}>{selectedProduct.description}</p>

                <button
                  onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                  className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 ${theme === 'futuristic' ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white neon-blue-glow shadow-cyan-500/20' : 'bg-uzum-primary text-white shadow-uzum-primary/20'}`}
                >
                  Добавить в корзину
                </button>
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

      {/* Rating Modal */}
      <AnimatePresence>
        {showRatingModal && ratingOrder && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[70] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
              className={`w-full max-w-md rounded-[3rem] p-8 space-y-8 overflow-y-auto max-h-[90vh] transition-all no-scrollbar ${theme === 'futuristic' ? 'glass-morphism border border-white/10' : 'bg-white shadow-2xl'}`}
            >
              <div className="text-center">
                <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 ${theme === 'futuristic' ? 'bg-purple-500/20 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'bg-uzum-bg text-uzum-primary'}`}>
                  <Sparkles size={32} />
                </div>
                <h3 className={`text-xl font-black ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>Оцените заказ #{ratingOrder.id}</h3>
                <p className={`text-xs font-medium mt-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-500'}`}>Мы хотим стать лучше для вас!</p>
              </div>

              <div className="space-y-6">
                {/* Courier */}
                {ratingOrder.courierId && (
                  <div className="space-y-3">
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-muted'}`}>Курьер: {ratingOrder.courierName}</p>
                    <div className="flex justify-center py-2 bg-white/5 rounded-2xl border border-white/5">
                      <StarRating interactive onChange={(v) => setRatingOrder({ ...ratingOrder, r_courier: v })} rating={ratingOrder.r_courier || 0} size={32} />
                    </div>
                  </div>
                )}

                {/* Agent */}
                {ratingOrder.agentId && (
                  <div className="space-y-3">
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-muted'}`}>Агент: {ratingOrder.agentName}</p>
                    <div className="flex justify-center py-2 bg-white/5 rounded-2xl border border-white/5">
                      <StarRating interactive onChange={(v) => setRatingOrder({ ...ratingOrder, r_agent: v })} rating={ratingOrder.r_agent || 0} size={32} />
                    </div>
                  </div>
                )}

                {/* Products */}
                <div className="space-y-4">
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'futuristic' ? 'text-cyan-400' : 'text-uzum-muted'}`}>Товары</p>
                  {ratingOrder.items.map(item => (
                    <div key={item.productId} className={`p-4 rounded-2xl flex items-center justify-between ${theme === 'futuristic' ? 'bg-white/5 border border-white/5' : 'bg-stone-50'}`}>
                      <span className="text-xs font-bold truncate max-w-[120px]">{item.productName}</span>
                      <StarRating interactive onChange={(v) => {
                        const pRatings = ratingOrder.pRatings || {};
                        pRatings[item.productId] = v;
                        setRatingOrder({ ...ratingOrder, pRatings });
                      }} rating={(ratingOrder.pRatings || {})[item.productId] || 0} size={20} />
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  const data = {
                    courierRating: ratingOrder.r_courier,
                    agentRating: ratingOrder.r_agent,
                    productRatings: Object.entries(ratingOrder.pRatings || {}).map(([productId, rating]) => ({ productId: Number(productId), rating }))
                  };
                  submitRating(data);
                }}
                className={`w-full py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 ${theme === 'futuristic' ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white neon-blue-glow' : 'bg-uzum-primary text-white'}`}
              >
                Отправить отзыв
              </button>

              <button
                onClick={() => setShowRatingModal(false)}
                className={`w-full text-center text-[10px] font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white/20' : 'text-stone-400'}`}
              >
                Пропустить
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
