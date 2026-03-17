import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import { Star, User } from 'lucide-react';
import { useMap, useMapEvents } from 'react-leaflet';

export const StarRating: React.FC<{ rating: number; count?: number; size?: number }> = ({ rating, count, size = 12 }) => {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            className={`${star <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-stone-200'}`}
          />
        ))}
      </div>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] font-bold text-stone-400">({count})</span>
      )}
    </div>
  );
};

export const DigitalClock: React.FC<{ theme: string }> = ({ theme }) => {
  const { language } = useLanguage();
  const [liveTime, setLiveTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-center mb-6">
      <div className={`text-5xl md:text-6xl font-black tracking-tight tabular-nums ${theme === 'futuristic' ? 'text-cyan-400' : 'text-stone-800'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <p className={`text-sm font-semibold mt-2 capitalize ${theme === 'futuristic' ? 'text-white/40' : 'text-stone-400'}`}>
        {liveTime.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'uz-UZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
};

export const WeatherAndExchange: React.FC<{ theme: string }> = ({ theme }) => {
  const { t } = useLanguage();
  const [weather, setWeather] = useState<{ temp: string; desc: string; icon: string } | null>(null);
  const [usdRate, setUsdRate] = useState<number | null>(null);

  useEffect(() => {
    fetch('https://wttr.in/Bukhara?format=j1')
      .then(r => r.json())
      .then(d => {
        const cur = d.current_condition?.[0];
        if (cur) setWeather({
          temp: cur.temp_C,
          desc: cur.weatherDesc?.[0]?.value || '',
          icon: cur.weatherIconUrl?.[0]?.value || ''
        });
      })
      .catch(() => { });

    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(d => {
        if (d?.rates?.UZS) setUsdRate(Math.round(d.rates.UZS));
      })
      .catch(() => { });
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Bukhara Weather */}
      <div className={`p-5 rounded-2xl border flex items-center gap-4 ${theme === 'futuristic' ? 'bg-white/5 border-white/10' : 'bg-gradient-to-br from-sky-50 to-blue-50 border-sky-100'}`}>
        {weather?.icon ? (
          <img src={weather.icon} alt="weather" className="w-14 h-14" />
        ) : (
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${theme === 'futuristic' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-sky-100 text-sky-500'}`}>☀️</div>
        )}
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'futuristic' ? 'text-white/40' : 'text-sky-500'}`}>{t('city')}</p>
          {weather ? (
            <>
              <p className={`text-2xl font-black ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{weather.temp}°C</p>
              <p className={`text-[11px] font-medium ${theme === 'futuristic' ? 'text-white/50' : 'text-stone-500'}`}>{weather.desc}</p>
            </>
          ) : (
            <p className={`text-sm font-medium ${theme === 'futuristic' ? 'text-white/30' : 'text-stone-300'}`}>{t('loading')}...</p>
          )}
        </div>
      </div>

      {/* USD/UZS Rate */}
      <div className={`p-5 rounded-2xl border flex items-center gap-4 ${theme === 'futuristic' ? 'bg-white/5 border-white/10' : 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-100'}`}>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black ${theme === 'futuristic' ? 'bg-green-500/10 text-green-400' : 'bg-emerald-100 text-emerald-600'}`}>$</div>
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'futuristic' ? 'text-white/40' : 'text-emerald-500'}`}>USD / UZS</p>
          {usdRate ? (
            <p className={`text-2xl font-black ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{usdRate.toLocaleString()}</p>
          ) : (
            <p className={`text-sm font-medium ${theme === 'futuristic' ? 'text-white/30' : 'text-stone-300'}`}>{t('loading')}...</p>
          )}
          <p className={`text-[11px] font-medium ${theme === 'futuristic' ? 'text-white/50' : 'text-stone-500'}`}>{t('cbRate')}</p>
        </div>
      </div>
    </div>
  );
};

export const LocationPicker = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number, address?: string) => void }) => {
  const { apiFetch } = useData();

  useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng;
      try {
        const res = await apiFetch(`/api/geocoding/reverse?lat=${lat}&lng=${lng}`);
        if (res.ok) {
          const data = await res.json();
          onLocationSelect(lat, lng, data.address);
        } else {
          onLocationSelect(lat, lng);
        }
      } catch (err) {
        onLocationSelect(lat, lng);
      }
    },
  });
  return null;
};
