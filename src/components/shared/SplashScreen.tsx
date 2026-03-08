import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Play welcome sound
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Audio autoplay blocked:", e));

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 800); // Wait for exit animation
    }, 2500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="w-full max-w-md aspect-[2/3] rounded-[3rem] overflow-hidden shadow-2xl relative"
          >
            <img 
              src="/api/image/firm_photo" 
              alt="Uzbechka" 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback if the image doesn't exist yet
                (e.target as HTMLImageElement).src = "https://picsum.photos/seed/bakery/800/1200";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-10 text-white text-center">
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm italic font-serif mb-1 opacity-80"
              >
                Вкус традиций с
              </motion.p>
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-5xl font-black mb-1 tracking-tighter"
              >
                UZBECHKA
              </motion.h1>
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-sm font-bold tracking-[0.2em] uppercase opacity-90"
              >
                DENAN bekary
              </motion.p>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="mt-12 flex flex-col items-center gap-4"
          >
            <div className="w-12 h-12 border-4 border-uzum-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-uzum-muted font-black uppercase tracking-widest text-xs">Yuklanmoqda...</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
