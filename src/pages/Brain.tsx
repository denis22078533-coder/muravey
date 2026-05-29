import { useState, useCallback } from 'react';
import { getProxyApiKey, setProxyApiKey, getDeepSeekKey, setDeepSeekKey } from '../lib/api';

export default function Brain() {
  const [proxyapiKey, setProxyapiKeyLocal] = useState(getProxyApiKey);
  const [deepseekKey, setDeepseekKeyLocal] = useState(getDeepSeekKey);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const handleSave = useCallback(() => {
    setProxyApiKey(proxyapiKey);
    setDeepSeekKey(deepseekKey);
    setMsg({ text: '✅ Ключи сохранены в браузере!', ok: true });
    setTimeout(() => setMsg(null), 2500);
  }, [proxyapiKey, deepseekKey]);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-yellow-400">🧠 Мозг — Ключи AI</h2>
      <p className="text-slate-400 text-sm">
        Ключи хранятся только в localStorage вашего браузера и передаются в заголовках запросов.
      </p>

      {/* DeepSeek */}
      <fieldset className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-3">
        <legend className="text-purple-400 font-semibold text-sm">🤖 DeepSeek V3 — чат</legend>
        <input
          type="password"
          placeholder="DEEPSEEK_API_KEY"
          value={deepseekKey}
          onChange={(e) => setDeepseekKeyLocal(e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
        />
        <p className="text-xs text-slate-500">
          Передаётся в заголовке <code className="text-purple-400">X-DeepSeek-Key</code>
        </p>
      </fieldset>

      {/* ProxyAPI */}
      <fieldset className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-3">
        <legend className="text-cyan-400 font-semibold text-sm">
          🖼️ ProxyAPI — распознавание чеков (GPT-4o-mini)
        </legend>
        <input
          type="password"
          placeholder="PROXYAPI_KEY"
          value={proxyapiKey}
          onChange={(e) => setProxyapiKeyLocal(e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
        <p className="text-xs text-slate-500">
          Передаётся в заголовке <code className="text-cyan-400">X-ProxyAPI-Key</code>
        </p>
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
        className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors"
      >
        💾 Сохранить ключи
      </button>
    </div>
  );
}