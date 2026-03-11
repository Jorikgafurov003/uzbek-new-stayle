import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashScreenProps {
  onFinish: () => void;
}

const slides = [
  {
    emoji: '🛍️',
    bg: 'from-[#6C1EFF] to-[#9C6BFF]',
    accent: '#6C1EFF',
    title: 'UZBECHKA',
    subtitle: 'Pro Delivery Platform',
    desc: 'Умная система доставки для вашего бизнеса. Управляйте заказами в реальном времени.',
  },
  {
    emoji: '📦',
    bg: 'from-[#FF6B35] to-[#FFA500]',
    accent: '#FF6B35',
    title: 'Заказы',
    subtitle: 'Мгновенный контроль',
    desc: 'Отслеживайте каждый заказ от создания до доставки. Назначайте курьеров одним нажатием.',
  },
  {
    emoji: '🗺️',
    bg: 'from-[#0ea5e9] to-[#38bdf8]',
    accent: '#0ea5e9',
    title: 'GPS Трекер',
    subtitle: 'Онлайн на карте',
    desc: 'Следите за агентами и курьерами в режиме реального времени прямо на интерактивной карте.',
  },
  {
    emoji: '🏪',
    bg: 'from-[#059669] to-[#34d399]',
    accent: '#059669',
    title: 'Магазины',
    subtitle: 'Полный учёт',
    desc: 'Управляйте клиентами, магазинами и агентами. Все данные в одном месте.',
  },
];

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  // Play welcome sound once
  useEffect(() => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => { });
  }, []);

  const goNext = () => {
    if (current < slides.length - 1) {
      setDirection(1);
      setCurrent(c => c + 1);
    } else {
      onFinish();
    }
  };

  const slide = slides[current];

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center overflow-hidden select-none">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={current}
          custom={direction}
          initial={{ opacity: 0, x: direction * 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -60 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="w-full flex flex-col items-center px-8"
        >
          {/* Illustration Card */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className={`w-64 h-64 rounded-[3rem] bg-gradient-to-br ${slide.bg} flex items-center justify-center shadow-2xl mb-10`}
            style={{ boxShadow: `0 30px 60px ${slide.accent}40` }}
          >
            <span style={{ fontSize: 100 }}>{slide.emoji}</span>
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <p className="text-[11px] font-black uppercase tracking-[0.3em] mb-1" style={{ color: slide.accent }}>
              {slide.subtitle}
            </p>
            <h1 className="text-4xl font-black text-stone-900 tracking-tighter mb-4">{slide.title}</h1>
            <p className="text-stone-500 text-sm leading-relaxed max-w-xs mx-auto font-medium">{slide.desc}</p>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Bottom Controls */}
      <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-6 px-8">
        {/* Dots */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <motion.div
              key={i}
              onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
              animate={{ width: i === current ? 28 : 8, opacity: i === current ? 1 : 0.3 }}
              className="h-2 rounded-full cursor-pointer"
              style={{ backgroundColor: slide.accent }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex w-full gap-3">
          {current < slides.length - 1 && (
            <button
              onClick={onFinish}
              className="flex-1 py-4 rounded-2xl border-2 border-stone-200 text-stone-400 font-black text-xs uppercase tracking-widest hover:bg-stone-50 transition-all"
            >
              Пропустить
            </button>
          )}
          <button
            onClick={goNext}
            className={`py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 ${current < slides.length - 1 ? 'flex-2 px-8' : 'flex-1'}`}
            style={{ background: `linear-gradient(135deg, ${slide.accent}, ${slide.accent}cc)`, boxShadow: `0 8px 24px ${slide.accent}40` }}
          >
            {current < slides.length - 1 ? 'Далее →' : '🚀 Начать'}
          </button>
        </div>
      </div>
    </div>
  );
};
