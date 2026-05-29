import { useState } from 'react';
import {
  getProxyApiKey, setProxyApiKey,
  getDeepSeekKey, setDeepSeekKey,
} from '../lib/api';
import {
  Tariff, getTariff, setTariff,
  S3Config, getS3Config, setS3Config,
  SBPConfig, getSBPConfig, setSBPConfig,
} from '../lib/store';

const TARIFFS: { key: Tariff; name: string; price: string; desc: string }[] = [
  { key: 'free', name: 'Free', price: '0 ₽', desc: '3 пробных чека' },
  { key: 'start', name: 'Старт', price: '490 ₽/мес', desc: '50 чеков + аналитика' },
  { key: 'business', name: 'Бизнес', price: '1 490 ₽/мес', desc: '500 чеков + CSV/PDF экспорт' },
  { key: 'pro', name: 'Профи', price: '4 990 ₽/мес', desc: '∞ чеков + API + приоритет' },
];

const TOKEN_COST_PER_1K = 0.15; // себестоимость за 1000 токенов в рублях
const MARKUP = 3; // наценка +200% = ×3

export default function Brain() {
  // AI ключи
  const [proxyapiKey, setProxyapiKeyLocal] = useState(() => getProxyApiKey());
  const [deepseekKey, setDeepseekKeyLocal] = useState(() => getDeepSeekKey());

  // Тариф
  const [tariff, setTariffLocal] = useState<Tariff>(() => getTariff());

  // S3
  const [s3, setS3Local] = useState<S3Config>(() => getS3Config());

  // СБП
  const [sbp, setSBPLocal] = useState<SBPConfig>(() => getSBPConfig());

  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 2500);
  };

  // --- Handlers ---
  const saveAIKeys = () => {
    setProxyApiKey(proxyapiKey);
    setDeepSeekKey(deepseekKey);
    flash('✅ Ключи AI сохранены', true);
  };

  const activateTariff = (t: Tariff) => {
    setTariffLocal(t);
    setTariff(t);
    flash(`✅ Тариф «${TARIFFS.find((x) => x.key === t)?.name}» активирован`, true);
  };

  const saveS3 = () => {
    setS3Config(s3);
    flash('✅ Настройки S3 сохранены', true);
  };

  const saveSBP = () => {
    setSBPConfig(sbp);
    flash('✅ Настройки СБП сохранены', true);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-amber-400">🧠 Мозг — Все настройки</h2>
      <p className="text-zinc-500 text-sm">
        Ключи и настройки хранятся в localStorage вашего браузера.
      </p>

      {/* ====== ТАРИФЫ ====== */}
      <fieldset className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <legend className="text-amber-400 font-semibold text-sm">💎 Тарифный план</legend>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {TARIFFS.map((t) => (
            <button
              key={t.key}
              onClick={() => activateTariff(t.key)}
              className={`p-3 rounded-xl border text-left transition ${
                tariff === t.key
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
          Себестоимость токенов: ~{TOKEN_COST_PER_1K.toFixed(2)} ₽/1K → с наценкой ×{MARKUP}: {(TOKEN_COST_PER_1K * MARKUP).toFixed(2)} ₽/1K
        </p>
      </fieldset>

      {/* ====== AI КЛЮЧИ ====== */}
      <fieldset className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <legend className="text-purple-400 font-semibold text-sm">🔑 Ключи AI</legend>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">DeepSeek V3</label>
            <input
              type="password"
              placeholder="sk-..."
              value={deepseekKey}
              onChange={(e) => setDeepseekKeyLocal(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">ProxyAPI</label>
            <input
              type="password"
              placeholder="sk-..."
              value={proxyapiKey}
              onChange={(e) => setProxyapiKeyLocal(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
        <button
          onClick={saveAIKeys}
          className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          💾 Сохранить ключи AI
        </button>
      </fieldset>

      {/* ====== S3 ====== */}
      <fieldset className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <legend className="text-cyan-400 font-semibold text-sm">☁️ Яндекс Object Storage (S3)</legend>
        <div className="grid md:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Endpoint (https://storage.yandexcloud.net)"
            value={s3.endpoint}
            onChange={(e) => setS3Local({ ...s3, endpoint: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
          />
          <input
            type="text"
            placeholder="Bucket"
            value={s3.bucket}
            onChange={(e) => setS3Local({ ...s3, bucket: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
          />
          <input
            type="text"
            placeholder="Access Key"
            value={s3.accessKey}
            onChange={(e) => setS3Local({ ...s3, accessKey: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
          />
          <input
            type="password"
            placeholder="Secret Key"
            value={s3.secretKey}
            onChange={(e) => setS3Local({ ...s3, secretKey: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <button
          onClick={saveS3}
          className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          💾 Сохранить настройки S3
        </button>
      </fieldset>

      {/* ====== СБП ====== */}
      <fieldset className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <legend className="text-green-400 font-semibold text-sm">💳 СБП-эквайринг</legend>
        <div className="grid md:grid-cols-2 gap-3">
          <input
            type="password"
            placeholder="Ключ Т-Банка"
            value={sbp.tbankKey}
            onChange={(e) => setSBPLocal({ ...sbp, tbankKey: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-500"
          />
          <input
            type="text"
            placeholder="ID Мерчанта СБП"
            value={sbp.merchantId}
            onChange={(e) => setSBPLocal({ ...sbp, merchantId: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-500"
          />
        </div>
        <button
          onClick={saveSBP}
          className="w-full py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          💾 Сохранить настройки СБП
        </button>
      </fieldset>

      {msg && (
         <div
          className={`text-center text-sm p-2 rounded-lg ${
            msg.ok ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'
          }`}
         >
          {msg.text}
        </div>
      )}
    </div>
  );
}