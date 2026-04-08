import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Lock, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiService } from '../services/api';

export const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const data = await ApiService.post('/api/auth/login', { phone, password });
            localStorage.setItem('token', data.token);
            login(data.user); // Update auth context
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[3rem] shadow-[0_20px_70px_rgba(0,0,0,0.05)] p-10 border border-stone-100"
                >
                    <div className="text-center mb-10">
                        <div className="w-20 h-20 bg-uzum-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-uzum-primary">
                            <Sparkles size={40} />
                        </div>
                        <h1 className="text-4xl font-black text-stone-800 tracking-tighter mb-2 italic">UZBECHKA</h1>
                        <p className="text-stone-400 font-bold uppercase tracking-[0.2em] text-[10px]">AI Super Delivery</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-4">Phone Number</label>
                            <div className="relative group">
                                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-uzum-primary transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="998 90 123 45 67"
                                    className="w-full pl-14 pr-6 py-5 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-uzum-primary/20 outline-none font-bold text-stone-800 placeholder:text-stone-300 transition-all"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-4">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-uzum-primary transition-colors" size={20} />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full pl-14 pr-6 py-5 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-uzum-primary/20 outline-none font-bold text-stone-800 placeholder:text-stone-300 transition-all"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-red-50 text-red-500 p-4 rounded-xl text-xs font-bold text-center border border-red-100"
                                >
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            disabled={loading}
                            type="submit"
                            className="w-full py-5 bg-uzum-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-uzum-primary/20 flex items-center justify-center gap-2 hover:bg-uzum-primary-dark active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>Sign In <ChevronRight size={18} /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 pt-10 border-t border-stone-50 text-center">
                        <p className="text-stone-400 text-xs font-medium">Don't have an account? <span className="text-uzum-primary font-black cursor-pointer hover:underline">Get started</span></p>
                    </div>
                </motion.div>

                <p className="text-center mt-8 text-[10px] font-black text-stone-300 uppercase tracking-[0.3em]">Built with AI for Uzbechka Pro</p>
            </div>
        </div>
    );
};
