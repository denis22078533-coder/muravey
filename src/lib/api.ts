const API_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) 
  ? (import.meta as any).env.VITE_API_URL + '/api' 
  : '/api';

// ==================== JWT Token ====================

function getToken(): string {
  try {
    return localStorage.getItem('auth_token') || '';
  } catch {
    return '';
  }
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}

// ==================== Types ====================

export interface User {
  id: string;
  email: string;
  tariff: string;
}

export interface ScanResult {
  place?: string;
  date?: string;
  items?: Array<{ name: string; quantity: number; price: number; sum: number; category?: string }>;
  total?: number;
  raw_text?: string;
  error?: string;
}

export interface Operation {
  id: string;
  date: string;
  place: string;
  total: number;
  type: 'expense' | 'income';
  items: Array<{ name: string; quantity: number; price: number; sum: number; category?: string }>;
  raw_text?: string;
  image_url?: string;
}

export interface AISettings {
    proxyapi_key: string;
    proxyapi_url: string;
    deepseek_key: string;
    selected_model: string;
    s3_endpoint: string;
    s3_access_key: string;
    s3_secret_key: string;
    s3_bucket: string;
    s3_region: string;
    db_url: string;
    sbp_tbank_key: string;
    sbp_merchant_id: string;
}

export interface ReportEntry {
  id: string;
  date: string;
  period: string;
  status: string;
}

// ==================== Operations ====================

export async function fetchOperations(): Promise<Operation[]> {
  try {
    const r = await fetch(`${API_BASE}/operations`, { headers: authHeaders() });
    if (r.ok) return await r.json();
  } catch { /* */ }
  return [];
}

export async function createOperation(op: Omit<Operation, 'id'> & { id?: string }): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE}/operations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(op),
    });
    return r.ok;
  } catch {
    return false;
  }
}

// ==================== Settings ====================

export async function fetchSettings(): Promise<AISettings> {
  try {
    const r = await fetch(`${API_BASE}/settings`, { headers: authHeaders() });
    if (r.ok) return await r.json();
  } catch { /* */ }
  return {
    proxyapi_key: '', proxyapi_url: 'https://api.proxyapi.ru/openai/v1', deepseek_key: '',
    selected_model: 'openai/gpt-4o-mini',
    s3_endpoint: '', s3_access_key: '', s3_secret_key: '', s3_bucket: '',
    s3_region: '', db_url: '',
    sbp_tbank_key: '', sbp_merchant_id: '',
  };
}

export async function saveSettings(cfg: Partial<AISettings>): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(cfg),
    });
    return r.ok;
  } catch {
    return false;
  }
}

// ==================== Reports ====================

export async function fetchReports(): Promise<ReportEntry[]> {
  try {
    const r = await fetch(`${API_BASE}/reports`, { headers: authHeaders() });
    if (r.ok) return await r.json();
  } catch { /* */ }
  return [];
}

export async function createReport(entry: Omit<ReportEntry, 'id'> & { id?: string }): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(entry),
    });
    return r.ok;
  } catch {
    return false;
  }
}

// ==================== Scan ====================

export async function scanReceiptImage(base64: string): Promise<ScanResult> {
  const r = await fetch(`${API_BASE}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ image: base64 }),
  });
  return await r.json();
}

// ==================== Payments ====================

export async function createPayment(tariff: string): Promise<{ payment_id?: string; error?: string }> {
  const r = await fetch(`${API_BASE}/payments/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ tariff }),
  });
  return await r.json();
}

export async function confirmPayment(paymentId: string, tariff: string): Promise<{ status?: string; tariff?: string; error?: string }> {
  const r = await fetch(`${API_BASE}/payments/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ payment_id: paymentId, tariff }),
  });
  return await r.json();
}

// ==================== Health & Checks ====================

export interface HealthStatus {
  db_ok: boolean;
  db_type: string;
  authenticated: boolean;
  tariff: string;
  scans_used: number;
  scans_limit: number;
  has_proxyapi: boolean;
  has_deepseek: boolean;
  has_s3: boolean;
  version: string;
}

export interface CheckResult {
  ok: boolean;
  status?: number;
  message?: string;
  error?: string;
}

export async function fetchHealth(): Promise<HealthStatus | null> {
  try {
    const r = await fetch(`${API_BASE}/health`, { headers: authHeaders() });
    if (r.ok) return await r.json();
  } catch { /* */ }
  return null;
}

export async function checkConnection(service: string, key: string, url?: string): Promise<CheckResult> {
  try {
    const r = await fetch(`${API_BASE}/check-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ service, key, url: url || '' }),
    });
    const data = await r.json();
    return { ok: data.success ?? false, message: data.message, error: data.error };
  } catch {
    return { ok: false, error: 'Сетевая ошибка' };
  }
}

export async function checkS3(): Promise<CheckResult> {
  try {
    const r = await fetch(`${API_BASE}/check/s3`, {
      method: 'POST',
      headers: authHeaders(),
    });
    return await r.json();
  } catch {
    return { ok: false, error: 'Сетевая ошибка' };
  }
}

// ==================== PDF ====================

export async function downloadPDF(): Promise<Blob | null> {
  try {
    const r = await fetch(`${API_BASE}/reports/pdf`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (r.ok) return await r.blob();
  } catch { /* */ }
  return null;
}