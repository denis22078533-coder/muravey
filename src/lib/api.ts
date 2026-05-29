const API_BASE = '/api';

export interface ScanResult {
  place?: string;
  date?: string;
  items?: Array<{ name: string; quantity: number; price: number; sum: number; category?: string }>;
  total?: number;
  raw_text?: string;
  error?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Operation {
  id: string;
  date: string;
  place: string;
  total: number;
  type: 'expense' | 'income';
  items: Array<{ name: string; quantity: number; price: number; sum: number; category?: string }>;
  raw_text?: string;
}

export interface AISettings {
  proxyapi_key: string;
  deepseek_key: string;
  s3_endpoint: string;
  s3_access_key: string;
  s3_secret_key: string;
  s3_bucket: string;
  tariff: string;
  sbp_tbank_key: string;
  sbp_merchant_id: string;
}

export interface ReportEntry {
  id: string;
  date: string;
  period: string;
  status: string;
}

// --- localStorage fallback (пока нет БД) ---
const storage = {
  get(k: string): string | null {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  set(k: string, v: string) {
    try { localStorage.setItem(k, v); } catch { /* silent */ }
  },
  getJSON<T>(k: string, fallback: T): T {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  setJSON(k: string, v: unknown) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* silent */ }
  },
};

// --- Operations ---
export async function fetchOperations(): Promise<Operation[]> {
  try {
    const r = await fetch(`${API_BASE}/operations`);
    if (r.ok) return await r.json();
  } catch { /* fallback */ }
  return storage.getJSON<Operation[]>('ops', []);
}

export async function createOperation(op: Omit<Operation, 'id'> & { id?: string }): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE}/operations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(op),
    });
    if (r.ok) return true;
  } catch { /* fallback */ }
  // Локальный fallback
  const ops = storage.getJSON<Operation[]>('ops', []);
  ops.unshift({ ...op, id: op.id || Date.now().toString(36) } as Operation);
  storage.setJSON('ops', ops);
  return true;
}

// --- Settings ---
export async function fetchSettings(): Promise<AISettings> {
  try {
    const r = await fetch(`${API_BASE}/settings`);
    if (r.ok) return await r.json();
  } catch { /* fallback */ }
  return storage.getJSON<AISettings>('ai_cfg', {
    proxyapi_key: '', deepseek_key: '',
    s3_endpoint: '', s3_access_key: '', s3_secret_key: '', s3_bucket: '',
    tariff: 'free', sbp_tbank_key: '', sbp_merchant_id: '',
  });
}

export async function saveSettings(cfg: Partial<AISettings>): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    });
    if (r.ok) return true;
  } catch { /* fallback */ }
  const current = await fetchSettings();
  storage.setJSON('ai_cfg', { ...current, ...cfg });
  return true;
}

// --- Reports ---
export async function fetchReports(): Promise<ReportEntry[]> {
  try {
    const r = await fetch(`${API_BASE}/reports`);
    if (r.ok) return await r.json();
  } catch { /* fallback */ }
  return storage.getJSON<ReportEntry[]>('reports', []);
}

export async function createReport(entry: Omit<ReportEntry, 'id'> & { id?: string }): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (r.ok) return true;
  } catch { /* fallback */ }
  const reports = storage.getJSON<ReportEntry[]>('reports', []);
  reports.unshift({ ...entry, id: entry.id || Date.now().toString(36) } as ReportEntry);
  storage.setJSON('reports', reports);
  return true;
}

// --- Scan ---
function getSelectedModel(): string {
  try { return localStorage.getItem('X-Selected-Model') || 'openai/gpt-4o-mini'; } catch { return 'openai/gpt-4o-mini'; }
}

export async function scanReceiptImage(base64: string): Promise<ScanResult> {
  const settings = await fetchSettings();
  const key = settings.proxyapi_key;
  if (!key) return { error: 'Ключ ProxyAPI не задан. Перейдите в раздел 🧠 Мозг.' };

  const model = getSelectedModel();
  const r = await fetch(`${API_BASE}/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ProxyAPI-Key': key,
      'X-Selected-Model': model,
    },
    body: JSON.stringify({ image: base64 }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
    return { error: err.error || `HTTP ${r.status}` };
  }
  return await r.json();
}

// --- Chat ---
export async function chatWithAI(messages: ChatMessage[]): Promise<string> {
  const settings = await fetchSettings();
  const key = settings.deepseek_key;
  if (!key) throw new Error('Ключ DeepSeek не задан. Зайдите в 🧠 Мозг.');

  const r = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-DeepSeek-Key': key },
    body: JSON.stringify({ messages }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
    throw new Error(err.error || `HTTP ${r.status}`);
  }
  const data = await r.json();
  return data.reply ?? '';
}