import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  ShoppingBag, CheckCircle, User, LogOut, Plus, Search, 
  Clock, MapPin, Package, Users, ChevronRight, X, Minus, Trash2, Truck, CreditCard, Navigation, Volume2, TrendingUp, Banknote, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmDialog } from './ConfirmDialog';

export const AgentApp: React.FC = () => {
  const { products, categories, orders, stats, users, createOrder, updateOrder, updateUser, speak, isOnline, apiFetch, refreshData } = useData();
  const { logout, user: authUser } = useAuth();
  const { t } = useLanguage();
  
  const user = users.find(u => u.id === authUser?.id) || authUser;
  const [activeTab, setActiveTab] = useState<'orders' | 'clients' | 'reports' | 'profile'>('orders');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [agentCart, setAgentCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'debt'>('cash');
  const [dueDate, setDueDate] = useState('');
  const [userPhotoPreview, setUserPhotoPreview] = useState<string | null>(user?.photo || null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; onConfirm: () => void; title?: string; message?: string }>({ isOpen: false, onConfirm: () => {} });
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: '', phone: '', password: 'client_password' });

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
      speak(`Клиент ${newClientData.name} успешно зарегистрирован`);
    } catch (err) {
      console.error(err);
      alert('Ошибка при регистрации клиента');
    }
  };

  const clients = users.filter(u => u.role === 'client');

  const handleCreateOrder = async () => {
    if (!selectedClient || agentCart.length === 0) return;
    
    const totalPrice = agentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    await createOrder({
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      clientPhone: selectedClient.phone,
      agentId: user?.id,
      agentName: user?.name,
      items: agentCart.map(item => ({
        id: item.id,
        productName: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      totalPrice,
      orderStatus: 'confirmed',
      location: 'Store Pickup / Agent Order',
      paymentType: paymentMethod,
      paymentStatus: paymentMethod === 'debt' ? 'pending' : 'paid'
    });

    speak(`Заказ для ${selectedClient.name} создан`);
    setSelectedClient(null);
    setAgentCart([]);
    setPaymentMethod('cash');
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
            <span className="text-[10px] font-black text-uzum-muted uppercase tracking-widest">Agent</span>
            <span className="text-xs font-bold text-uzum-text">{user?.name}</span>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-[#e2e5eb] space-y-6">
              <h2 className="text-xl font-black text-uzum-text uppercase tracking-widest">Быстрая Заявка</h2>
              
              {/* Client Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-uzum-muted uppercase tracking-widest ml-1">Выберите клиента</label>
                <div className="relative">
                  <select 
                    className="w-full p-4 rounded-2xl bg-uzum-bg border-none outline-none font-bold text-sm appearance-none"
                    onChange={(e) => setSelectedClient(clients.find(c => c.id === Number(e.target.value)))}
                    value={selectedClient?.id || ''}
                  >
                    <option value="">-- Выберите клиента --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                  </select>
                  <Users className="absolute right-4 top-1/2 -translate-y-1/2 text-uzum-muted pointer-events-none" size={20} />
                </div>
              </div>

              {/* Product Selection (Catalog) */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-uzum-muted uppercase tracking-widest ml-1">Добавить товары</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-uzum-muted" size={20} />
                  <input 
                    type="text"
                    placeholder="Поиск товара..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-4 pl-12 rounded-2xl bg-uzum-bg border-none outline-none font-bold text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2">
                  {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(product => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100">
                      <div className="flex items-center gap-3">
                        <img src={product.image} className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <p className="text-sm font-bold">{product.name}</p>
                          <p className="text-[10px] text-uzum-muted">{(product.discountPrice || product.price || 0).toLocaleString()} сум</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => addToAgentCart(product)}
                        className="p-2 bg-uzum-primary text-white rounded-lg"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cart Summary */}
              {agentCart.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-stone-100">
                  <div className="space-y-2">
                    {agentCart.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <span className="font-medium">{item.quantity}x {item.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{((item.price || 0) * (item.quantity || 0)).toLocaleString()} сум</span>
                          <button onClick={() => removeFromAgentCart(item.id)} className="text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Payment Method */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-uzum-muted uppercase tracking-widest ml-1">Способ оплаты</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'cash', label: 'Наличные', icon: Banknote },
                        { id: 'card', label: 'Картой', icon: CreditCard },
                        { id: 'debt', label: 'В долг', icon: Clock }
                      ].map(method => (
                        <button 
                          key={method.id}
                          onClick={() => setPaymentMethod(method.id as any)}
                          className={`py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                            paymentMethod === method.id 
                              ? 'border-uzum-primary bg-uzum-primary/5 text-uzum-primary' 
                              : 'border-stone-100 text-stone-400 bg-stone-50'
                          }`}
                        >
                          <method.icon size={20} />
                          <span className="text-[8px] font-black uppercase tracking-widest">{method.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-uzum-bg rounded-2xl">
                    <span className="text-sm font-bold text-uzum-muted uppercase tracking-widest">Итого:</span>
                    <span className="text-xl font-black text-uzum-primary">
                      {(agentCart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0)).toLocaleString()} сум
                    </span>
                  </div>

                  <button 
                    onClick={handleCreateOrder}
                    disabled={!selectedClient || agentCart.length === 0}
                    className="w-full py-5 bg-uzum-primary text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-uzum-primary/20 disabled:opacity-50"
                  >
                    Создать Заявку
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-uzum-text uppercase tracking-widest">Мои Клиенты</h2>
              <button 
                onClick={() => setShowAddClient(true)}
                className="p-3 bg-uzum-primary text-white rounded-2xl shadow-lg shadow-uzum-primary/20"
              >
                <Plus size={20} />
              </button>
            </div>
            {clients.map(client => (
              <div key={client.id} className="bg-white p-5 rounded-[2rem] border border-[#e2e5eb] shadow-sm flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-lg">{client.name}</h4>
                  <p className="text-xs text-uzum-muted">{client.phone}</p>
                </div>
                <button onClick={() => { setSelectedClient(client); setActiveTab('orders'); }} className="p-3 bg-uzum-bg text-uzum-primary rounded-2xl">
                  <Plus size={20} />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-uzum-text uppercase tracking-widest">Отчеты</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-[#e2e5eb] text-center">
                <p className="text-[10px] font-black text-uzum-muted uppercase tracking-widest mb-1">Заказы</p>
                <p className="text-3xl font-black text-uzum-primary">{orders.filter(o => o.agentId === user?.id).length}</p>
              </div>
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-[#e2e5eb] text-center">
                <p className="text-[10px] font-black text-uzum-muted uppercase tracking-widest mb-1">Выручка</p>
                  <p className="text-xl font-black text-uzum-primary">
                    {(orders.filter(o => o.agentId === user?.id && o.paymentStatus === 'paid')
                      .reduce((sum, o) => sum + (o.totalPrice || 0), 0)).toLocaleString()}
                  </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-[#e2e5eb] text-center space-y-4 relative group overflow-hidden">
              <div className="w-32 h-32 bg-uzum-bg rounded-full mx-auto flex items-center justify-center border-4 border-uzum-primary/10 overflow-hidden relative">
                {user?.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : <User size={48} className="text-uzum-primary" />}
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <Plus size={24} className="text-white" />
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
              </div>
              <div>
                <h3 className="text-2xl font-bold">{user?.name}</h3>
                <p className="text-uzum-muted font-medium">{user?.phone}</p>
              </div>
              <button onClick={logout} className="w-full p-4 bg-red-50 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-2">
                <LogOut size={20} /> Выйти
              </button>
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
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e2e5eb] p-4 flex justify-around items-center z-50">
        {[
          { id: 'orders', label: 'Заявки', icon: ShoppingBag },
          { id: 'clients', label: 'Клиенты', icon: Users },
          { id: 'reports', label: 'Отчет', icon: TrendingUp },
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
      <AnimatePresence>
        {showAddClient && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-uzum-text uppercase tracking-widest">Новый Клиент</h3>
                <button onClick={() => setShowAddClient(false)} className="p-2 bg-uzum-bg rounded-full text-uzum-muted"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-uzum-muted uppercase tracking-widest mb-2 ml-1">ФИО Клиента</label>
                  <input 
                    type="text" 
                    placeholder="Иван Иванов"
                    className="w-full p-4 rounded-2xl bg-uzum-bg border-none outline-none font-bold text-sm"
                    value={newClientData.name}
                    onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-uzum-muted uppercase tracking-widest mb-2 ml-1">Номер телефона</label>
                  <input 
                    type="tel" 
                    placeholder="+998"
                    className="w-full p-4 rounded-2xl bg-uzum-bg border-none outline-none font-bold text-sm"
                    value={newClientData.phone}
                    onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
                  />
                </div>
                <button 
                  onClick={handleCreateClient}
                  className="w-full py-5 bg-uzum-primary text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-uzum-primary/20 mt-4"
                >
                  Зарегистрировать
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
