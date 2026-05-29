import { useState, useEffect } from 'react';
import { fetchSettings, saveSettings, AISettings } from '../lib/api';

type Tariff = 'free' | 'start' | 'business' | 'pro';

const TARIFFS: { key: Tariff; name: string; price: string; desc: string }[] = [
  { key: 'free', name: 'Free', price: '0 ₽', desc: '3 пробных чека' },
  { key: 'start', name: 'Старт', price: '490 ₽/мес', desc: '50 чеков + аналитика' },
  { key: 'business', name: 'Бизнес', price: '1 490 ₽/мес', desc: '500 чеков + CSV/PDF экспорт' },
  { key: 'pro', name: 'Профи', price: '4 990 ₽/мес', desc: '∞ чеков + API + приоритет' },
];

const TOKEN_COST = 0.15;
const MARKUP = 3;

export default function Brain() {
  const [cfg, setCfg] = useState<AISettings>({
    proxyapi_key: '', deepseek_key: '',
    s3_endpoint: '', s3_access_key: '', s3_secret_key: '', s3_bucket: '',
    tariff: 'free', sbp_tbank_key: '', sbp_merchant_id: '',
  });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetchSettings().then((s) => { setCfg(s); setLoading(false); });
  }, []);

  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 2500);
  };

  const handleSaveAll = async () => {
    await saveSettings(cfg);
    flash('✅ Все настройки сохранены', true);
  };

  const setTariff = (t: Tariff) => {
    setCfg((prev) => ({ ...prev, tariff: t }));
    saveSettings({ tariff: t });
    flash(`✅ Тариф «${TARIFFS.find((x) => x.key === t)?.name}» активирован`, true);
  };

  const update = (k: keyof AISettings, v: string) => setCfg((prev) => ({ ...prev, [k]: v }));

  if (loading) return <p className="text-zinc-400 text-center mt-10 animate-pulse">Загрузка...</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-amber-400">🧠 Мозг — Все настройки</h2>

      {/* Тарифы */}
      <fieldset className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <legend className="text-amber-400 font-semibold text-sm">💎 Тарифный план</legend>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {TARIFFS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTariff(t.key)}
              className={`p-3 rounded-xl border text-left transition ${
                cfg.tariff === t.key
                  ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                  : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              <div className="font-bold text-sm">{t.name}</div>
              <div className="text-xs opacity-70">{t.price}</div>
              <div className="text-xs opacity-50 mt-1">{t.desc}</div>
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-600">
          Наценка ×{MARKUP}: {TOKEN_COST.toFixed(2)} → {(TOKEN_COST * MARKUP).toFixed(2)} ₽/1K
        </p>
      </fieldset>

      {/* AI ключи */}
      <fieldset className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <legend className="text-purple-400 font-semibold text-sm">🔑 Ключи AI</legend>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">DeepSeek V3</label>
            <input type="password" placeholder="sk-..." value={cfg.deepseek_key}
              onChange={(e) => update('deepseek_key', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">ProxyAPI</label>
            <input type="password" placeholder="sk-..." value={cfg.proxyapi_key}
              onChange={(e) => update('proxyapi_key', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500" />
          </div>
        </div>
      </fieldset>

      {/* S3 */}
      <fieldset className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <legend className="text-cyan-400 font-semibold text-sm">☁️ Яндекс S3</legend>
        <div className="grid md:grid-cols-2 gap-3">
          <input type="text" placeholder="Endpoint" value={cfg.s3_endpoint} onChange={(e) => update('s3_endpoint', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500" />
          <input type="text" placeholder="Bucket" value={cfg.s3_bucket} onChange={(e) => update('s3_bucket', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500" />
          <input type="text" placeholder="Access Key" value={cfg.s3_access_key} onChange={(e) => update('s3_access_key', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500" />
          <input type="password" placeholder="Secret Key" value={cfg.s3_secret_key} onChange={(e) => update('s3_secret_key', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500" />
        </div>
      </fieldset>

      {/* СБП */}
      <fieldset className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <legend className="text-green-400 font-semibold text-sm">💳 СБП</legend>
        <div className="grid md:grid-cols-2 gap-3">
          <input type="password" placeholder="Ключ Т-Банка" value={cfg.sbp_tbank_key} onChange={(e) => update('sbp_tbank_key', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-500" />
          <input type="text" placeholder="ID Мерчанта" value={cfg.sbp_merchant_id} onChange={(e) => update('sbp_merchant_id', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-500" />
        </div>
      </fieldset>

      {msg && (
        <div className={`text-center text-sm p-2 rounded-lg ${msg.ok ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      <button onClick={handleSaveAll} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-colors">
        💾 Сохранить все настройки
      </button>
    </div>
  );
}