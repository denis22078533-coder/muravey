import { useState } from 'react';
import ReceiptUploader from '../components/ReceiptUploader';
import { scanReceiptImage, chatWithAI, fetchAISettings, ScanResult, ChatMessage } from '../lib/api';

export default function Home() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const handleImageReady = async (base64: string, _previewUrl: string) => {
    setScanning(true);
    setScanError(null);
    setScanResult(null);

    try {
      const settings = await fetchAISettings();
      const proxyapiKey = settings?.proxyapi_key || '';
      if (!proxyapiKey) {
        setScanError('Ключ ProxyAPI не задан. Перейдите в раздел 🧠 Мозг.');
        setScanning(false);
        return;
      }
      const result = await scanReceiptImage(base64, proxyapiKey);
      if (result.error) {
        setScanError(result.error);
      } else {
        setScanResult(result);
      }
    } catch (e: any) {
      setScanError(e.message || 'Ошибка сканирования');
    }
    setScanning(false);
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
    const updated = [...chatMessages, userMsg];
    setChatMessages(updated);
    setChatInput('');
    setChatLoading(true);

    try {
      const settings = await fetchAISettings();
      const deepseekKey = settings?.deepseek_api_key || '';
      if (!deepseekKey) {
        setChatMessages([...updated, { role: 'assistant', content: 'Ключ DeepSeek не задан. Зайдите в 🧠 Мозг.' }]);
        setChatLoading(false);
        return;
      }
      const reply = await chatWithAI(updated, deepseekKey);
      setChatMessages([...updated, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      setChatMessages([...updated, { role: 'assistant', content: `Ошибка: ${e.message}` }]);
    }
    setChatLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <section>
        <h2 className="text-xl font-semibold mb-3 text-cyan-400">📸 Загрузка чека</h2>
        <ReceiptUploader onImageReady={handleImageReady} />
        {scanning && (
          <div className="mt-3 text-center text-cyan-400 animate-pulse">
            🔍 Распознаю чек через ProxyAPI (GPT-4o-mini)...
          </div>
        )}
      </section>

      {scanError && (
        <div className="bg-red-900/40 border border-red-600 rounded-lg p-3 text-red-300 text-sm">
          ❌ {scanError}
        </div>
      )}

      {scanResult && !scanError && (
        <section className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h3 className="text-lg font-semibold text-green-400 mb-2">📋 Результат распознавания</h3>
          {scanResult.place && <p className="text-slate-300">🏪 {scanResult.place}</p>}
          {scanResult.date && <p className="text-slate-400 text-sm">📅 {scanResult.date}</p>}
          {scanResult.total !== undefined && (
            <p className="text-cyan-300 font-bold mt-1">💰 Итого: {scanResult.total.toFixed(2)} ₽</p>
          )}
          {scanResult.items && scanResult.items.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm text-slate-300">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left py-1">Товар</th>
                    <th className="text-center">Кол-во</th>
                    <th className="text-right">Цена</th>
                    <th className="text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {scanResult.items.map((item, i) => (
                    <tr key={i} className="border-b border-slate-700/50">
                      <td className="py-1">{item.name}</td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-right">{item.price.toFixed(2)}</td>
                      <td className="text-right">{item.sum.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {scanResult.raw_text && (
            <details className="mt-3">
              <summary className="text-xs text-slate-500 cursor-pointer">Сырой текст</summary>
              <pre className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">{scanResult.raw_text}</pre>
            </details>
          )}
        </section>
      )}

      {/* ЧАТ с DeepSeek */}
      <section className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h3 className="text-lg font-semibold text-purple-400 mb-2">💬 Чат с DeepSeek V3</h3>

        {chatMessages.length > 0 && (
          <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
            {chatMessages.map((m, i) => (
              <div
                key={i}
                className={`p-2 rounded-lg text-sm ${
                  m.role === 'user'
                    ? 'bg-slate-700 text-white ml-6'
                    : 'bg-purple-900/30 text-purple-200 mr-6'
                }`}
              >
                {m.content}
              </div>
            ))}
            {chatLoading && (
              <div className="text-purple-400 text-sm animate-pulse p-2">DeepSeek думает...</div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleChat()}
            placeholder="Задай вопрос про финансы, чеки..."
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={handleChat}
            disabled={chatLoading || !chatInput.trim()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            ➤
          </button>
        </div>
      </section>
    </div>
  );
}