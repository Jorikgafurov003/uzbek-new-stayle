import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ShoppingBag, Globe } from 'lucide-react';
import { motion } from 'motion/react';

export const Login: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [showSmsStep, setShowSmsStep] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister && !showSmsStep) {
        setShowSmsStep(true);
        // In a real app, you'd trigger SMS here
        return;
      }
      
      if (isRegister && showSmsStep) {
        if (smsCode !== '1234') {
          setError('Неверный код СМС (используйте 1234)');
          return;
        }
        await register(name, phone, password);
      } else {
        await login(phone, password);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f2f4f7] font-sans">
      <div className="absolute top-6 right-6 flex gap-2">
        <button 
          onClick={() => setLanguage('ru')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${language === 'ru' ? 'bg-uzum-primary text-white shadow-lg shadow-uzum-primary/20' : 'bg-white text-uzum-muted border border-[#e2e5eb]'}`}
        >
          RU
        </button>
        <button 
          onClick={() => setLanguage('uz')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${language === 'uz' ? 'bg-uzum-primary text-white shadow-lg shadow-uzum-primary/20' : 'bg-white text-uzum-muted border border-[#e2e5eb]'}`}
        >
          UZ
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-[#e2e5eb]"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-uzum-primary rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-uzum-primary/20 rotate-3">
            <ShoppingBag className="text-white w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-uzum-primary tracking-tighter mb-1">UZBECHKA</h1>
          <p className="text-uzum-muted text-[10px] font-bold uppercase tracking-[0.2em] mb-2">DENAN bekary</p>
          <p className="text-uzum-muted text-sm font-medium">{t('premiumDelivery')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegister && !showSmsStep && (
            <div>
              <label className="block text-[10px] font-black text-uzum-muted uppercase tracking-widest mb-2 ml-1">{t('name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-4 rounded-2xl bg-uzum-bg border-none outline-none focus:ring-2 focus:ring-uzum-primary/20 transition-all font-medium text-sm"
                placeholder={t('name')}
                required
              />
            </div>
          )}
          {showSmsStep && (
            <div>
              <label className="block text-[10px] font-black text-uzum-muted uppercase tracking-widest mb-2 ml-1">Код из СМС</label>
              <input
                type="text"
                value={smsCode}
                onChange={(e) => setSmsCode(e.target.value)}
                className="w-full p-4 rounded-2xl bg-uzum-bg border-none outline-none focus:ring-2 focus:ring-uzum-primary/20 transition-all font-medium text-sm"
                placeholder="1234"
                required
              />
              <p className="text-[10px] text-uzum-muted mt-2 ml-1 font-bold">Введите код 1234 для подтверждения</p>
            </div>
          )}
          {!showSmsStep && (
            <>
              <div>
                <label className="block text-[10px] font-black text-uzum-muted uppercase tracking-widest mb-2 ml-1">{t('phone')}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-uzum-bg border-none outline-none focus:ring-2 focus:ring-uzum-primary/20 transition-all font-medium text-sm"
                  placeholder="+998 90 123 45 67"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-uzum-muted uppercase tracking-widest mb-2 ml-1">{t('password')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-uzum-bg border-none outline-none focus:ring-2 focus:ring-uzum-primary/20 transition-all font-medium text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </>
          )}

          {error && <p className="text-red-500 text-xs text-center font-medium bg-red-50 py-2 rounded-lg">{error}</p>}

          <button
            type="submit"
            className="w-full bg-uzum-primary text-white font-bold py-5 rounded-2xl shadow-xl shadow-uzum-primary/20 hover:shadow-uzum-primary/30 transition-all active:scale-95 text-sm uppercase tracking-widest mt-4"
          >
            {showSmsStep ? 'Подтвердить СМС' : isRegister ? t('createAccount') : t('signIn')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-uzum-primary text-sm font-bold hover:opacity-80 transition-all"
          >
            {isRegister ? t('alreadyHaveAccount') : t('dontHaveAccount')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
