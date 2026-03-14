import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Phone, Mail } from 'lucide-react';
import { motion } from 'motion/react';

type AuthMode = 'email' | 'phone';

export const Login: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [showSmsStep, setShowSmsStep] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('email');
  const [phoneAuthLoading, setPhoneAuthLoading] = useState(false);
  const { login, register, loginWithPhone, confirmPhoneCode, loginWithGoogle, phoneConfirmation } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  // --- Вход по email (номер телефона + пароль через бэкенд) ---
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister && !showSmsStep) {
        setShowSmsStep(true);
        return;
      }

      if (isRegister && showSmsStep) {
        if (smsCode !== '1234') {
          setError(t('wrongSmsCode'));
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

  // --- Вход по телефону (Firebase Phone Auth / SMS) ---
  const handlePhoneSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPhoneAuthLoading(true);
    try {
      await loginWithPhone(phone);
    } catch (err: any) {
      setError(err.message || t('errorSendingSms'));
    } finally {
      setPhoneAuthLoading(false);
    }
  };

  const handlePhoneVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await confirmPhoneCode(smsCode);
    } catch (err: any) {
      setError(err.message || t('invalidCode'));
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
          <div className="w-24 h-24 bg-stone-100 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-uzum-primary/10 rotate-3 overflow-hidden border-4 border-white">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover -rotate-3" />
          </div>
          <h1 className="text-4xl text-center font-black text-uzum-primary tracking-tighter mb-1 flex flex-col sm:flex-row items-center justify-center gap-2">
            UZBECHKA <span className="text-lg font-bold text-stone-500 tracking-normal">DENAN bekary</span>
          </h1>
          <p className="text-uzum-muted text-[10px] font-bold uppercase tracking-[0.2em] mb-2">DENAN bekary</p>
          <p className="text-uzum-muted text-sm font-medium">{t('premiumDelivery')}</p>
        </div>

        {/* Вкладки: Email / Телефон */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setAuthMode('email'); setError(''); setShowSmsStep(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${
              authMode === 'email'
                ? 'bg-uzum-primary text-white shadow-lg shadow-uzum-primary/20'
                : 'bg-uzum-bg text-uzum-muted'
            }`}
          >
            <Mail size={16} />
            {t('password')}
          </button>
          <button
            onClick={() => { setAuthMode('phone'); setError(''); setShowSmsStep(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${
              authMode === 'phone'
                ? 'bg-uzum-primary text-white shadow-lg shadow-uzum-primary/20'
                : 'bg-uzum-bg text-uzum-muted'
            }`}
          >
            <Phone size={16} />
            SMS
          </button>
        </div>

        {/* ========== EMAIL/PASSWORD MODE ========== */}
        {authMode === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-5">
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
                <label className="block text-[10px] font-black text-uzum-muted uppercase tracking-widest mb-2 ml-1">{t('smsCode')}</label>
                <input
                  type="text"
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-uzum-bg border-none outline-none focus:ring-2 focus:ring-uzum-primary/20 transition-all font-medium text-sm"
                  placeholder="1234"
                  required
                />
                <p className="text-[10px] text-uzum-muted mt-2 ml-1 font-bold">{t('enterSmsCode')}</p>
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
              {showSmsStep ? t('confirmSms') : isRegister ? t('createAccount') : t('signIn')}
            </button>
          </form>
        )}

        {/* ========== PHONE SMS MODE ========== */}
        {authMode === 'phone' && (
          <>
            {!phoneConfirmation ? (
              <form onSubmit={handlePhoneSendCode} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-uzum-muted uppercase tracking-widest mb-2 ml-1">{t('enterPhoneNumber')}</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-uzum-bg border-none outline-none focus:ring-2 focus:ring-uzum-primary/20 transition-all font-medium text-sm"
                    placeholder="+998 90 123 45 67"
                    required
                  />
                  <p className="text-[10px] text-uzum-muted mt-2 ml-1 font-bold">{t('phoneFormatHint')}</p>
                </div>

                {error && <p className="text-red-500 text-xs text-center font-medium bg-red-50 py-2 rounded-lg">{error}</p>}

                <button
                  type="submit"
                  disabled={phoneAuthLoading}
                  className="w-full bg-uzum-primary text-white font-bold py-5 rounded-2xl shadow-xl shadow-uzum-primary/20 hover:shadow-uzum-primary/30 transition-all active:scale-95 text-sm uppercase tracking-widest mt-4 disabled:opacity-50"
                >
                  {phoneAuthLoading ? t('sending') : t('sendSmsCode')}
                </button>
              </form>
            ) : (
              <form onSubmit={handlePhoneVerifyCode} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-uzum-muted uppercase tracking-widest mb-2 ml-1">{t('smsCode')}</label>
                  <input
                    type="text"
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-uzum-bg border-none outline-none focus:ring-2 focus:ring-uzum-primary/20 transition-all font-medium text-sm"
                    placeholder="123456"
                    required
                  />
                  <p className="text-[10px] text-uzum-muted mt-2 ml-1 font-bold">{t('enterSixDigitCode')}</p>
                </div>

                {error && <p className="text-red-500 text-xs text-center font-medium bg-red-50 py-2 rounded-lg">{error}</p>}

                <button
                  type="submit"
                  className="w-full bg-uzum-primary text-white font-bold py-5 rounded-2xl shadow-xl shadow-uzum-primary/20 hover:shadow-uzum-primary/30 transition-all active:scale-95 text-sm uppercase tracking-widest mt-4"
                >
                  {t('confirm')}
                </button>
              </form>
            )}
          </>
        )}

        {/* Переключение Вход / Регистрация (только для email-режима) */}
        {authMode === 'email' && (
          <div className="mt-8 text-center">
            <button
              onClick={() => { setIsRegister(!isRegister); setShowSmsStep(false); setError(''); }}
              className="text-uzum-primary text-sm font-bold hover:opacity-80 transition-all"
            >
              {isRegister ? t('alreadyHaveAccount') : t('dontHaveAccount')}
            </button>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="h-[1px] bg-[#e2e5eb] flex-1"></div>
          <span className="text-[10px] font-black text-uzum-muted uppercase tracking-widest">{t('orSignInWith')}</span>
          <div className="h-[1px] bg-[#e2e5eb] flex-1"></div>
        </div>

        <button
          onClick={() => loginWithGoogle()}
          className="w-full mt-4 flex items-center justify-center gap-3 bg-white border border-[#e2e5eb] p-4 rounded-2xl hover:bg-uzum-bg transition-all active:scale-95"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
          <span className="text-sm font-bold text-uzum-muted">Google</span>
        </button>
      </motion.div>
    </div>
  );
};
