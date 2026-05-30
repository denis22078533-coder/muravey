import { useState, useEffect, useCallback } from 'react';
import {
  fetchSettings, saveSettings, createPayment, confirmPayment,
  AISettings, fetchHealth, HealthStatus,
  checkProxyApi, checkDeepSeek, checkS3, CheckResult,
} from '../lib/api';

type Tariff = 'free' | 'start' | 'business' | 'pro';

const TARIFFS: { key: Tariff; name: string; price: string; desc: string }[] = [
  { key: 'free', name: 'Free', price: '0 ₽', desc: '3 пробных чека' },
  { key: 'start', name: 'Старт', price: '490 ₽/мес', desc: '50 чеков + аналитика' },
  { key: 'business', name: 'Бизнес', price: '1 490 ₽/мес', desc: '500 чеков + CSV/PDF экспорт' },
  { key: 'pro', name: 'Профи', price: '4 990 ₽/мес', desc: '∞ чеков + API + приоритет' },
];

const SCAN_MODELS = [
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o-mini (быстрая, дёшево)' },
  { value: 'openai/gpt-4o', label: 'GPT-4o (точная, дороже)' },
  { value: 'anthropic/claude-3-5-sonnet', label: 'Claude 3.5 Sonnet (очень точная)' },
];

function EyeBtn({ show, toggle }: { show: boolean; toggle: () => void }) {
  return (
    <button type="button" onClick={toggle} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-sm">
      {show ? '🙈' : '👁️'}
    </button>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${ok ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-400' : 'bg-red-400'}`} />
      {label}
    </span>
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
  const [health, setHealth] = useState<HealthStatus | null>(null);

  // Глазки
  const [showDeepSeek, setShowDeepSeek] = useState(false);
  const [showProxy, setShowProxy] = useState(false);
  const [showS3Secret, setShowS3Secret] = useState(false);
  const [showSBP, setShowSBP] = useState(false);

  // Проверки
  const [checking, setChecking] = useState<Record<string, boolean>>({});
  const [checkResults, setCheckResults] = useState<Record<string, CheckResult | null>>({});

  // Оплата
  const [payLoading, setPayLoading] = useState(false);
  const [paymentId, setPaymentId] = useState('');
  const [selectedTariff, setSelectedTariff] = useState<Tariff>('start');

  // Инструкции
  const [showGuide, setShowGuide] = useState(false);

  const loadData = useCallback(async () => {
    const [s, h] = await Promise.all([fetchSettings(), fetchHealth()]);
    setCfg(s);
    setHealth(h);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleSaveAll = async () => {
    await saveSettings(cfg);
    flash('✅ Все настройки сохранены', true);
    loadData();
  };

  const update = (k: keyof AISettings, v: string) => setCfg(prev => ({ ...prev, [k]: v }));

  // Проверка соединений
  const runCheck = async (key: string, fn: () => Promise<CheckResult>) => {
    setChecking(prev => ({ ...prev, [key]: true }));
    setCheckResults(prev => ({ ...prev, [key]: null }));
    const result = await fn();
    setCheckResults(prev => ({ ...prev, [key]: result }));
    setChecking(prev => ({ ...prev, [key]: false }));
    flash(result.ok ? `✅ ${key} — ${result.message || 'OK'}` : `❌ ${key} — ${result.error || 'Ошибка'}`, result.ok);
  };

  // Платежи
  const handleCreatePayment = async (tariff: Tariff) => {
    setPayLoading(true);
    setSelectedTariff(tariff);
    const result = await createPayment(tariff);
    if (result.error) { flash(`❌ ${result.error}`, false); setPayLoading(false); return; }
    setPaymentId(result.payment_id || '');
    flash(`🧾 Платёж создан: ${tariff}`, true);
    setPayLoading(false);
  };

  const handleConfirmPayment = async () => {
    if (!paymentId) return;
    setPayLoading(true);
    const result = await confirmPayment(paymentId, selectedTariff);
    if (result.error) { flash(`❌ ${result.error}`, false); } 
    else { flash(`✅ Тариф «${result.tariff || selectedTariff}» активирован!`, true); loadData(); }
    setPayLoading(false);
  };

  if (loading) return <p className="text-zinc-400 text-center mt-10 animate-pulse">Загрузка...</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-amber-400">🧠 Мозг — Настройки и диагностика</h2>

      {/* ===== СТАТУС СИСТЕМЫ ===== */}
      <fieldset className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <legend className="text-amber-400 font-semibold text-sm">📊 Статус системы</legend>
        {health && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <StatusBadge ok={health.db_ok} label={`БД: ${health.db_type}`} />
              <StatusBadge ok={health.authenticated} label={health.authenticated ? 'Авторизован' : 'Гость'} />
              <StatusBadge ok={health.has_proxyapi} label={health.has_proxyapi ? 'ProxyAPI ✓' : 'ProxyAPI ✗'} />
              <StatusBadge ok={health.has_deepseek} label={health.has_deepseek ? 'DeepSeek ✓' : 'DeepSeek ✗'} />
              <StatusBadge ok={health.has_s3} label={health.has_s3 ? 'S3 ✓' : 'S3 ✗'} />
            </div>
            <div className="flex gap-4 text-xs text-zinc-500">
              <span>Тариф: <b className="text-zinc-300">{health.tariff}</b></span>
              <span>Чеков: <b className="text-zinc-300">{health.scans_used}/{health.scans_limit}</b></span>
              <span>Версия: <b className="text-zinc-300">{health.version}</b></span>
            </div>
            {health.db_type === 'sqlite' && (
              <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-500/30 rounded-lg p-2 mt-2">
                ⚠️ Используется SQLite (локальная БД). Для продакшена настройте PostgreSQL через переменную <code className="text-amber-300">DATABASE_URL</code>.
              </p>
            )}
          </div>
        )}
        <button onClick={loadData} className="text-xs text-amber-400 hover:text-amber-300">🔄 Обновить статус</button>
      </fieldset>

      {/* ===== ТАРИФЫ ===== */}
      <fieldset className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <legend className="text-amber-400 font-semibold text-sm">💎 Тарифный план</legend>
        <p className="text-xs text-zinc-500">Выберите тариф и подтвердите оплату. Сейчас — тестовый режим.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {TARIFFS.map(t => (
            <button key={t.key} onClick={() => handleCreatePayment(t.key)} disabled={payLoading}
              className={`p-3 rounded-xl border text-left transition disabled:opacity-50 ${
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
            <span className="text-xs text-green-400">Платёж #{paymentId.slice(0, 8)}...</span>
            <button onClick={handleConfirmPayment} disabled={payLoading}
              className="px-3 py-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs rounded-lg font-bold">
              {payLoading ? '⏳ ...' : '✅ Подтвердить оплату'}
            </button>
          </div>
        )}
      </fieldset>

      {/* ===== ПОДКЛЮЧЕНИЕ К API ===== */}
      <fieldset className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <legend className="text-purple-400 font-semibold text-sm">🔌 API ключи (хранятся только на сервере)</legend>

        <div className="bg-green-900/20 border border-green-800 rounded-lg p-2 text-xs text-green-400 mb-3">
          🔒 <b>Безопасно:</b> ключи отправляются напрямую на сервер и никогда не видны в браузере. Маскируются как ***.
        </div>

        {/* ProxyAPI */}
        <div className="border border-zinc-700 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-purple-400">🌐 ProxyAPI (распознавание чеков)</span>
            <button
              onClick={() => runCheck('proxyapi', checkProxyApi)}
              disabled={!cfg.proxyapi_key || checking.proxyapi}
              className="text-xs px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 disabled:opacity-30 text-purple-300 rounded-lg transition"
            >
              {checking.proxyapi ? '⏳ Проверка...' : '🩺 Проверить соединение'}
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-500 block mb-0.5">Ключ API (sk-...)</label>
              <div className="relative">
                <input type={showProxy ? 'text' : 'password'} placeholder="sk-proxyapi-..." value={cfg.proxyapi_key}
                  onChange={e => update('proxyapi_key', e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-9 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500" />
                <EyeBtn show={showProxy} toggle={() => setShowProxy(!showProxy)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-0.5">URL (обычно https://proxyapi.ru)</label>
              <input type="text" placeholder="https://proxyapi.ru" value={cfg.proxyapi_url}
                onChange={e => update('proxyapi_url', e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500" />
            </div>
          </div>
          <p className="text-xs text-zinc-600">
            Где взять? → <a href="https://proxyapi.ru" target="_blank" className="text-purple-400 hover:text-purple-300 underline">proxyapi.ru</a> → регистрация → создать ключ.
          </p>
          {checkResults.proxyapi && (
            <div className={`text-xs p-2 rounded-lg ${checkResults.proxyapi.ok ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
              {checkResults.proxyapi.message || checkResults.proxyapi.error}
            </div>
          )}
        </div>

        {/* DeepSeek */}
        <div className="border border-zinc-700 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-400">🤖 DeepSeek V3 (чат-помощник)</span>
            <button
              onClick={() => runCheck('deepseek', checkDeepSeek)}
              disabled={!cfg.deepseek_key || checking.deepseek}
              className="text-xs px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 disabled:opacity-30 text-blue-300 rounded-lg transition"
            >
              {checking.deepseek ? '⏳ Проверка...' : '🩺 Проверить соединение'}
            </button>
          </div>
          <div className="relative">
            <label className="text-xs text-zinc-500 block mb-0.5">Ключ API (sk-...)</label>
            <input type={showDeepSeek ? 'text' : 'password'} placeholder="sk-deepseek-..." value={cfg.deepseek_key}
              onChange={e => update('deepseek_key', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-9 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500" />
            <EyeBtn show={showDeepSeek} toggle={() => setShowDeepSeek(!showDeepSeek)} />
          </div>
          <p className="text-xs text-zinc-600">
            Где взять? → <a href="https://platform.deepseek.com" target="_blank" className="text-blue-400 hover:text-blue-300 underline">platform.deepseek.com</a> → API Keys.
          </p>
          {checkResults.deepseek && (
            <div className={`text-xs p-2 rounded-lg ${checkResults.deepseek.ok ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
              {checkResults.deepseek.message || checkResults.deepseek.error}
            </div>
          )}
        </div>

        {/* Модель сканирования */}
        <div className="border border-zinc-700 rounded-lg p-3 space-y-2">
          <label className="text-sm font-medium text-cyan-400 block">🎯 Модель распознавания</label>
          <select value={cfg.selected_model} onChange={e => update('selected_model', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
            {SCAN_MODELS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <p className="text-xs text-zinc-600">GPT-4o-mini — быстро и дёшево. Claude 3.5 — максимальная точность для сложных чеков.</p>
        </div>
      </fieldset>

      {/* ===== S3 ===== */}
      <fieldset className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <legend className="text-cyan-400 font-semibold text-sm">☁️ S3 хранилище (Яндекс Облако / VK Cloud / AWS)</legend>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-zinc-500">Изображения чеков сохраняются в объектное хранилище.</p>
          <button
            onClick={() => runCheck('s3', checkS3)}
            disabled={!cfg.s3_endpoint || !cfg.s3_access_key || checking.s3}
            className="text-xs px-2 py-1 bg-cyan-600/30 hover:bg-cyan-600/50 disabled:opacity-30 text-cyan-300 rounded-lg transition"
          >
            {checking.s3 ? '⏳ Проверка...' : '🩺 Проверить соединение'}
          </button>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-0.5">Endpoint (например: storage.yandexcloud.net)</label>
            <input type="text" placeholder="storage.yandexcloud.net" value={cfg.s3_endpoint}
              onChange={e => update('s3_endpoint', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-0.5">Bucket (название хранилища)</label>
            <input type="text" placeholder="my-babki-bucket" value={cfg.s3_bucket}
              onChange={e => update('s3_bucket', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-0.5">Access Key (публичный ключ)</label>
            <input type="text" placeholder="YCAJE..." value={cfg.s3_access_key}
              onChange={e => update('s3_access_key', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-0.5">Secret Key (секретный ключ)</label>
            <div className="relative">
              <input type={showS3Secret ? 'text' : 'password'} placeholder="YCM..." value={cfg.s3_secret_key}
                onChange={e => update('s3_secret_key', e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-9 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500" />
              <EyeBtn show={showS3Secret} toggle={() => setShowS3Secret(!showS3Secret)} />
            </div>
          </div>
        </div>
        {checkResults.s3 && (
          <div className={`text-xs p-2 rounded-lg ${checkResults.s3.ok ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
            {checkResults.s3.message || checkResults.s3.error}
          </div>
        )}
        <details className="text-xs text-zinc-600">
          <summary className="cursor-pointer text-cyan-400 hover:text-cyan-300">📖 Инструкция: как создать S3</summary>
          <ol className="list-decimal list-inside space-y-1 mt-2 text-zinc-500">
            <li>Зарегистрируйтесь в <a href="https://cloud.yandex.ru" target="_blank" className="text-cyan-400 underline">Яндекс Облако</a> (или VK Cloud / AWS)</li>
            <li>Создайте сервисный аккаунт с ролью <code className="text-zinc-300">storage.editor</code></li>
            <li>Создайте бакет (публичный или приватный)</li>
            <li>Сгенерируйте статические ключи доступа (Access Key + Secret Key)</li>
            <li>Скопируйте endpoint (например: <code className="text-zinc-300">storage.yandexcloud.net</code>)</li>
            <li>Вставьте данные в форму выше и нажмите «Проверить соединение»</li>
          </ol>
        </details>
      </fieldset>

      {/* ===== СБП ===== */}
      <fieldset className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <legend className="text-green-400 font-semibold text-sm">💳 СБП (приём оплаты)</legend>
        <p className="text-xs text-zinc-500">Настройте приём платежей через Систему Быстрых Платежей (Т-Банк).</p>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-0.5">Ключ API Т-Банка</label>
            <div className="relative">
              <input type={showSBP ? 'text' : 'password'} placeholder="tbank_api_key..." value={cfg.sbp_tbank_key}
                onChange={e => update('sbp_tbank_key', e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-9 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-500" />
              <EyeBtn show={showSBP} toggle={() => setShowSBP(!showSBP)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-0.5">ID Мерчанта (из ЛК Т-Банка)</label>
            <input type="text" placeholder="merchant-id" value={cfg.sbp_merchant_id}
              onChange={e => update('sbp_merchant_id', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-500" />
          </div>
        </div>
        <details className="text-xs text-zinc-600">
          <summary className="cursor-pointer text-green-400 hover:text-green-300">📖 Инструкция: подключение СБП</summary>
          <ol className="list-decimal list-inside space-y-1 mt-2 text-zinc-500">
            <li>Откройте ЛК Т-Банк Бизнес или <a href="https://oplata.tbank.ru" target="_blank" className="text-green-400 underline">oplata.tbank.ru</a></li>
            <li>Создайте терминал → получите API-ключ и Merchant ID</li>
            <li>Добавьте вебхук на <code className="text-zinc-300">https://ваш-домен/api/payments/confirm</code></li>
          </ol>
        </details>
      </fieldset>

      {/* ===== ОБЩАЯ ИНСТРУКЦИЯ ===== */}
      <fieldset className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <legend className="text-zinc-400 font-semibold text-sm">📖 Полная инструкция по запуску</legend>
        <button onClick={() => setShowGuide(!showGuide)} className="text-xs text-zinc-400 hover:text-zinc-300">
          {showGuide ? '🔼 Скрыть' : '📖 Показать инструкцию'}
        </button>
        {showGuide && (
          <div className="text-xs text-zinc-500 space-y-2 bg-zinc-800 rounded-lg p-3">
            <p className="font-semibold text-zinc-300">1. База данных</p>
            <p>Создайте PostgreSQL (например на <a href="https://supabase.com" className="text-amber-400 underline">Supabase</a> — бесплатно 500MB) и добавьте переменную окружения:</p>
            <code className="block bg-zinc-950 p-2 rounded text-green-400 break-all">DATABASE_URL=postgresql://user:pass@host:5432/dbname</code>
            <p className="text-xs text-amber-400/80">Без PostgreSQL будет использоваться SQLite (не для продакшена).</p>

            <p className="font-semibold text-zinc-300 mt-3">2. JWT секрет</p>
            <code className="block bg-zinc-950 p-2 rounded text-green-400 break-all">JWT_SECRET=ваш-секретный-ключ-минимум-32-символа</code>

            <p className="font-semibold text-zinc-300 mt-3">3. Хостинг бэкенда</p>
            <p>Бэкенд проекта успешно адаптирован под Serverless-функции и разворачивается автоматически вместе с фронтендом.</p>

            <p className="font-semibold text-zinc-300 mt-3">4. Хостинг фронтенда</p>
            <p>Соберите: <code className="text-zinc-300">npm run build</code> → задеплойте папку <code className="text-zinc-300">dist/</code> на Vercel/Netlify.</p>

            <p className="font-semibold text-zinc-300 mt-3">5. Настройка API ключей</p>
            <p>Заполните все поля выше (ProxyAPI, DeepSeek, S3) и нажмите «Проверить соединение» для каждого.</p>
          </div>
        )}
      </fieldset>

      {msg && (
        <div className={`text-center text-sm p-3 rounded-lg ${msg.ok ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      <button onClick={handleSaveAll} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-colors">
        💾 Сохранить все настройки
      </button>
    </div>
  );
}