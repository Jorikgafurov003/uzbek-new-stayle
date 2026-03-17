import React from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, ShoppingBag, Users, Package, CreditCard, 
  CheckCircle, Bot, AlertCircle, Clock, Check, User, Truck, Wallet
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip 
} from 'recharts';
import { AdminCalendar } from '../../../components/admin/AdminCalendar';
import { 
  DigitalClock, WeatherAndExchange, StarRating 
} from './AdminHelpers';
import { useLanguage } from '../../../context/LanguageContext';

const COLORS = ['#D4AF37', '#8B0000', '#F4D03F', '#9A7D0A'];

interface AdminDashboardProps {
  stats: any;
  theme: string;
  products: any[];
  orders: any[];
  users: any[];
  debts: any[];
  healthLogs: any[];
  insights: any[];
  forecasts: any[];
  topStats: any;
  systemErrors: any[];
  activityLogs: any[];
  setActiveTab: (tab: any) => void;
  fixSystemError: (id: number) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stats, theme, products, orders, users, debts, 
  healthLogs, insights, forecasts, topStats, 
  systemErrors, activityLogs, setActiveTab, fixSystemError
}) => {
  const { t } = useLanguage();

  const productSales = React.useMemo(() => {
    return orders.reduce((acc: any, order) => {
      order.items.forEach((item: any) => {
        if (!acc[item.productId]) {
          acc[item.productId] = { name: item.productName, count: 0, revenue: 0 };
        }
        acc[item.productId].count += item.quantity;
        acc[item.productId].revenue += item.quantity * item.price;
      });
      return acc;
    }, {});
  }, [orders]);

  const topProducts = React.useMemo(() => (Object.values(productSales) as any[])
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5), [productSales]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Row: Calendar + Time/Weather */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Calendar */}
        <div className="lg:col-span-5">
          <AdminCalendar theme={theme} />
        </div>

        {/* Live Time + Weather + USD */}
        <div className={`lg:col-span-7 p-8 rounded-[3.5rem] shadow-sm border flex flex-col justify-between transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}>
          <DigitalClock theme={theme} />
          <WeatherAndExchange theme={theme} />
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: t('revenue'), value: (stats?.revenue || 0).toLocaleString(), icon: <TrendingUp size={20} />, color: 'text-cyan-500', bg: theme === 'futuristic' ? 'bg-cyan-500/10' : 'bg-cyan-50', suffix: ' UZS' },
          { label: t('orders'), value: stats?.orders || 0, icon: <ShoppingBag size={20} />, color: 'text-blue-500', bg: theme === 'futuristic' ? 'bg-blue-500/10' : 'bg-blue-50' },
          { label: t('users'), value: stats?.users || 0, icon: <Users size={20} />, color: 'text-purple-500', bg: theme === 'futuristic' ? 'bg-purple-500/10' : 'bg-purple-50' },
          { label: t('products'), value: products.length, icon: <Package size={20} />, color: 'text-orange-500', bg: theme === 'futuristic' ? 'bg-orange-500/10' : 'bg-orange-50' },
          { label: t('debts'), value: debts.filter(d => d.status === 'pending').length, icon: <CreditCard size={20} />, color: 'text-red-500', bg: theme === 'futuristic' ? 'bg-red-500/10' : 'bg-red-50' },
          { label: 'System', value: healthLogs.some(l => l.status === 'error') ? 'Warning' : 'Healthy', icon: <CheckCircle size={20} />, color: healthLogs.some(l => l.status === 'error') ? 'text-red-500' : 'text-green-500', bg: healthLogs.some(l => l.status === 'error') ? (theme === 'futuristic' ? 'bg-red-500/10' : 'bg-red-50') : (theme === 'futuristic' ? 'bg-green-500/10' : 'bg-green-50') },
        ].map((item, i) => (
          <div key={i} className={`p-4 rounded-xl border flex flex-col gap-3 transition-all hover:shadow-md ${theme === 'futuristic'
            ? 'bg-white/5 border-white/15 hover:border-white/30'
            : 'bg-white border-gray-200 hover:border-gray-300'
            }`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.bg} ${item.color}`}>
              {item.icon}
            </div>
            <div>
              <p className={`text-[11px] font-semibold uppercase tracking-wider mb-0.5 ${theme === 'futuristic' ? 'text-white/50' : 'text-gray-500'
                }`}>{item.label}</p>
              <h3 className={`text-xl font-black leading-tight ${theme === 'futuristic' ? 'text-white' : 'text-gray-900'
                }`}>{item.value}<span className="text-sm font-medium">{item.suffix}</span></h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* AI Insights + Forecast - Spans 8 */}
        <div className="lg:col-span-8 space-y-5">
          {insights.length > 0 && (
            <div className={`p-6 rounded-xl border flex flex-col md:flex-row items-start gap-5 ${theme === 'futuristic' ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-amber-50 border-amber-200'
              }`}>
              <div className={`p-4 rounded-xl flex-shrink-0 ${theme === 'futuristic' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-amber-400 text-white'
                }`}>
                <Bot size={32} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${theme === 'futuristic' ? 'text-cyan-400' : 'text-amber-700'
                    }`}>AI Business Director</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${insights[0].risk_level === 'high' ? 'bg-red-500 text-white' :
                    insights[0].risk_level === 'medium' ? 'bg-orange-400 text-white' : 'bg-green-500 text-white'
                    }`}>{insights[0].risk_level} Risk</span>
                </div>
                <h3 className={`text-lg font-bold mb-1 leading-snug ${theme === 'futuristic' ? 'text-white' : 'text-gray-900'
                  }`}>{insights[0].summary}</h3>
                <p className={`text-sm leading-relaxed ${theme === 'futuristic' ? 'text-white/60' : 'text-gray-600'
                  }`}>{insights[0].recommendation}</p>
              </div>
            </div>
          )}

          {/* Forecast Chart */}
          <div className={`p-6 rounded-xl border ${theme === 'futuristic' ? 'bg-white/5 border-white/15' : 'bg-white border-gray-200'
            }`}>
            <div className="flex justify-between items-center mb-5">
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-wider mb-0.5 ${theme === 'futuristic' ? 'text-white/50' : 'text-gray-500'
                  }`}>AI Profit Forecast</p>
                <p className={`text-lg font-bold ${theme === 'futuristic' ? 'text-white' : 'text-gray-900'
                  }`}>Следующие 30 дней</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${theme === 'futuristic' ? 'bg-cyan-500' : 'bg-amber-500'
                    }`} />
                  <span className="text-[10px] font-medium text-gray-400 uppercase">Выручка</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${theme === 'futuristic' ? 'bg-purple-500' : 'bg-gray-800'
                    }`} />
                  <span className="text-[10px] font-medium text-gray-400 uppercase">Заказы</span>
                </div>
              </div>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecasts}>
                  <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: theme === 'futuristic' ? '#ffffff50' : '#9ca3af' }} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: theme === 'futuristic' ? '#ffffff50' : '#9ca3af' }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '0.75rem',
                      border: `1px solid ${theme === 'futuristic' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                      backgroundColor: theme === 'futuristic' ? 'rgba(10,10,20,0.9)' : '#ffffff',
                      color: theme === 'futuristic' ? '#ffffff' : '#111827'
                    }}
                  />
                  <Bar dataKey="expected_revenue" fill={theme === 'futuristic' ? '#06b6d4' : '#f59e0b'} radius={[4, 4, 0, 0]} name="Ожидаемая выручка" />
                  <Bar dataKey="expected_orders" fill={theme === 'futuristic' ? '#a855f7' : '#374151'} radius={[4, 4, 0, 0]} name="Ожидаемые заказы" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sidebar - Spans 4 */}
        <div className="lg:col-span-4 space-y-5">
          {/* Sales by Category Pie */}
          <div className={`p-6 rounded-xl border ${theme === 'futuristic' ? 'bg-white/5 border-white/15' : 'bg-white border-gray-200'
            }`}>
            <h4 className={`text-[11px] font-semibold uppercase tracking-wider mb-4 ${theme === 'futuristic' ? 'text-white/50' : 'text-gray-500'
              }`}>Продажи по категориям</h4>
            <div className="h-44 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.salesByCategory || []}
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={6}
                    dataKey="value"
                  >
                    {(stats?.salesByCategory || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '0.75rem',
                      border: `1px solid ${theme === 'futuristic' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                      backgroundColor: theme === 'futuristic' ? 'rgba(10,10,20,0.9)' : '#ffffff',
                      color: theme === 'futuristic' ? '#ffffff' : '#111827'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className={`text-[10px] font-semibold uppercase ${theme === 'futuristic' ? 'text-white/40' : 'text-gray-400'
                  }`}>Всего</span>
                <span className={`text-xl font-black ${theme === 'futuristic' ? 'text-white' : 'text-gray-900'
                  }`}>{stats?.salesByCategory?.length || 0}</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(stats?.salesByCategory || []).slice(0, 4).map((cat: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className={`text-[11px] font-medium truncate ${theme === 'futuristic' ? 'text-white/60' : 'text-gray-600'
                    }`}>{cat.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className={`p-6 rounded-xl border ${theme === 'futuristic' ? 'bg-white/5 border-white/15' : 'bg-gray-900 border-gray-700'
            }`}>
            <h4 className={`text-[11px] font-semibold uppercase tracking-wider mb-4 ${theme === 'futuristic' ? 'text-white/50' : 'text-gray-400'
              }`}>System Health</h4>
            <div className="space-y-3">
              {healthLogs.slice(0, 3).map((log, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'ok' ? 'bg-green-400' : 'bg-red-400'
                    }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{log.component}</p>
                    <p className={`text-[9px] uppercase tracking-wide ${log.status === 'ok' ? 'text-green-400' : 'text-red-400'
                      }`}>{log.status === 'ok' ? 'Running' : 'Issue detected'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Top Performers & Debts button */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Top Performers - Spans 4 */}
        <div className="lg:col-span-4">
          <div className={`p-6 rounded-xl border h-full ${theme === 'futuristic' ? 'bg-white/5 border-white/15' : 'bg-white border-gray-200'
            }`}>
            <h4 className={`text-[11px] font-semibold uppercase tracking-wider mb-4 ${theme === 'futuristic' ? 'text-white/50' : 'text-gray-500'
              }`}>Топ сотрудники</h4>
            <div className="space-y-3">
              {topStats?.topAgent && (
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${theme === 'futuristic' ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-blue-50 border-blue-100'
                  }`}>
                  <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                    <img src={topStats.topAgent.photo || 'https://picsum.photos/seed/agent/50/50'} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'futuristic' ? 'text-cyan-400' : 'text-blue-600'
                      }`}>Топ Агент</p>
                    <p className={`text-sm font-bold ${theme === 'futuristic' ? 'text-white' : 'text-gray-900'
                      }`}>{topStats.topAgent.name}</p>
                    <p className="text-[10px] text-gray-400">{topStats.topAgent.count} заказов</p>
                    <StarRating rating={topStats.topAgent.rating || 0} count={topStats.topAgent.ratingCount || 0} />
                  </div>
                </div>
              )}
              {topStats?.topCourier && (
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${theme === 'futuristic' ? 'bg-purple-500/10 border-purple-500/20' : 'bg-orange-50 border-orange-100'
                  }`}>
                  <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                    <img src={topStats.topCourier.photo || 'https://picsum.photos/seed/courier/50/50'} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'futuristic' ? 'text-purple-400' : 'text-orange-600'
                      }`}>Топ Курьер</p>
                    <p className={`text-sm font-bold ${theme === 'futuristic' ? 'text-white' : 'text-gray-900'
                      }`}>{topStats.topCourier.name}</p>
                    <p className="text-[10px] text-gray-400">{topStats.topCourier.count} доставок</p>
                    <StarRating rating={topStats.topCourier.rating || 0} count={topStats.topCourier.ratingCount || 0} />
                  </div>
                </div>
              )}
              {topStats?.topSeller && (
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${theme === 'futuristic' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-100'
                  }`}>
                  <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                    <img src={topStats.topSeller.image || 'https://picsum.photos/seed/product/50/50'} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'futuristic' ? 'text-amber-400' : 'text-amber-700'
                      }`}>Топ Товар</p>
                    <p className={`text-sm font-bold truncate ${theme === 'futuristic' ? 'text-white' : 'text-gray-900'
                      }`}>{topStats.topSeller.name}</p>
                    <p className="text-[10px] text-gray-400">{topStats.topSeller.count} продано</p>
                    <StarRating rating={topStats.topSeller.rating || 0} count={topStats.topSeller.ratingCount || 0} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Debts quick button - col 4 */}
        <div className="lg:col-span-2">
          <div
            onClick={() => setActiveTab('debts')}
            className={`h-full p-5 rounded-xl border cursor-pointer transition-all hover:scale-105 flex flex-col justify-between ${theme === 'futuristic'
              ? 'bg-red-500/10 border-red-500/30 hover:border-red-400'
              : 'bg-red-600 border-red-700 text-white'
              }`}
          >
            <Wallet size={24} className={theme === 'futuristic' ? 'text-red-400' : 'text-white/70'} />
            <div>
              <h3 className={`text-2xl font-black mb-0.5 ${theme === 'futuristic' ? 'text-red-400' : 'text-white'
                }`}>{debts.filter(d => d.status === 'pending').length}</h3>
              <p className={`text-xs font-semibold ${theme === 'futuristic' ? 'text-red-400/70' : 'text-white/80'
                }`}>Долгов</p>
            </div>
          </div>
        </div>

        {/* KPI Leaderboard - Spans 6 */}
        <div className={`lg:col-span-6 p-6 rounded-xl border ${theme === 'futuristic' ? 'bg-white/5 border-white/15' : 'bg-white border-gray-200'
          }`}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className={`text-[11px] font-semibold uppercase tracking-wider mb-0.5 ${theme === 'futuristic' ? 'text-white/50' : 'text-gray-500'
                }`}>Рейтинг</p>
              <p className={`text-lg font-bold ${theme === 'futuristic' ? 'text-white' : 'text-gray-900'
                }`}>Топ Сотрудники</p>
            </div>
            <Users size={18} className={theme === 'futuristic' ? 'text-white/30' : 'text-gray-400'} />
          </div>
          <div className="space-y-6">
            {['agent', 'courier'].map(role => (
              <div key={role} className="space-y-2">
                <h5 className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'futuristic' ? 'text-white/40' : 'text-gray-400'
                  }`}>{role === 'agent' ? 'Агенты' : 'Курьеры'}</h5>
                <div className="space-y-2">
                  {stats?.kpis?.filter((k: any) => k.role === role).slice(0, 3).map((kpi: any, i: number) => {
                    const u = users.find(user => user.id === kpi.user_id);
                    return (
                      <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${theme === 'futuristic' ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                        }`}>
                        <span className={`text-xs font-black w-5 text-center ${theme === 'futuristic' ? 'text-white/30' : 'text-gray-300'
                          }`}>{i + 1}</span>
                        <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                          {u?.photo ? <img src={u.photo} className="w-full h-full object-cover" /> : <User size={16} className="m-auto mt-1.5 text-gray-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${theme === 'futuristic' ? 'text-white' : 'text-gray-900'
                            }`}>{u?.name || 'Unknown'}</p>
                          <StarRating rating={u?.rating || 0} count={u?.ratingCount || 0} />
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${kpi.level === 'platinum' ? 'bg-blue-500 text-white' :
                          kpi.level === 'gold' ? 'bg-amber-500 text-white' :
                            kpi.level === 'silver' ? 'bg-gray-400 text-white' :
                              'bg-orange-400 text-white'
                          }`}>{kpi.score}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row: Recent Orders + Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent Orders - Spans 6 */}
        <div className={`lg:col-span-6 p-8 rounded-[3.5rem] shadow-sm border transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}>
          <h4 className={`text-xs font-black uppercase tracking-[0.2em] mb-8 ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>{t('recentOrders')}</h4>
          <div className="space-y-5">
            {orders.slice(0, 5).map(order => (
              <div key={order.id} className="flex items-center gap-4 group">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${theme === 'futuristic' ? 'bg-white/5 text-white/40 group-hover:bg-cyan-500/20 group-hover:text-cyan-400' : 'bg-stone-50 text-stone-400 group-hover:bg-gold/10 group-hover:text-gold'}`}>
                  <ShoppingBag size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>#{order.id} — {order.clientName}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${theme === 'futuristic' ? 'text-cyan-400' : 'text-gold-dark'}`}>{(order.totalPrice || 0).toLocaleString()} UZS</p>
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${order.orderStatus === 'delivered' ? (theme === 'futuristic' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600') : (theme === 'futuristic' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-gold/10 text-gold-dark')
                    }`}>
                    {order.orderStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Activity Logs — Improved readability */}
        <div className={`lg:col-span-6 p-8 rounded-[3.5rem] shadow-sm border flex flex-col max-h-[500px] transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h4 className={`text-xs font-black uppercase tracking-[0.2em] ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>{t('liveFeed')}</h4>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${theme === 'futuristic' ? 'bg-cyan-500/10' : 'bg-green-50'}`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${theme === 'futuristic' ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-green-500'}`}></div>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${theme === 'futuristic' ? 'text-cyan-400' : 'text-green-600'}`}>Live</span>
              </div>
            </div>
            <span className={`text-[10px] font-semibold ${theme === 'futuristic' ? 'text-white/30' : 'text-stone-300'}`}>{activityLogs.length} событий</span>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3" style={{ scrollbarWidth: 'thin' }}>
            {activityLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-stone-300">
                <Clock size={32} className="mb-2 opacity-20" />
                <p className={`text-xs font-bold font-sans uppercase tracking-widest ${theme === 'futuristic' ? 'text-white/20' : 'text-stone-300'}`}>{t('noActivity')}</p>
              </div>
            ) : (
              activityLogs.map((log, i) => {
                const logRole = log.userRole || log.role || '';
                const roleColor = logRole === 'agent'
                  ? { border: theme === 'futuristic' ? 'border-l-blue-400' : 'border-l-blue-500', icon: theme === 'futuristic' ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-500' }
                  : logRole === 'courier'
                    ? { border: theme === 'futuristic' ? 'border-l-purple-400' : 'border-l-purple-500', icon: theme === 'futuristic' ? 'bg-purple-500/15 text-purple-400' : 'bg-purple-50 text-purple-500' }
                    : { border: theme === 'futuristic' ? 'border-l-green-400' : 'border-l-green-500', icon: theme === 'futuristic' ? 'bg-green-500/15 text-green-400' : 'bg-green-50 text-green-500' };
                return (
                  <div key={i} className={`flex gap-3 p-3 rounded-2xl border-l-[3px] transition-all hover:scale-[1.01] ${roleColor.border} ${theme === 'futuristic' ? 'bg-white/[0.03] hover:bg-white/[0.06]' : 'bg-stone-50/50 hover:bg-stone-50'}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${roleColor.icon}`}>
                      {logRole === 'agent' ? <User size={16} /> : logRole === 'courier' ? <Truck size={16} /> : <CheckCircle size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] leading-snug ${theme === 'futuristic' ? 'text-white/90' : 'text-stone-800'}`}>
                        <span className={`font-bold ${theme === 'futuristic' ? 'text-white' : 'text-stone-700'}`}>{log.userName || t('system')}</span>
                        <span className={`font-medium ${theme === 'futuristic' ? 'text-white/60' : 'text-stone-600'}`}> {log.action}</span>
                      </p>
                      {log.details && <p className={`text-[11px] mt-1 leading-relaxed ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-500'}`}>{log.details}</p>}
                      <p className={`text-[9px] font-bold uppercase tracking-widest mt-1.5 ${theme === 'futuristic' ? 'text-cyan-400/70' : 'text-stone-400'}`}>
                        {new Date(log.createdAt || log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Top Products & System Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Products - Spans 6 */}
        <div className={`lg:col-span-6 p-8 rounded-[3.5rem] shadow-sm border transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}>
          <h4 className={`text-xs font-black uppercase tracking-[0.2em] mb-8 ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>{t('topSellingProducts')}</h4>
          <div className="space-y-6">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center gap-5">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm transition-all ${index === 0 ? (theme === 'futuristic' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20 neon-glow' : 'bg-gold text-white shadow-lg shadow-gold/20') :
                  index === 1 ? (theme === 'futuristic' ? 'bg-white/10 text-white/60' : 'bg-stone-200 text-stone-600') :
                    index === 2 ? (theme === 'futuristic' ? 'bg-purple-500/20 text-purple-400' : 'bg-orange-100 text-orange-600') :
                      (theme === 'futuristic' ? 'bg-white/5 text-white/40' : 'bg-stone-50 text-stone-400')
                  }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{product.name}</p>
                  <div className={`w-full h-1.5 rounded-full mt-2 overflow-hidden ${theme === 'futuristic' ? 'bg-white/5' : 'bg-stone-50'}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(product.revenue / topProducts[0].revenue) * 100}%` }}
                      className={`h-full ${theme === 'futuristic' ? 'bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-gold'}`}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{(product.revenue || 0).toLocaleString()}</p>
                  <p className={`text-[9px] font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>{product.count} {t('sold')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Critical Errors - Spans 6 */}
        <div className={`lg:col-span-6 p-8 rounded-[3.5rem] shadow-sm border transition-all ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}>
          <div className="flex justify-between items-center mb-8">
            <h4 className={`text-xs font-black uppercase tracking-[0.2em] ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>{t('systemMonitoring')}</h4>
            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${theme === 'futuristic' ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-500'}`}>
              {systemErrors.filter(e => !e.fixed).length} {t('criticalErrors')}
            </span>
          </div>
          <div className="space-y-4">
            {systemErrors.filter(e => !e.fixed).slice(0, 4).map((err, i) => (
              <div key={i} className={`p-5 border rounded-[2rem] flex items-start gap-4 transition-all ${theme === 'futuristic' ? 'bg-white/5 border-white/10' : 'border-red-100 bg-red-50/20'}`}>
                <div className={`p-3 rounded-2xl shadow-lg ${theme === 'futuristic' ? 'bg-red-500/20 text-red-400' : 'bg-red-500 text-white shadow-red-500/20'}`}>
                  <AlertCircle size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${theme === 'futuristic' ? 'text-red-400' : 'text-red-500'}`}>{err.route}</span>
                    <button
                      onClick={() => fixSystemError(err.id)}
                      className="text-[9px] font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-widest transition-all"
                    >
                      {t('fix')}
                    </button>
                  </div>
                  <p className={`text-xs font-bold leading-relaxed ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{err.message}</p>
                </div>
              </div>
            ))}
            {systemErrors.filter(e => !e.fixed).length === 0 && (
              <div className="text-center py-12">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${theme === 'futuristic' ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-500'}`}>
                  <CheckCircle size={32} />
                </div>
                <p className={`text-sm font-bold ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{t('noCriticalIssues')}</p>
                <p className={`text-[10px] uppercase tracking-widest mt-1 ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>{t('systemOptimal')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
