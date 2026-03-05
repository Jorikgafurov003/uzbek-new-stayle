import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Product, Category, Order, Stats, User, Banner, Debt, BusinessInsight, EmployeeKPI, ProfitForecast, SystemHealthLog, SecurityAlert } from '../types';
import { apiFetch, API_BASE_URL } from '../utils/api';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';
import { io, Socket } from 'socket.io-client';
import { db, auth } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDocFromServer,
  Timestamp
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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
  commissions: { agent_id: number; percent: number }[];
  salaryConfigs: any[];
  salaries: any[];
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
  updateSalaryConfig: (userId: number, config: any) => Promise<void>;
  createSalary: (salary: any) => Promise<void>;
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
  const [commissions, setCommissions] = useState<{ agent_id: number; percent: number }[]>([]);
  const [salaryConfigs, setSalaryConfigs] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const { t, language } = useLanguage();
  const { user } = useAuth();
  const prevOrdersRef = useRef<Order[]>([]);
  const prevDebtsRef = useRef<Debt[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user || !auth.currentUser) return;

    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();

    // Firestore Real-time Listeners
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'products'));

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'categories'));

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      setOrders(snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data, 
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt 
        } as Order;
      }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'orders'));

    const unsubBanners = onSnapshot(collection(db, 'banners'), (snapshot) => {
      setBanners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'banners'));

    const unsubSettings = onSnapshot(collection(db, 'settings'), (snapshot) => {
      const settingsObj: any = {};
      snapshot.docs.forEach(doc => {
        settingsObj[doc.id] = doc.data().value;
      });
      setSettings(settingsObj);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'settings'));

    // Role-based listeners
    let unsubUsers = () => {};
    let unsubSalaries = () => {};
    let unsubSalaryConfigs = () => {};
    let unsubDebts = () => {};

    if (user.role === 'admin' || user.role === 'agent') {
      unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));
    }

    if (user.role === 'admin') {
      unsubSalaries = onSnapshot(collection(db, 'salaries'), (snapshot) => {
        setSalaries(snapshot.docs.map(doc => {
          const data = doc.data();
          return { 
            id: doc.id, 
            ...data, 
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt 
          };
        }));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'salaries'));

      unsubSalaryConfigs = onSnapshot(collection(db, 'user_salary_config'), (snapshot) => {
        setSalaryConfigs(snapshot.docs.map(doc => ({ userId: doc.id, ...doc.data() })));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'user_salary_config'));
    }

    // Debts listener (Admins see all, clients see their own - handled by rules but better to be explicit if possible)
    unsubDebts = onSnapshot(collection(db, 'debts'), (snapshot) => {
      setDebts(snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data, 
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
          dueDate: data.dueDate instanceof Timestamp ? data.dueDate.toDate().toISOString() : data.dueDate
        } as Debt;
      }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'debts'));

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

    refreshData();

    return () => {
      unsubProducts();
      unsubCategories();
      unsubOrders();
      unsubBanners();
      unsubUsers();
      unsubSettings();
      unsubDebts();
      unsubSalaries();
      unsubSalaryConfigs();
      socket.disconnect();
    };
  }, [user]);

  const refreshData = async () => {
    if (!user) return;
    try {
      const endpoints = [
        { name: 'stats', url: '/api/stats' },
        { name: 'errors', url: '/api/system-errors' },
        { name: 'insights', url: '/api/admin/ai-insights' },
        { name: 'kpis', url: '/api/admin/kpi-leaderboard' },
        { name: 'forecasts', url: '/api/admin/profit-forecast' },
        { name: 'health', url: '/api/admin/system-health' },
        { name: 'security', url: '/api/admin/security-alerts' },
        { name: 'topStats', url: '/api/admin/top-stats' },
        { name: 'commissions', url: '/api/admin/commissions' }
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
          case 'commissions': setCommissions(res.data); break;
          case 'salaryConfigs': setSalaryConfigs(res.data); break;
          case 'salaries': setSalaries(res.data); break;
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
    try {
      await addDoc(collection(db, 'products'), product);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'products');
    }
  };

  const deleteProduct = async (id: number | string) => {
    try {
      await deleteDoc(doc(db, 'products', String(id)));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    }
  };

  const updateProduct = async (id: number | string, product: Partial<Product>) => {
    try {
      await updateDoc(doc(db, 'products', String(id)), product);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${id}`);
    }
  };

  const addCategory = async (name: string) => {
    try {
      await addDoc(collection(db, 'categories'), { name });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'categories');
    }
  };

  const deleteCategory = async (id: number | string) => {
    try {
      await deleteDoc(doc(db, 'categories', String(id)));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `categories/${id}`);
    }
  };

  const createOrder = async (order: any) => {
    try {
      const docRef = await addDoc(collection(db, 'orders'), {
        ...order,
        createdAt: Timestamp.now()
      });
      if (socketRef.current) {
        socketRef.current.emit('new_order', { id: docRef.id, ...order });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'orders');
    }
  };

  const updateOrder = async (id: number | string, updates: any) => {
    try {
      await updateDoc(doc(db, 'orders', String(id)), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${id}`);
    }
  };

  const deleteOrder = async (id: number | string) => {
    try {
      await deleteDoc(doc(db, 'orders', String(id)));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `orders/${id}`);
    }
  };

  const deleteUser = async (id: number | string) => {
    try {
      await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
      await deleteDoc(doc(db, 'users', String(id)));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${id}`);
    }
  };

  const updateSalaryConfig = async (userId: number | string, config: any) => {
    try {
      await setDoc(doc(db, 'user_salary_config', String(userId)), config, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `user_salary_config/${userId}`);
    }
  };

  const createSalary = async (salary: any) => {
    try {
      await addDoc(collection(db, 'salaries'), {
        ...salary,
        createdAt: Timestamp.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'salaries');
    }
  };

  const addUser = async (userData: any) => {
    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (!res.ok) throw new Error('Failed to register user in backend');
      const newUser = await res.json();

      await setDoc(doc(db, 'users', String(newUser.id)), {
        name: userData.name,
        phone: userData.phone,
        role: userData.role,
        carType: userData.carType || null,
        carPhoto: userData.carPhoto || null,
        photo: userData.photo || null,
        createdAt: new Date().toISOString()
      });
      
      return newUser;
    } catch (err) {
      console.error('Error adding user:', err);
      throw err;
    }
  };

  const updateUser = async (id: number | string, updates: any) => {
    try {
      await apiFetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      await updateDoc(doc(db, 'users', String(id)), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${id}`);
    }
  };

  const addBanner = async (banner: Partial<Banner>) => {
    try {
      await addDoc(collection(db, 'banners'), banner);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'banners');
    }
  };

  const updateBanner = async (id: number | string, updates: Partial<Banner>) => {
    try {
      await updateDoc(doc(db, 'banners', String(id)), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `banners/${id}`);
    }
  };

  const deleteBanner = async (id: number | string) => {
    try {
      await deleteDoc(doc(db, 'banners', String(id)));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `banners/${id}`);
    }
  };

  const updateSettings = async (updates: any) => {
    try {
      await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      for (const key in updates) {
        await setDoc(doc(db, 'settings', key), { value: updates[key] });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings');
    }
  };

  const addDebt = async (debt: Partial<Debt>) => {
    try {
      await addDoc(collection(db, 'debts'), {
        ...debt,
        createdAt: Timestamp.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'debts');
    }
  };

  const updateDebt = async (id: number | string, updates: Partial<Debt>) => {
    try {
      await updateDoc(doc(db, 'debts', String(id)), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `debts/${id}`);
    }
  };

  const updateUserLocation = async (lat: number, lng: number, speed?: number) => {
    if (!user || !socketRef.current) return;
    socketRef.current.emit('update_location', { userId: user.id, lat, lng, role: user.role, speed });
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, lat, lng } : u));
  };

  return (
    <DataContext.Provider value={{ 
      products, categories, orders, stats, users, banners, settings, debts, systemErrors, isOnline,
      insights, kpis, forecasts, healthLogs, securityAlerts, commissions, salaryConfigs, salaries,
      refreshData, addProduct, updateProduct, deleteProduct, addCategory, deleteCategory, createOrder, updateOrder, deleteOrder, deleteUser, updateUser, addUser,
      updateSalaryConfig, createSalary,
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
