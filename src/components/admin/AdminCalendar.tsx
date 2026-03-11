import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AdminCalendar = ({ theme = 'light' }: { theme?: 'light' | 'futuristic' }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    // Adjust so Monday is 0, Sunday is 6
    const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();

    return (
        <div className={`p-6 rounded-[2.5rem] shadow-sm border flex flex-col h-full transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h4 className={`text-xs font-black uppercase tracking-[0.2em] mb-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>Календарь</h4>
                    <p className={`text-xl font-black ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={prevMonth} className={`p-2 rounded-xl transition-all ${theme === 'futuristic' ? 'bg-white/5 text-white/60 hover:bg-cyan-500 hover:text-white' : 'bg-stone-50 text-stone-600 hover:bg-gold hover:text-white'}`}>
                        <ChevronLeft size={18} />
                    </button>
                    <button onClick={nextMonth} className={`p-2 rounded-xl transition-all ${theme === 'futuristic' ? 'bg-white/5 text-white/60 hover:bg-cyan-500 hover:text-white' : 'bg-stone-50 text-stone-600 hover:bg-gold hover:text-white'}`}>
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                    <div key={day} className={`text-center text-[10px] font-black uppercase tracking-widest py-2 ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>
                        {day}
                    </div>
                ))}
            </div>

            <div className="flex-1 w-full">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentDate.toISOString()}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={{ duration: 0.2 }}
                        className="grid grid-cols-7 gap-2 h-full w-full"
                    >
                        {[...Array(startingDay)].map((_, i) => (
                            <div key={`empty-${i}`} className="p-2 text-center rounded-xl opacity-0" />
                        ))}

                        {[...Array(daysInMonth)].map((_, i) => {
                            const day = i + 1;
                            const isToday = isCurrentMonth && today.getDate() === day;

                            return (
                                <div
                                    key={day}
                                    className={`flex items-center justify-center p-2 rounded-xl text-sm font-bold transition-all cursor-pointer aspect-square ${isToday
                                        ? (theme === 'futuristic' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 neon-glow' : 'bg-gold text-white shadow-lg shadow-gold/30')
                                        : (theme === 'futuristic' ? 'text-white/60 bg-white/5 border border-white/5 hover:bg-white/10' : 'text-stone-600 bg-stone-50 border border-stone-100')
                                        }`}
                                >
                                    {day}
                                </div>
                            );
                        })}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};
