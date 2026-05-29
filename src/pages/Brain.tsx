import { useState, useEffect } from 'react';
import { fetchSettings, saveSettings, AISettings } from '../lib/api';

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

const TOKEN_COST = 0.15;
const MARKUP = 3;

function EyeBtn({ show, toggle }: { show: boolean; toggle: () => void }) {
  return (
    <button type="button" onClick={toggle} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-sm">
      {show ? '🙈' : '👁️'}
    </button>
  );
}

function getSelectedModel(): string {
  try { return localStorage.getItem('X-Selected-Model') || 'openai/gpt-4o-mini'; } catch { return 'openai/gpt-4o-mini'; }
}
function setSelectedModel(v: string) {
  try { localStorage.setItem('X-Selected-Model', v); } catch { /* */ }
}

function getServerConfig() {
  try { return JSON.parse(localStorage.getItem('server_config') || '{"host":"","user":"root","password":"","dbpath":"/root/my-project-storage/babki.db"}'); }
  catch { return { host: '', user: 'root', password: '', dbpath: '/root/my-project-storage/babki.db' }; }
}
function setServerConfig(cfg: Record<string,string>) {
  try { localStorage.setItem('server_config', JSON.stringify(cfg)); } catch { /* */ }
}

export default function Brain() {
  const [cfg, setCfg] = useState<AISettings>({
    proxyapi_key: '', deepseek_key: '',
    s3_endpoint: '', s3_access_key: '', s3_secret_key: '', s3_bucket: '',
    tariff: 'free', sbp_tbank_key: '', sbp_merchant_id: '',
  });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Глазки
  const [showDeepSeek, setShowDeepSeek] = useState(false);
  const [showProxy, setShowProxy] = useState(false);
  const [showS3Secret, setShowS3Secret] = useState(false);
  const [showSBP, setShowSBP] = useState(false);
  const [showServerPass, setShowServerPass] = useState(false);

  // Модель сканирования
  const [scanModel, setScanModel] = useState(getSelectedModel);

  // Сервер VPS
  const [server, setServer] = useState(getServerConfig);

  // Инструкция
  const [showDBHelp, setShowDBHelp] = useState(false);

  useEffect(() => {
    fetchSettings().then((s) => { setCfg(s); setLoading(false); });
  }, []);

  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 2500);
  };

  const handleSaveAll = async () => {
    await saveSettings(cfg);
    setSelectedModel(scanModel);
    setServerConfig(server);
    flash('✅ Все настройки сохранены', true);
  };

  const setTariff = (t: Tariff) => {
    setCfg((prev) => ({ ...prev, tariff: t }));
    saveSettings({ tariff: t });
    flash(`✅ Тариф «${TARIFFS.find((x) => x.key === t)?.name}» активирован`, true);
  };

  const update = (k: keyof AISettings, v: string) => setCfg((prev) => ({ ...prev, [k]: v }));
  const updateServer = (k: string, v: string) => setServer((prev: Record<string,string>) => ({ ...prev, [k]: v }));

  if (loading) return <p className="text-zinc-400 text-center mt-10 animate-pulse">Загрузка...</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-amber-400">🧠 Мозг — Все настройки</h2>

      {/* Тарифы */}
      <fieldset className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <legend className="text-amber-400 font-semibold text-sm">💎 Тарифный план</legend>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {TARIFFS.map((t) => (
            <button key={t.key} onClick={() => setTariff(t.key)}
              className={`p-3 rounded-xl border text-left transition ${cfg.tariff === t.key ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'}`}>
              <div className="font-bold text-sm">{t.name}</div>
              <div className="text-xs opacity-70">{t.price}</div>
              <div className="text-xs opacity-50 mt-1">{t.desc}</div>
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-600">Наценка ×{MARKUP}: {TOKEN_COST.toFixed(2)} → {(TOKEN_COST * MARKUP).toFixed(2)} ₽/1K</p>
      </fieldset>

      {/* ===== ПОДКЛЮЧЕНИЕ К API ===== */}
      <fieldset className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <legend className="text-purple-400 font-semibold text-sm">🔌 Подключение к API</legend>

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
            <p className="text-xs text-zinc-600 mt-1">URL: https://api.proxyapi.ru/openai/v1</p>
          </div>
        </div>

        {/* Выбор модели сканирования */}
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Модель для распознавания чеков</label>
          <select value={scanModel} onChange={(e) => setScanModel(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
            {SCAN_MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <p className="text-xs text-zinc-600 mt-1">Передаётся в заголовке X-Selected-Model</p>
        </div>
      </fieldset>

      {/* S3 */}
      <fieldset className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <legend className="text-cyan-400 font-semibold text-sm">☁️ Яндекс S3</legend>
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
        <legend className="text-green-400 font-semibold text-sm">💳 СБП</legend>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="relative">
            <input type={showSBP ? 'text' : 'password'} placeholder="Ключ Т-Банка" value={cfg.sbp_tbank_key} onChange={(e) => update('sbp_tbank_key', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-9 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-500" />
            <EyeBtn show={showSBP} toggle={() => setShowSBP(!showSBP)} />
          </div>
          <input type="text" placeholder="ID Мерчанта" value={cfg.sbp_merchant_id} onChange={(e) => update('sbp_merchant_id', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-500" />
        </div>
      </fieldset>

      {/* ===== ПОДКЛЮЧЕНИЕ К СЕРВЕРУ (SFTP) ===== */}
      <fieldset className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <legend className="text-indigo-400 font-semibold text-sm">🖥️ Подключение к серверу (SFTP/VPS)</legend>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">IP-адрес сервера (Host)</label>
            <input type="text" placeholder="123.45.67.89" value={server.host}
              onChange={(e) => updateServer('host', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Пользователь</label>
            <input type="text" placeholder="root" value={server.user}
              onChange={(e) => updateServer('user', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="relative">
            <label className="text-xs text-zinc-500 block mb-1">Пароль от сервера</label>
            <input type={showServerPass ? 'text' : 'password'} placeholder="••••••••" value={server.password}
              onChange={(e) => updateServer('password', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-9 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500" />
            <EyeBtn show={showServerPass} toggle={() => setShowServerPass(!showServerPass)} />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Путь к диску/файлу БД</label>
            <input type="text" placeholder="/root/my-project-storage/babki.db" value={server.dbpath}
              onChange={(e) => updateServer('dbpath', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500" />
          </div>
        </div>

        {/* Инструкция */}
        <div>
          <button onClick={() => setShowDBHelp(!showDBHelp)}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition">
            {showDBHelp ? '🔼 Скрыть инструкцию' : '📖 Как подключить сервер? (Purple Cadmium / FileZilla)'}
          </button>
          {showDBHelp && (
            <div className="mt-2 bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-400 space-y-2">
              <p className="font-semibold text-zinc-300">Автоматическое подключение через SFTP (без ручной настройки):</p>
              <ol className="list-decimal list-inside space-y-1">
                <li><b>IP-адрес</b>: скопируйте из панели VPS (Purple Cadmium → Серверы → IP)</li>
                <li><b>Пользователь</b>: обычно <code className="text-green-400">root</code></li>
                <li><b>Пароль</b>: пароль от VPS (приходит на почту при создании сервера)</li>
                <li><b>Путь к диску</b>: укажите полный путь к папке проекта, например <code className="text-green-400">/root/my-project-storage/babki.db</code></li>
                <li>Убедитесь, что на VPS включён <span className="text-amber-400">SSH-доступ по паролю</span> (обычно включён по умолчанию)</li>
              </ol>
              <p className="text-zinc-500 italic mt-2">
                FastAPI через <code className="text-purple-400">paramiko</code> автоматически подключится к серверу,
                создаст базу данных (SQLite) и сохранит все чеки. Никаких команд в терминал вводить не нужно.
              </p>
            </div>
          )}
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