import { useState, useEffect } from 'react';
import { fetchSettings, saveSettings, createPayment, confirmPayment, AISettings } from '../lib/api';

type Tariff = 'free' | 'start' | 'business' | 'pro';

const TARIFFS: { key: Tariff; name: string; price: string; desc: string }[] = [
  { key: 'free', name: 'Free', price: '0 ₽', desc: '3 пробных чека' },
  { key: 'start', name: 'Старт', price: '490 ₽/мес', desc: '50 чеков + аналитика' },
  { key: 'business', name: 'Бизнес', price: '1 490 ₽/мес', desc: '500 чеков + CSV/PDF экспорт' },
  { key: 'pro', name: 'Профи', price: '4 990 ₽/мес', desc: '∞ чеков + API + приоритет' },
];

const SCAN_MODELS = [
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o-mini (быстрая)' },
  { value: 'openai/gpt-4o', label: 'GPT-4o (точная)' },
  { value: 'anthropic/claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
];

function EyeBtn({ show, toggle }: { show: boolean; toggle: () => void }) {
  return (
    <button type="button" onClick={toggle} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-sm">
      {show ? '🙈' : '👁️'}
    </button>
  );
}

export default function Brain() {
  const [cfg, setCfg] = useState<AISettings>({
    proxyapi_key: '', proxyapi_url: 'https://proxyapi.ru',
    deepseek_key: '', selected_model: 'openai/gpt-4o-mini',
    s3_endpoint: '', s3_access_key: '', s3_secret_key: '', s3_bucket: '',
    sbp_tbank_key: '', sbp_merchant_id: '',
  });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Глазки
  const [showDeepSeek, setShowDeepSeek] = useState(false);
  const [showProxy, setShowProxy] = useState(false);
  const [showS3Secret, setShowS3Secret] = useState(false);
  const [showSBP, setShowSBP] = useState(false);

  // Оплата
  const [payLoading, setPayLoading] = useState(false);
  const [paymentId, setPaymentId] = useState('');
  const [selectedTariff, setSelectedTariff] = useState<Tariff>('start');

  useEffect(() => {
    fetchSettings().then((s) => {
      setCfg(s);
      setLoading(false);
    });
  }, []);

  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleSaveAll = async () => {
    await saveSettings(cfg);
    flash('✅ Все настройки сохранены', true);
  };

  const update = (k: keyof AISettings, v: string) => setCfg((prev) => ({ ...prev, [k]: v }));

  const handleCreatePayment = async (tariff: Tariff) => {
    setPayLoading(true);
    setSelectedTariff(tariff);
    const result = await createPayment(tariff);
    if (result.error) {
      flash(`❌ ${result.error}`, false);
      setPayLoading(false);
      return;
    }
    setPaymentId(result.payment_id || '');
    flash(`🧾 Платёж создан: ${result.tariff} за ${result.amount} ₽`, true);
    setPayLoading(false);
  };

  const handleConfirmPayment = async () => {
    if (!paymentId) return;
    setPayLoading(true);
    const result = await confirmPayment(paymentId, selectedTariff);
    if (result.error) {
      flash(`❌ ${result.error}`, false);
    } else {
      flash(`✅ Тариф «${result.tariff}» активирован!`, true);
    }
    setPayLoading(false);
  };

  if (loading) return <p className="text-zinc-400 text-center mt-10 animate-pulse">Загрузка...</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-amber-400">🧠 Мозг — API и Тарифы</h2>

      {/* Тарифы */}
      <fieldset className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <legend className="text-amber-400 font-semibold text-sm">💎 Тарифный план</legend>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {TARIFFS.map((t) => (
            <button key={t.key} onClick={() => handleCreatePayment(t.key)}
              className={`p-3 rounded-xl border text-left transition ${
                selectedTariff === t.key && paymentId
                  ? 'border-green-500 bg-green-500/10 text-green-300'
                  : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
              }`}>
              <div className="font-bold text-sm">{t.name}</div>
              <div className="text-xs opacity-70">{t.price}</div>
              <div className="text-xs opacity-50 mt-1">{t.desc}</div>
            </button>
          ))}
        </div>
        {paymentId && (
          <div className="bg-green-900/20 border border-green-800 rounded-lg p-3 flex items-center gap-3">
            <span className="text-xs text-green-400">Платёж создан</span>
            <button onClick={handleConfirmPayment} disabled={payLoading}
              className="px-3 py-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs rounded-lg">
              {payLoading ? '...' : '✅ Подтвердить оплату'}
            </button>
          </div>
        )}
        <p className="text-xs text-zinc-600">
          В реальном проекте здесь будет интеграция с Т-Банк/CloudPayments/Stripe.
          Сейчас — имитация для тестирования.
        </p>
      </fieldset>

      {/* Подключение к API */}
      <fieldset className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <legend className="text-purple-400 font-semibold text-sm">🔌 API ключи (хранятся на сервере)</legend>
        <p className="text-xs text-green-400 mb-2">✅ Ключи НИКОГДА не передаются в браузер. Они отправляются прямо на сервер.</p>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">DeepSeek V3 (ключ)</label>
            <div className="relative">
              <input type={showDeepSeek ? 'text' : 'password'} placeholder="sk-..." value={cfg.deepseek_key}
                onChange={(e) => update('deepseek_key', e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-9 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500" />
              <EyeBtn show={showDeepSeek} toggle={() => setShowDeepSeek(!showDeepSeek)} />
            </div>
            <p className="text-xs text-zinc-600 mt-1">URL: https://api.deepseek.com</p>
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">ProxyAPI (ключ)</label>
            <div className="relative">
              <input type={showProxy ? 'text' : 'password'} placeholder="sk-..." value={cfg.proxyapi_key}
                onChange={(e) => update('proxyapi_key', e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-9 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500" />
              <EyeBtn show={showProxy} toggle={() => setShowProxy(!showProxy)} />
            </div>
            <p className="text-xs text-zinc-600 mt-1">URL: https://proxyapi.ru</p>
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">ProxyAPI URL (свой endpoint)</label>
          <input type="text" placeholder="https://proxyapi.ru" value={cfg.proxyapi_url}
            onChange={(e) => update('proxyapi_url', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500" />
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">Модель для распознавания чеков</label>
          <select value={cfg.selected_model} onChange={(e) => update('selected_model', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
            {SCAN_MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </fieldset>

      {/* S3 */}
      <fieldset className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <legend className="text-cyan-400 font-semibold text-sm">☁️ Яндекс S3 (хранилище чеков)</legend>
        <div className="grid md:grid-cols-2 gap-3">
          <input type="text" placeholder="Endpoint" value={cfg.s3_endpoint} onChange={(e) => update('s3_endpoint', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500" />
          <input type="text" placeholder="Bucket" value={cfg.s3_bucket} onChange={(e) => update('s3_bucket', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500" />
          <input type="text" placeholder="Access Key" value={cfg.s3_access_key} onChange={(e) => update('s3_access_key', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500" />
          <div className="relative">
            <input type={showS3Secret ? 'text' : 'password'} placeholder="Secret Key" value={cfg.s3_secret_key} onChange={(e) => update('s3_secret_key', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-9 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500" />
            <EyeBtn show={showS3Secret} toggle={() => setShowS3Secret(!showS3Secret)} />
          </div>
        </div>
      </fieldset>

      {/* СБП */}
      <fieldset className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <legend className="text-green-400 font-semibold text-sm">💳 СБП (Система Быстрых Платежей)</legend>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="relative">
            <input type={showSBP ? 'text' : 'password'} placeholder="Ключ Т-Банка" value={cfg.sbp_tbank_key} onChange={(e) => update('sbp_tbank_key', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-9 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-500" />
            <EyeBtn show={showSBP} toggle={() => setShowSBP(!showSBP)} />
          </div>
          <input type="text" placeholder="ID Мерчанта" value={cfg.sbp_merchant_id} onChange={(e) => update('sbp_merchant_id', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-500" />
        </div>
        <p className="text-xs text-zinc-600">Для приёма оплаты по QR-коду через СБП</p>
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