import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Product, Category, Order, Stats, User, Banner, Debt, BusinessInsight, EmployeeKPI, ProfitForecast, SystemHealthLog, SecurityAlert } from '../types';
import { apiFetch, API_BASE_URL } from '../utils/api';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';
import { io, Socket } from 'socket.io-client';

interface DataContextType {
  products: Product[];
  categories: Category[];
  orders: Order[];
  banners: Banner[];
  stats: Stats | null;
  users: User[];
  settings: any;
  debts: Debt[];
  systemErrors: any[];
  isOnline: boolean;
  insights: BusinessInsight[];
  kpis: EmployeeKPI[];
  forecasts: ProfitForecast[];
  healthLogs: SystemHealthLog[];
  securityAlerts: SecurityAlert[];
  refreshData: () => Promise<void>;
  addProduct: (product: Partial<Product>) => Promise<void>;
  updateProduct: (id: number, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
  createOrder: (order: any) => Promise<void>;
  updateOrder: (id: number, updates: any) => Promise<void>;
  deleteOrder: (id: number) => Promise<void>;
  deleteUser: (id: number) => Promise<void>;
  updateUser: (id: number, updates: any) => Promise<void>;
  addBanner: (banner: Partial<Banner>) => Promise<void>;
  updateBanner: (id: number, updates: Partial<Banner>) => Promise<void>;
  deleteBanner: (id: number) => Promise<void>;
  updateSettings: (updates: any) => Promise<void>;
  addDebt: (debt: Partial<Debt>) => Promise<void>;
  updateDebt: (id: number, updates: Partial<Debt>) => Promise<void>;
  updateUserLocation: (lat: number, lng: number, speed?: number) => Promise<void>;
  speak: (text: string) => void;
  playSound: (type: 'order' | 'message' | 'success' | 'error') => void;
  fixSystemError: (id: number) => Promise<void>;
  analyzeErrors: () => Promise<string>;
  deployUpdate: () => Promise<void>;
  setCommission: (agentId: number, percent: number) => Promise<void>;
  uploadProof: (orderId: number, file: File) => Promise<void>;
  apiFetch: typeof apiFetch;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const BUKHARA_CENTER: [number, number] = [39.7747, 64.4286];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [debts, setDebts] = useState<Debt[]>([]);
  const [systemErrors, setSystemErrors] = useState<any[]>([]);
  const [insights, setInsights] = useState<BusinessInsight[]>([]);
  const [kpis, setKpis] = useState<EmployeeKPI[]>([]);
  const [forecasts, setForecasts] = useState<ProfitForecast[]>([]);
  const [healthLogs, setHealthLogs] = useState<SystemHealthLog[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const { t, language } = useLanguage();
  const { user } = useAuth();
  const prevOrdersRef = useRef<Order[]>([]);
  const prevDebtsRef = useRef<Debt[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize Socket.io
    const socket = io(API_BASE_URL || window.location.origin);
    socketRef.current = socket;

    socket.on('location_updated', (data) => {
      setUsers(prev => prev.map(u => u.id === data.userId ? { ...u, lat: data.lat, lng: data.lng, lastSeen: new Date().toISOString() } : u));
    });

    socket.on('order_created', (data) => {
      if (user?.role === 'admin' || user?.role === 'agent') {
        playSound('order');
        speak(t('newOrderVoice'));
      }
      refreshData();
    });

    socket.on('voice_alert', (data) => {
      if (user?.role === 'admin') speak(data.message);
    });

    socket.on('system_health_alert', (data) => {
      if (user?.role === 'admin') {
        playSound('error');
        speak(`Внимание! Проблема в системе: ${data.issue}`);
      }
    });

    socket.on('order_updated', (data) => {
      if (user?.id === data.courierId || user?.id === data.agentId || user?.id === data.clientId) {
        playSound('message');
        if (data.status === 'on_way') speak(t('orderOnWayVoice'));
        if (data.status === 'delivered') speak(t('orderDeliveredVoice'));
      }
      refreshData();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const refreshData = async () => {
    try {
      const endpoints = [
        { name: 'products', url: '/api/products' },
        { name: 'categories', url: '/api/categories' },
        { name: 'orders', url: '/api/orders' },
        { name: 'stats', url: '/api/stats' },
        { name: 'users', url: '/api/users' },
        { name: 'banners', url: '/api/banners' },
        { name: 'settings', url: '/api/settings' },
        { name: 'debts', url: '/api/debts' },
        { name: 'errors', url: '/api/system-errors' },
        { name: 'insights', url: '/api/admin/ai-insights' },
        { name: 'kpis', url: '/api/admin/kpi-leaderboard' },
        { name: 'forecasts', url: '/api/admin/profit-forecast' },
        { name: 'health', url: '/api/admin/system-health' },
        { name: 'security', url: '/api/admin/security-alerts' },
        { name: 'topStats', url: '/api/admin/top-stats' }
      ];

      const results = await Promise.all(
        endpoints.map(async (ep) => {
          try {
            const res = await apiFetch(ep.url);
            if (!res.ok) {
              console.warn(`API Error for ${ep.name}: ${res.status} ${res.statusText}`);
              return { name: ep.name, data: null };
            }
            return { name: ep.name, data: await res.json() };
          } catch (e) {
            console.error(`Fetch error for ${ep.name}:`, e);
            return { name: ep.name, data: null };
          }
        })
      );

      results.forEach(res => {
        if (res.data === null) return;
        
        switch (res.name) {
          case 'products': setProducts(res.data); break;
          case 'categories': setCategories(res.data); break;
          case 'orders': {
            const newOrders: Order[] = res.data;
            if (settings.voice_enabled === 'true' && prevOrdersRef.current.length > 0) {
              newOrders.forEach(order => {
                const prevOrder = prevOrdersRef.current.find(o => o.id === order.id);
                if (!prevOrder && newOrders.length > prevOrdersRef.current.length) {
                  speak(t('newOrderVoice'));
                }
                if (prevOrder) {
                  if (prevOrder.paymentStatus === 'pending' && order.paymentStatus === 'paid') {
                    speak(t('paymentPaidVoice'));
                  }
                  if (prevOrder.collectionStatus === 'pending' && order.collectionStatus === 'collected') {
                    speak(t('collectionCollectedVoice'));
                  }
                }
              });
            }
            setOrders(newOrders);
            prevOrdersRef.current = newOrders;
            break;
          }
          case 'stats': setStats(res.data); break;
          case 'users': setUsers(res.data); break;
          case 'banners': setBanners(res.data); break;
          case 'settings': setSettings(res.data); break;
          case 'debts': {
            const newDebts: Debt[] = res.data;
            if (settings.voice_enabled === 'true' && prevDebtsRef.current.length > 0) {
              newDebts.forEach(debt => {
                const prevDebt = prevDebtsRef.current.find(d => d.id === debt.id);
                if (prevDebt && prevDebt.status === 'pending' && debt.status === 'paid') {
                  speak(t('debtRepaidVoice'));
                }
              });
            }
            setDebts(newDebts);
            prevDebtsRef.current = newDebts;
            break;
          }
          case 'errors': setSystemErrors(res.data); break;
          case 'insights': setInsights(res.data); break;
          case 'kpis': setKpis(res.data); break;
          case 'forecasts': setForecasts(res.data); break;
          case 'health': setHealthLogs(res.data); break;
          case 'security': setSecurityAlerts(res.data); break;
          case 'topStats': setStats(prev => prev ? { ...prev, ...res.data } : res.data); break;
        }
      });
    } catch (error) {
      console.error('Critical error refreshing data:', error);
    }
  };

  const playSound = (type: 'order' | 'message' | 'success' | 'error') => {
    const sounds = {
      order: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
      message: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
      success: 'https://assets.mixkit.co/active_storage/sfx/2359/2359-preview.mp3',
      error: 'https://assets.mixkit.co/active_storage/sfx/2347/2347-preview.mp3'
    };
    const audio = new Audio(sounds[type]);
    audio.play().catch(e => console.warn('Sound play failed:', e));
  };

  const speak = (text: string) => {
    if (settings.voice_enabled !== 'true') return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'ru' ? 'ru-RU' : 'uz-UZ';
    window.speechSynthesis.speak(utterance);
  };

  const fixSystemError = async (id: number) => {
    await apiFetch(`/api/system-errors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fixed: 1 }),
    });
    await refreshData();
    speak("Ошибка исправлена");
  };

  const analyzeErrors = async () => {
    const res = await apiFetch('/api/admin/ai-insights');
    const data = await res.json();
    return data[0]?.recommendation || "Система работает стабильно.";
  };

  const deployUpdate = async () => {
    await apiFetch('/api/admin/deploy-update', { method: 'POST' });
    speak("Файлы деплоя обновлены");
  };

  const setCommission = async (agentId: number, percent: number) => {
    await apiFetch('/api/admin/set-commission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, percent }),
    });
    await refreshData();
  };

  const uploadProof = async (orderId: number, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('orderId', orderId.toString());
    formData.append('type', 'proofs');
    
    await fetch(`${API_BASE_URL}/api/courier/upload-proof`, {
      method: 'POST',
      body: formData
    });
    await refreshData();
  };

  useEffect(() => {
    if (systemErrors.length > 0 && user?.role === 'admin') {
      playSound('error');
      speak("Обнаружены системные ошибки. Проверьте панель управления.");
    }
  }, [systemErrors.length]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Small delay to ensure server is ready
    const timer = setTimeout(() => {
      refreshData();
    }, 1500);
    
    const interval = setInterval(refreshData, 10000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [language, settings.voice_enabled]);

  const addProduct = async (product: Partial<Product>) => {
    await apiFetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    await refreshData();
  };

  const deleteProduct = async (id: number) => {
    await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
    await refreshData();
  };

  const updateProduct = async (id: number, product: Partial<Product>) => {
    await apiFetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    await refreshData();
  };

  const addCategory = async (name: string) => {
    await apiFetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    await refreshData();
  };

  const deleteCategory = async (id: number) => {
    await apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
    await refreshData();
  };

  const createOrder = async (order: any) => {
    const res = await apiFetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    if (res.ok && socketRef.current) {
      const newOrder = await res.json();
      socketRef.current.emit('new_order', newOrder);
    }
    await refreshData();
  };

  const updateOrder = async (id: number, updates: any) => {
    await apiFetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    await refreshData();
  };

  const deleteOrder = async (id: number) => {
    await apiFetch(`/api/orders/${id}`, { method: 'DELETE' });
    await refreshData();
  };

  const deleteUser = async (id: number) => {
    await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
    await refreshData();
  };

  const updateUser = async (id: number, updates: any) => {
    await apiFetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    await refreshData();
  };

  const addBanner = async (banner: Partial<Banner>) => {
    await apiFetch('/api/banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(banner),
    });
    await refreshData();
  };

  const updateBanner = async (id: number, updates: Partial<Banner>) => {
    await apiFetch(`/api/banners/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    await refreshData();
  };

  const deleteBanner = async (id: number) => {
    await apiFetch(`/api/banners/${id}`, { method: 'DELETE' });
    await refreshData();
  };

  const updateSettings = async (updates: any) => {
    await apiFetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    await refreshData();
  };

  const addDebt = async (debt: Partial<Debt>) => {
    await apiFetch('/api/debts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(debt),
    });
    await refreshData();
  };

  const updateDebt = async (id: number, updates: Partial<Debt>) => {
    await apiFetch(`/api/debts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    await refreshData();
  };

  const updateUserLocation = async (lat: number, lng: number, speed?: number) => {
    if (!user || !socketRef.current) return;
    socketRef.current.emit('update_location', { userId: user.id, lat, lng, role: user.role, speed });
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, lat, lng } : u));
  };

  return (
    <DataContext.Provider value={{ 
      products, categories, orders, stats, users, banners, settings, debts, systemErrors, isOnline,
      insights, kpis, forecasts, healthLogs, securityAlerts,
      refreshData, addProduct, updateProduct, deleteProduct, addCategory, deleteCategory, createOrder, updateOrder, deleteOrder, deleteUser, updateUser,
      addBanner, updateBanner, deleteBanner, updateSettings, addDebt, updateDebt, updateUserLocation, speak, playSound, fixSystemError, analyzeErrors,
      deployUpdate, setCommission, uploadProof, apiFetch
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};
