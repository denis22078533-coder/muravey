const API_BASE = '/api';

export interface ScanResult {
  place?: string;
  date?: string;
  items?: Array<{ name: string; quantity: number; price: number; sum: number }>;
  total?: number;
  raw_text?: string;
  error?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Ключи хранятся в localStorage (с безопасной обёрткой)
export const getProxyApiKey = (): string => {
  try {
    return localStorage.getItem('proxyapi_key') || '';
  } catch {
    return '';
  }
};

export const setProxyApiKey = (key: string) => {
  try {
    localStorage.setItem('proxyapi_key', key);
  } catch {
    // silent fail
  }
};

export const getDeepSeekKey = (): string => {
  try {
    return localStorage.getItem('deepseek_api_key') || '';
  } catch {
    return '';
  }
};

export const setDeepSeekKey = (key: string) => {
  try {
    localStorage.setItem('deepseek_api_key', key);
  } catch {
    // silent fail
  }
};

export async function scanReceiptImage(base64: string): Promise<ScanResult> {
  const key = getProxyApiKey();
  if (!key) return { error: 'Ключ ProxyAPI не задан. Перейдите в раздел 🧠 Мозг.' };

  const r = await fetch(`${API_BASE}/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ProxyAPI-Key': key,
    },
    body: JSON.stringify({ image: base64 }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
    return { error: err.error || `HTTP ${r.status}` };
  }
  return await r.json();
}

export async function chatWithAI(messages: ChatMessage[]): Promise<string> {
  const key = getDeepSeekKey();
  if (!key) throw new Error('Ключ DeepSeek не задан. Зайдите в 🧠 Мозг.');

  const r = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-DeepSeek-Key': key,
    },
    body: JSON.stringify({ messages }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
    throw new Error(err.error || `HTTP ${r.status}`);
  }
  const data = await r.json();
  return data.reply ?? '';
}