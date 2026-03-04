import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import { AlertTriangle, Check, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}) => {
  const { t } = useLanguage();
  const { speak } = useData();

  useEffect(() => {
    if (isOpen) {
      speak(title || t('confirmAction'));
    }
  }, [isOpen, title, t, speak]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden p-8 text-center space-y-6"
          >
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto text-yellow-600">
              <AlertTriangle size={40} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-uzum-text">
                {title || t('confirmAction')}
              </h3>
              <p className="text-uzum-muted font-medium">
                {message || t('areYouSure')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <button 
                onClick={onClose}
                className="py-4 bg-uzum-bg text-uzum-text rounded-2xl font-bold hover:bg-uzum-muted/10 transition-all flex items-center justify-center gap-2"
              >
                <X size={20} /> {t('no')}
              </button>
              <button 
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="py-4 bg-uzum-primary text-white rounded-2xl font-bold shadow-lg shadow-uzum-primary/20 hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                <Check size={20} /> {t('yes')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
