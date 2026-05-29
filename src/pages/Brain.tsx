import { useState, useEffect } from 'react';
import { fetchAISettings, saveAISettings, AISettings } from '../lib/api';

const emptySettings: AISettings = {
  deepseek_api_key: '',
  proxyapi_key: '',
  s3_endpoint: '',
  s3_access_key: '',
  s3_secret_key: '',
  s3_bucket: '',
};

export default function Brain() {
  const [settings, setSettings] = useState<AISettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetchAISettings().then((s) => {
      if (s) setSettings(s);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    const ok = await saveAISettings(settings);
    setMsg(
      ok
        ? { text: '✅ Настройки сохранены!', ok: true }
        : { text: '❌ Ошибка сохранения', ok: false },
    );
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  };

  const update = (key: keyof AISettings, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  if (loading) {
    return <p className="text-slate-400 text-center mt-10 animate-pulse">Загрузка настроек...</p>;
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-yellow-400">🧠 Мозг — Настройки AI и S3</h2>

      {/* DeepSeek */}
      <fieldset className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-3">
        <legend className="text-purple-400 font-semibold text-sm">🤖 DeepSeek V3 — чат</legend>
        <input
          type="password"
          placeholder="DEEPSEEK_API_KEY"
          value={settings.deepseek_api_key}
          onChange={(e) => update('deepseek_api_key', e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
        />
      </fieldset>

      {/* ProxyAPI */}
      <fieldset className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-3">
        <legend className="text-cyan-400 font-semibold text-sm">🖼️ ProxyAPI — распознавание чеков (GPT-4o-mini)</legend>
        <input
          type="password"
          placeholder="PROXYAPI_KEY"
          value={settings.proxyapi_key}
          onChange={(e) => update('proxyapi_key', e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </fieldset>

      {/* Yandex S3 */}
      <fieldset className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-3">
        <legend className="text-orange-400 font-semibold text-sm">☁️ Яндекс S3 — хранилище</legend>
        <input
          type="text"
          placeholder="S3 Endpoint (https://storage.yandexcloud.net)"
          value={settings.s3_endpoint}
          onChange={(e) => update('s3_endpoint', e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
        />
        <input
          type="text"
          placeholder="S3 Access Key"
          value={settings.s3_access_key}
          onChange={(e) => update('s3_access_key', e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
        />
        <input
          type="password"
          placeholder="S3 Secret Key"
          value={settings.s3_secret_key}
          onChange={(e) => update('s3_secret_key', e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
        />
        <input
          type="text"
          placeholder="S3 Bucket"
          value={settings.s3_bucket}
          onChange={(e) => update('s3_bucket', e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
        />
      </fieldset>

      {msg && (
        <div
          className={`text-center text-sm p-2 rounded-lg ${
            msg.ok ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'
          }`}
        >
          {msg.text}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold rounded-lg transition-colors"
      >
        {saving ? '💾 Сохранение...' : '💾 Сохранить настройки'}
      </button>
    </div>
  );
}