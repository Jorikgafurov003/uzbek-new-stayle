import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { apiFetch } from '../utils/api';
import { auth, db } from '../firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  login: (phone: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (name: string, phone: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = { id: firebaseUser.uid, ...userDoc.data() } as any;
            setUser(userData);
            localStorage.setItem('uzbechka_user', JSON.stringify(userData));
          } else {
            // If they are logged in to Firebase but no doc exists, try to get from localStorage
            const localUser = localStorage.getItem('uzbechka_user');
            if (localUser) {
              const parsed = JSON.parse(localUser);
              if (parsed.id === firebaseUser.uid) {
                setUser(parsed);
              }
            }
          }
        } catch (e) {
          console.error('Error fetching user doc:', e);
        }
      } else {
        // If not logged in to Firebase, check if we have a local session
        const localUser = localStorage.getItem('uzbechka_user');
        if (localUser) {
          const parsed = JSON.parse(localUser);
          // Try to re-auth with Firebase if we have a local session
          const email = `${parsed.phone.replace('+', '')}@uzbechka.com`;
          try {
            await signInWithEmailAndPassword(auth, email, parsed.password || 'default_pass');
          } catch (e) {
            console.warn('Could not re-auth with Firebase:', e);
          }
          setUser(parsed);
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;
    
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (!userDoc.exists()) {
      // Create a default profile for new Google users
      const newProfile = {
        name: firebaseUser.displayName || 'Google User',
        phone: firebaseUser.phoneNumber || '',
        role: firebaseUser.email === 'jorikgafurov003@gmail.com' ? 'admin' : 'client',
        photo: firebaseUser.photoURL || '',
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
      setUser({ id: firebaseUser.uid, ...newProfile } as any);
    } else {
      setUser({ id: firebaseUser.uid, ...userDoc.data() } as any);
    }
  };

  const login = async (phone: string, password: string) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    });
    if (!res.ok) throw new Error('Invalid credentials');
    const data = await res.json();
    
    // Sync with Firebase Auth
    const email = `${phone.replace('+', '')}@uzbechka.com`;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        try {
          const credential = await createUserWithEmailAndPassword(auth, email, password);
          // Create Firestore doc for the user
          await setDoc(doc(db, 'users', credential.user.uid), {
            name: data.name,
            phone: data.phone,
            role: data.role,
            createdAt: new Date().toISOString()
          });
        } catch (createErr) {
          console.error('Failed to create Firebase user:', createErr);
        }
      } else {
        console.error('Firebase Auth error:', e);
      }
    }

    setUser(data);
    localStorage.setItem('uzbechka_user', JSON.stringify(data));
  };

  const register = async (name: string, phone: string, password: string, role?: string) => {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, password, role }),
    });
    if (!res.ok) throw new Error('Registration failed');
    const data = await res.json();
    
    // Sync with Firebase Auth
    const email = `${phone.replace('+', '')}@uzbechka.com`;
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', credential.user.uid), {
        name,
        phone,
        role: role || 'client',
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.error('Failed to sync registration with Firebase:', e);
    }

    setUser(data);
    localStorage.setItem('uzbechka_user', JSON.stringify(data));
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    localStorage.removeItem('uzbechka_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
