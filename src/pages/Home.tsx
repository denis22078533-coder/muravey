import { useState, useMemo } from 'react';
import ReceiptUploader from '../components/ReceiptUploader';
import { scanReceiptImage, ScanResult } from '../lib/api';
import { loadOperations, addOperation, Operation, getTariff, getFreeScanCount, MAX_FREE_SCANS } from '../lib/store';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const CATEGORY_COLORS: Record<string, string> = {
  'Продукты': '#f59e0b',
  'Рестораны': '#ef4444',
  'Авто': '#3b82f6',
  'ЖКХ': '#10b981',
  'Услуги': '#8b5cf6',
  'Прочее': '#6b7280',
};

const CHART_PLACEHOLDER = [
  { month: 'Янв', доход: 0, расход: 0 },
  { month: 'Фев', доход: 0, расход: 0 },
  { month: 'Мар', доход: 0, расход: 0 },
  { month: 'Апр', доход: 0, расход: 0 },
  { month: 'Май', доход: 0, расход: 0 },
  { month: 'Июн', доход: 0, расход: 0 },
];

export default function Home() {
  const [operations, setOperations] = useState<Operation[]>(loadOperations);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const tariff = getTariff();
  const freeScans = getFreeScanCount();
  const limitReached = tariff === 'free' && freeScans >= MAX_FREE_SCANS;

  const refreshOps = () => setOperations(loadOperations());

  const handleImageReady = async (base64: string) => {
    if (limitReached) {
      setScanError('Лимит исчерпан. Перейдите в раздел 🧠 Мозг → Тарифы для активации пакета.');
      return;
    }

    setScanning(true);
    setScanError(null);
    setScanResult(null);

    const result = await scanReceiptImage(base64);
    if (result.error) {
      setScanError(result.error);
    } else {
      setScanResult(result);
      // Сохраняем операцию
      addOperation({
        id: Date.now().toString(36),
        date: result.date ? parseDate(result.date) : new Date().toISOString(),
        place: result.place || 'Неизвестно',
        total: result.total || 0,
        type: 'expense',
        items: (result.items || []).map((it) => ({ ...it, category: it.category || 'Прочее' })),
        raw_text: result.raw_text,
      });
      refreshOps();
    }
    setScanning(false);
  };

  // Данные для графиков
  const chartData = useMemo(() => {
    if (operations.length === 0) return CHART_PLACEHOLDER;
    const byMonth: Record<string, { доход: number; расход: number }> = {};
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    months.forEach((m) => (byMonth[m] = { доход: 0, расход: 0 }));

    operations.forEach((op) => {
      const d = new Date(op.date);
      const m = months[d.getMonth()];
      if (op.type === 'income') byMonth[m].доход += op.total;
      else byMonth[m].расход += op.total;
    });

    return months.map((m) => ({ month: m, ...byMonth[m] }));
  }, [operations]);

  const pieData = useMemo(() => {
    const cats: Record<string, number> = {};
    operations
      .filter((o) => o.type === 'expense')
      .forEach((o) => {
        o.items.forEach((item) => {
          const cat = item.category || 'Прочее';
          cats[cat] = (cats[cat] || 0) + (item.sum || 0);
        });
      });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [operations]);

  const totalIncome = useMemo(
    () => operations.filter((o) => o.type === 'income').reduce((s, o) => s + o.total, 0),
    [operations],
  );
  const totalExpense = useMemo(
    () => operations.filter((o) => o.type === 'expense').reduce((s, o) => s + o.total, 0),
    [operations],
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Карточки */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { title: 'Доходы', value: totalIncome, color: 'text-green-400' },
          { title: 'Расходы', value: totalExpense, color: 'text-red-400' },
          { title: 'Баланс', value: totalIncome - totalExpense, color: 'text-amber-400' },
          { title: 'Чеков', value: operations.filter((o) => o.type === 'expense').length, color: 'text-zinc-300' },
        ].map((card, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500">{card.title}</p>
            <p className={`text-xl font-bold ${card.color}`}>
              {typeof card.value === 'number' ? `${card.value.toFixed(0)} ₽` : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Графики */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Линейный график */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">📈 Динамика доходов и расходов</h3>
          {operations.length === 0 && (
            <p className="text-xs text-zinc-600 text-center py-6 italic">
              Здесь будет аналитика. Отсканируйте первый чек, чтобы начать трекинг.
            </p>
          )}
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, color: '#e4e4e7' }}
              />
              <Line type="monotone" dataKey="доход" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="расход" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Круговая диаграмма */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">🍩 Структура затрат</h3>
          {pieData.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center py-6 italic">Нет данных для отображения.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[entry.name] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, color: '#e4e4e7' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Загрузка чека */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">📸 Сканировать чек</h3>

        {tariff === 'free' && (
          <div className="mb-3 text-xs text-zinc-500">
            Тариф FREE: {freeScans}/{MAX_FREE_SCANS} чеков
          </div>
        )}

        {limitReached && (
          <div className="mb-3 bg-red-900/30 border border-red-800 rounded-lg p-3 text-sm text-red-300">
            🚫 Лимит исчерпан. Перейдите в раздел 🧠 Мозг → Тарифы для активации пакета.
          </div>
        )}

        <ReceiptUploader onImageReady={handleImageReady} />

        {scanning && (
          <div className="mt-3 text-center text-amber-400 animate-pulse text-sm">
            🔍 Распознаю чек через ProxyAPI...
          </div>
        )}
      </section>

      {scanError && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-red-300 text-sm">
          ❌ {scanError}
        </div>
      )}

      {scanResult && !scanError && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-green-400 mb-2">📋 Чек распознан</h3>
          <div className="flex gap-4 text-sm text-zinc-400 mb-2">
            {scanResult.place && <span>🏪 {scanResult.place}</span>}
            {scanResult.date && <span>📅 {scanResult.date}</span>}
          </div>
          {scanResult.total !== undefined && (
            <p className="text-amber-400 font-bold">💰 {scanResult.total.toFixed(2)} ₽</p>
          )}
        </section>
      )}
    </div>
  );
}

function parseDate(s: string): string {
  // Пытаемся парсить ДД.ММ.ГГГГ
  const parts = s.split('.');
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts.map(Number);
    if (dd && mm && yyyy) return new Date(yyyy, mm - 1, dd).toISOString();
  }
  // fallback
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}