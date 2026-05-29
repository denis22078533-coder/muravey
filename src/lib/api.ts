const API_BASE = '/api';

export interface AISettings {
  deepseek_api_key: string;
  proxyapi_key: string;
  s3_endpoint: string;
  s3_access_key: string;
  s3_secret_key: string;
  s3_bucket: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ScanResult {
  items?: Array<{ name: string; quantity: number; price: number; sum: number }>;
  total?: number;
  place?: string;
  date?: string;
  raw_text?: string;
  error?: string;
}

export async function fetchAISettings(): Promise<AISettings | null> {
  try {
    const r = await fetch(`${API_BASE}/settings`);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export async function saveAISettings(settings: Partial<AISettings>): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export async function scanReceiptImage(base64: string, proxyapiKey: string): Promise<ScanResult> {
  const r = await fetch(`${API_BASE}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64, proxyapi_key: proxyapiKey }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: 'Scan failed' }));
    return { error: err.error || `HTTP ${r.status}` };
  }
  return await r.json();
}

export async function chatWithAI(
  messages: ChatMessage[],
  deepseekKey: string,
): Promise<string> {
  const r = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, deepseek_api_key: deepseekKey }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: 'Chat failed' }));
    throw new Error(err.error || `HTTP ${r.status}`);
  }
  const data = await r.json();
  return data.reply ?? '';
}