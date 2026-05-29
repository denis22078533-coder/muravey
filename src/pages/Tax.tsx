import { useState, useMemo, useEffect } from 'react';
import {
  fetchOperations, createReport, fetchReports, fetchSettings,
  Operation, ReportEntry,
} from '../lib/api';

type Period = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Y';
const PERIOD_LABELS: Record<Period, string> = { Q1: 'I квартал', Q2: 'II квартал', Q3: 'III квартал', Q4: 'IV квартал', Y: 'Год' };

export default function Tax() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [period, setPeriod] = useState<Period>('Y');
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [tariff, setTariff] = useState('free');

  useEffect(() => {
    fetchOperations().then(setOperations);
    fetchReports().then(setReports);
    fetchSettings().then(s => setTariff(s.tariff || 'free'));
  }, []);

  const canExport = tariff === 'business' || tariff === 'pro';

  const filtered = useMemo(() => {
    const y = new Date().getFullYear();
    return operations.filter(op => {
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

  const incomeTotal = filtered.filter(o => o.type === 'income').reduce((s, o) => s + o.total, 0);
  const expenseTotal = filtered.filter(o => o.type === 'expense').reduce((s, o) => s + o.total, 0);
  const taxBase = incomeTotal - expenseTotal;

  const downloadCSV = () => {
    const h = 'Дата,Тип,Место,Сумма,Категория\n';
    const rows = filtered.map(o =>
      `${new Date(o.date).toLocaleDateString('ru')},${o.type === 'income' ? 'Доход' : 'Расход'},"${o.place}",${o.total.toFixed(2)},${o.items?.[0]?.category || '—'}`
    ).join('\n');
    const blob = new Blob([h + rows], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `otchet_${period}_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  const downloadPDF = () => {
    setLoading(true);
    const text = [
      `НАЛОГОВЫЙ ОТЧЁТ — Бабки Скан`, `Период: ${PERIOD_LABELS[period]}`,
      `Доходы: ${incomeTotal.toFixed(2)} ₽`, `Расходы: ${expenseTotal.toFixed(2)} ₽`,
      `Налог. база: ${taxBase.toFixed(2)} ₽`, ``,
      ...filtered.map(o => `${new Date(o.date).toLocaleDateString('ru')} | ${o.type === 'income' ? '+' : '-'}${o.total} ₽ | ${o.place}`),
    ].join('\n');
    setTimeout(() => {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `nalog_${period}_${new Date().toISOString().slice(0, 10)}.txt`; a.click();
      setLoading(false);
    }, 2000);
  };

  const handleAddReport = async () => {
    await createReport({
      date: new Date().toLocaleDateString('ru'),
      period: PERIOD_LABELS[period],
    });
    fetchReports().then(setReports);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-amber-400">📑 Налоговая отчётность</h2>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <label className="text-xs text-zinc-500 block mb-2">Период:</label>
        <div className="flex gap-2">
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-sm rounded-lg border transition ${period === p ? 'border-amber-500 bg-amber-500/20 text-amber-300' : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'}`}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { title: 'Доходы', value: incomeTotal, color: 'text-green-400' },
          { title: 'Расходы', value: expenseTotal, color: 'text-red-400' },
          { title: 'Налог. база', value: taxBase, color: 'text-amber-400' },
        ].map((c, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500">{c.title}</p>
            <p className={`text-xl font-bold ${c.color}`}>{c.value.toFixed(0)} ₽</p>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Операции</h3>
        {filtered.length === 0 ? <p className="text-xs text-zinc-600 italic py-4">Нет операций.</p> : (
          <table className="w-full text-sm text-zinc-400">
            <thead><tr className="border-b border-zinc-800 text-zinc-500">
              <th className="text-left py-1">Дата</th><th className="text-left">Тип</th><th className="text-left">Место</th><th className="text-right">Сумма</th>
            </tr></thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} className="border-b border-zinc-800/50">
                  <td className="py-1">{new Date(o.date).toLocaleDateString('ru')}</td>
                  <td className={o.type === 'income' ? 'text-green-400' : 'text-red-400'}>{o.type === 'income' ? 'Доход' : 'Расход'}</td>
                  <td>{o.place}</td><td className="text-right">{o.total.toFixed(2)} ₽</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-300">📥 Экспорт</h3>
        {!canExport && <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-500">🔒 Экспорт доступен на тарифах Бизнес и Профи.</div>}
        <div className="flex gap-3 flex-wrap">
          <button onClick={downloadCSV} disabled={!canExport || filtered.length === 0} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-black font-bold text-sm rounded-lg">📊 CSV</button>
          <button onClick={downloadPDF} disabled={!canExport || filtered.length === 0} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-white font-bold text-sm rounded-lg">{loading ? '⏳ PDF...' : '📄 PDF'}</button>
          <button onClick={handleAddReport} disabled={filtered.length === 0} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 text-white text-sm rounded-lg">🗂️ Сохранить</button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">🗄️ Архив</h3>
        {reports.length === 0 ? <p className="text-xs text-zinc-600 italic py-2">Пусто.</p> : (
          <table className="w-full text-sm text-zinc-400">
            <thead><tr className="border-b border-zinc-800 text-zinc-500"><th className="text-left py-1">Дата</th><th>Период</th><th>Статус</th></tr></thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id} className="border-b border-zinc-800/50"><td className="py-1">{r.date}</td><td>{r.period}</td><td className="text-green-400">{r.status}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}