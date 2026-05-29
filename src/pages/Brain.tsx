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

function getDBConfig() {
  try { return JSON.parse(localStorage.getItem('db_config') || '{"host":"","port":"5432","user":"","password":"","dbname":""}'); }
  catch { return { host: '', port: '5432', user: '', password: '', dbname: '' }; }
}
function setDBConfig(cfg: Record<string,string>) {
  try { localStorage.setItem('db_config', JSON.stringify(cfg)); } catch { /* */ }
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
  const [showDBPass, setShowDBPass] = useState(false);

  // Модель сканирования
  const [scanModel, setScanModel] = useState(getSelectedModel);

  // БД
  const [db, setDb] = useState(getDBConfig);

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
    setDBConfig(db);
    flash('✅ Все настройки сохранены', true);
  };

  const setTariff = (t: Tariff) => {
    setCfg((prev) => ({ ...prev, tariff: t }));
    saveSettings({ tariff: t });
    flash(`✅ Тариф «${TARIFFS.find((x) => x.key === t)?.name}» активирован`, true);
  };

  const update = (k: keyof AISettings, v: string) => setCfg((prev) => ({ ...prev, [k]: v }));
  const updateDB = (k: string, v: string) => setDb((prev: Record<string,string>) => ({ ...prev, [k]: v }));

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

      {/* ===== ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ ===== */}
      <fieldset className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <legend className="text-indigo-400 font-semibold text-sm">🗄️ Подключение к базе данных (Reg.ru)</legend>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Хост (Host)</label>
            <input type="text" placeholder="123.45.67.89 или db.example.com" value={db.host}
              onChange={(e) => updateDB('host', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Порт (Port)</label>
            <input type="text" placeholder="5432" value={db.port}
              onChange={(e) => updateDB('port', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Имя пользователя (User)</label>
            <input type="text" placeholder="admin" value={db.user}
              onChange={(e) => updateDB('user', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="relative">
            <label className="text-xs text-zinc-500 block mb-1">Пароль (Password)</label>
            <input type={showDBPass ? 'text' : 'password'} placeholder="••••••••" value={db.password}
              onChange={(e) => updateDB('password', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-9 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500" />
            <EyeBtn show={showDBPass} toggle={() => setShowDBPass(!showDBPass)} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-zinc-500 block mb-1">Имя базы данных (Database Name)</label>
            <input type="text" placeholder="babki_scan" value={db.dbname}
              onChange={(e) => updateDB('dbname', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500" />
          </div>
        </div>

        {/* Инструкция */}
        <div>
          <button onClick={() => setShowDBHelp(!showDBHelp)}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition">
            {showDBHelp ? '🔼 Скрыть инструкцию' : '📖 Как подключить базу Reg.ru?'}
          </button>
          {showDBHelp && (
            <div className="mt-2 bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-400 space-y-2">
              <p className="font-semibold text-zinc-300">Инструкция по подключению PostgreSQL/MySQL от Reg.ru:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Войдите в <span className="text-amber-400">личный кабинет Reg.ru</span> → раздел <span className="text-amber-400">«Хостинг»</span></li>
                <li>Перейдите в <span className="text-amber-400">«Базы данных»</span> и создайте новую БД (MySQL или PostgreSQL)</li>
                <li>Скопируйте из панели:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li><b>Хост</b>: обычно <code className="text-green-400">localhost</code> или IP-адрес сервера</li>
                    <li><b>Порт</b>: 3306 для MySQL / 5432 для PostgreSQL</li>
                    <li><b>Имя пользователя</b> и <b>Пароль</b>: логин, который вы указали при создании БД</li>
                    <li><b>Имя базы данных</b>: точное название созданной базы</li>
                  </ul>
                </li>
                <li>Убедитесь, что в настройках Reg.ru разрешены <span className="text-amber-400">внешние подключения</span> (Remote MySQL/PostgreSQL)</li>
                <li>Вставьте скопированные данные в поля выше и нажмите «Сохранить»</li>
              </ol>
              <p className="text-zinc-500 italic mt-2">После сохранения данные передаются в заголовках X-DB-* при запросах к API.</p>
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