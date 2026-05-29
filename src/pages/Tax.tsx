import { useState, useMemo } from 'react';
import {
  loadOperations, Operation, getTariff,
  loadReports, addReport, ReportEntry,
} from '../lib/store';

type Period = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Y';

const PERIOD_LABELS: Record<Period, string> = {
  Q1: 'I квартал',
  Q2: 'II квартал',
  Q3: 'III квартал',
  Q4: 'IV квартал',
  Y: 'Год',
};

export default function Tax() {
  const [operations] = useState<Operation[]>(() => loadOperations());
  const [period, setPeriod] = useState<Period>('Y');
  const [reports, setReports] = useState<ReportEntry[]>(() => loadReports());
  const [loading, setLoading] = useState(false);
  const tariff = getTariff();
  const canExport = tariff === 'business' || tariff === 'pro';

  const filtered = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    return operations.filter((op) => {
      const d = new Date(op.date);
      if (d.getFullYear() !== y) return false;
      const m = d.getMonth();
      switch (period) {
        case 'Q1': return m < 3;
        case 'Q2': return m >= 3 && m < 6;
        case 'Q3': return m >= 6 && m < 9;
        case 'Q4': return m >= 9;
        default: return true;
      }
    });
  }, [operations, period]);

  const incomeTotal = useMemo(
    () => filtered.filter((o) => o.type === 'income').reduce((s, o) => s + o.total, 0),
    [filtered],
  );
  const expenseTotal = useMemo(
    () => filtered.filter((o) => o.type === 'expense').reduce((s, o) => s + o.total, 0),
    [filtered],
  );
  const taxBase = incomeTotal - expenseTotal;

  // CSV export
  const downloadCSV = () => {
    const header = 'Дата,Тип,Место,Сумма,Категория\n';
    const rows = filtered
      .map((o) => {
        const cat = o.items[0]?.category || '—';
        const d = new Date(o.date).toLocaleDateString('ru');
        return `${d},${o.type === 'income' ? 'Доход' : 'Расход'},"${o.place}",${o.total.toFixed(2)},${cat}`;
      })
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `otchet_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // PDF-имитация
  const downloadPDF = () => {
    setLoading(true);
    const text = [
      `НАЛОГОВЫЙ ОТЧЁТ — Бабки Скан`,
      `Период: ${PERIOD_LABELS[period]}`,
      `Дата формирования: ${new Date().toLocaleDateString('ru')}`,
      ``,
      `Доходы за период: ${incomeTotal.toFixed(2)} ₽`,
      `Расходы за период: ${expenseTotal.toFixed(2)} ₽`,
      `Налогооблагаемая база: ${taxBase.toFixed(2)} ₽`,
      ``,
      `Детализация:`,
      ...filtered.map(
        (o) =>
          `${new Date(o.date).toLocaleDateString('ru')} | ${o.type === 'income' ? '+' : '-'}${o.total.toFixed(2)} ₽ | ${o.place}`,
      ),
    ].join('\n');

    setTimeout(() => {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nalogovyi_otchet_${period}_${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      setLoading(false);
    }, 2000);
  };

  const handleAddReport = () => {
    const entry: ReportEntry = {
      id: Date.now().toString(36),
      date: new Date().toLocaleDateString('ru'),
      period: PERIOD_LABELS[period],
      status: 'Готов',
    };
    addReport(entry);
    setReports((prev) => [entry, ...prev]);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-amber-400">📑 Налоговая отчётность</h2>

      {/* Период */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <label className="text-xs text-zinc-500 block mb-2">Фильтр периода:</label>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-sm rounded-lg border transition ${
                period === p
                  ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Карточки */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Доходы за период</p>
          <p className="text-xl font-bold text-green-400">{incomeTotal.toFixed(0)} ₽</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Расходы за период</p>
          <p className="text-xl font-bold text-red-400">{expenseTotal.toFixed(0)} ₽</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Налог. база</p>
          <p className="text-xl font-bold text-amber-400">{taxBase.toFixed(0)} ₽</p>
        </div>
      </div>

      {/* Таблица операций */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Операции за период</h3>
        {filtered.length === 0 ? (
          <p className="text-xs text-zinc-600 italic py-4">Нет операций за выбранный период.</p>
        ) : (
          <table className="w-full text-sm text-zinc-400">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="text-left py-1">Дата</th>
                <th className="text-left">Тип</th>
                <th className="text-left">Место</th>
                <th className="text-right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-zinc-800/50">
                  <td className="py-1">{new Date(o.date).toLocaleDateString('ru')}</td>
                  <td className={o.type === 'income' ? 'text-green-400' : 'text-red-400'}>
                    {o.type === 'income' ? 'Доход' : 'Расход'}
                  </td>
                  <td>{o.place}</td>
                  <td className="text-right">{o.total.toFixed(2)} ₽</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Экспорт */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-300">📥 Экспорт и отчётность</h3>

        {!canExport && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-500">
            🔒 Функции экспорта доступны на тарифах «Бизнес» и «Профи». Перейдите в 🧠 Мозг → Тарифы.
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={downloadCSV}
            disabled={!canExport || filtered.length === 0}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-black font-bold text-sm rounded-lg transition-colors"
          >
            📊 Скачать сводный отчёт CSV
          </button>
          <button
            onClick={downloadPDF}
            disabled={!canExport || filtered.length === 0}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-white font-bold text-sm rounded-lg transition-colors"
          >
            {loading ? '⏳ Формирование PDF...' : '📄 Скачать PDF для налоговой'}
          </button>
          <button
            onClick={handleAddReport}
            disabled={filtered.length === 0}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 text-white text-sm rounded-lg transition-colors"
          >
            🗂️ Сформировать и сохранить
          </button>
        </div>
      </div>

      {/* Архив отчётов */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">🗄️ Архив отчётов</h3>
        {reports.length === 0 ? (
          <p className="text-xs text-zinc-600 italic py-2">Архив пуст.</p>
        ) : (
          <table className="w-full text-sm text-zinc-400">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="text-left py-1">Дата</th>
                <th className="text-left">Период</th>
                <th className="text-left">Статус</th>
                <th className="text-right">Действие</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b border-zinc-800/50">
                  <td className="py-1">{r.date}</td>
                  <td>{r.period}</td>
                  <td className="text-green-400">{r.status}</td>
                  <td className="text-right">
                    <button
                      onClick={downloadCSV}
                      disabled={!canExport}
                      className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-30"
                    >
                      ⬇️ Скачать
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}