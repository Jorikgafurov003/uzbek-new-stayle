import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { apiFetch } from '../utils/api';
import { auth, db } from '../firebase';
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  login: (phone: string, password: string) => Promise<void>;
  loginWithPhone: (phone: string) => Promise<void>;
  confirmPhoneCode: (code: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (name: string, phone: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  phoneConfirmation: ConfirmationResult | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Глобальная переменная для хранения reCAPTCHA verifier
let recaptchaVerifier: RecaptchaVerifier | null = null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [phoneConfirmation, setPhoneConfirmation] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    // Восстановить пользователя из localStorage при старте
    const localUser = localStorage.getItem('uzbechka_user');
    if (localUser) {
      try {
        setUser(JSON.parse(localUser));
      } catch {
        localStorage.removeItem('uzbechka_user');
      }
    }

    // Слушаем изменения состояния Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Если пользователь залогинен в Firebase, но нет в локальном стейте (или для синхронизации)
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = { id: firebaseUser.uid, ...userDoc.data() } as any;
            setUser(userData);
            localStorage.setItem('uzbechka_user', JSON.stringify(userData));
          }
        } catch (e) {
          console.error('Firestore sync error:', e);
        }
      } else {
        // Пользователь вышел из Firebase — проверяем локальный кэш
        const cached = localStorage.getItem('uzbechka_user');
        if (!cached) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Вход по номеру телефона (превращаем в email-формат для Firebase Auth)
   * + валидация через наш бэкенд
   */
  const login = async (phone: string, password: string) => {
    // 1. Проверяем пользователя на нашем бэкенде
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    });
    if (!res.ok) throw new Error('Неверный номер или пароль');
    const data = await res.json();

    // 2. Синхронизируем с Firebase Auth (email-формат: +998901234567 → 998901234567@uzbechka.com)
    const email = `${phone.replace(/\D/g, '')}@uzbechka.com`;
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      
      // Синхронизация с Firestore
      await setDoc(doc(db, 'users', credential.user.uid), {
        name: data.name,
        phone: data.phone,
        role: data.role,
        updatedAt: new Date().toISOString()
      }, { merge: true });

    } catch (e: any) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
        // Пользователь ещё не зарегистрирован в Firebase — создаём
        try {
          const credential = await createUserWithEmailAndPassword(auth, email, password);
          await setDoc(doc(db, 'users', credential.user.uid), {
            name: data.name,
            phone: data.phone,
            role: data.role,
            createdAt: new Date().toISOString()
          });
        } catch (createErr: any) {
          if (createErr.code !== 'auth/email-already-in-use') {
            console.warn('Firebase Auth sync warning:', createErr.message);
          }
        }
      } else {
        console.warn('Firebase Auth warning:', e.message);
      }
    }

    setUser(data);
    localStorage.setItem('uzbechka_user', JSON.stringify(data));
  };

  /**
   * Вход через Google
   */
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;
    
    // Проверяем/Создаем в Firestore
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);
    
    let userData: any;
    
    if (!userDoc.exists()) {
      userData = {
        name: firebaseUser.displayName || 'Google User',
        phone: firebaseUser.phoneNumber || '',
        email: firebaseUser.email || '',
        role: 'client',
        photo: firebaseUser.photoURL || '',
        createdAt: new Date().toISOString()
      };
      await setDoc(userRef, userData);
    } else {
      userData = userDoc.data();
    }

    // Синхронизация с бэкендом (по UID)
    try {
      const res = await apiFetch(`/api/auth/firebase/${firebaseUser.uid}`);
      if (res.ok) {
        const backendUser = await res.json();
        setUser(backendUser);
        localStorage.setItem('uzbechka_user', JSON.stringify(backendUser));
      } else {
        // Если на бэкенде нет — используем данные из Firebase
        const localData = { id: firebaseUser.uid, ...userData };
        setUser(localData);
        localStorage.setItem('uzbechka_user', JSON.stringify(localData));
      }
    } catch (e) {
      const localData = { id: firebaseUser.uid, ...userData };
      setUser(localData);
      localStorage.setItem('uzbechka_user', JSON.stringify(localData));
    }
  };

  /**
   * Вход через SMS (Firebase Phone Auth)
   * Шаг 1: отправить SMS-код
   */
  const loginWithPhone = async (phoneNumber: string) => {
    // Создаём или переиспользуем reCAPTCHA verifier
    if (!recaptchaVerifier) {
      recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    }

    const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    setPhoneConfirmation(confirmation);
  };

  /**
   * Шаг 2: подтвердить SMS-код
   */
  const confirmPhoneCode = async (code: string) => {
    if (!phoneConfirmation) throw new Error('Сначала запросите SMS-код');
    const result = await phoneConfirmation.confirm(code);
    const firebaseUser = result.user;

    // Синхронизация Firestore
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        name: firebaseUser.displayName || 'Клиент',
        phone: firebaseUser.phoneNumber || '',
        role: 'client',
        createdAt: new Date().toISOString()
      });
    }

    // Пробуем найти пользователя в нашем бэкенде по UID
    try {
      const res = await apiFetch(`/api/auth/firebase/${firebaseUser.uid}`, {
        method: 'GET',
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        localStorage.setItem('uzbechka_user', JSON.stringify(data));
      } else {
        // Новый пользователь через телефон
        const newUser: any = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Клиент',
          phone: firebaseUser.phoneNumber || '',
          role: 'client',
        };
        setUser(newUser);
        localStorage.setItem('uzbechka_user', JSON.stringify(newUser));
      }
    } catch (e) {
      console.warn('Backend lookup failed, using Firebase user:', e);
      const fallback: any = {
        id: firebaseUser.uid,
        name: 'Клиент',
        phone: firebaseUser.phoneNumber || '',
        role: 'client',
      };
      setUser(fallback);
      localStorage.setItem('uzbechka_user', JSON.stringify(fallback));
    }

    setPhoneConfirmation(null);
  };

  /**
   * Регистрация нового пользователя
   */
  const register = async (name: string, phone: string, password: string, role?: string) => {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, password, role }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Ошибка регистрации');
    }

    const data = await res.json();

    // Синхронизируем с Firebase Auth и Firestore
    const email = `${phone.replace(/\D/g, '')}@uzbechka.com`;
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', credential.user.uid), {
        name: data.name,
        phone: data.phone,
        role: data.role,
        createdAt: new Date().toISOString()
      });
    } catch (e: any) {
      if (e.code !== 'auth/email-already-in-use') {
        console.warn('Firebase sync optional:', e.message);
      }
    }

    setUser(data);
    localStorage.setItem('uzbechka_user', JSON.stringify(data));
  };

  /**
   * Выход
   */
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase signOut warning:', e);
    }
    setUser(null);
    localStorage.removeItem('uzbechka_user');
    setPhoneConfirmation(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithPhone, confirmPhoneCode, loginWithGoogle, register, logout, loading, phoneConfirmation }}>
      {/* Невидимый контейнер для Firebase reCAPTCHA (нужен для Phone Auth) */}
      <div id="recaptcha-container" />
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
