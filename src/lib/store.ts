// ---- Глобальное хранилище (localStorage) ----

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  sum: number;
  category?: string;
}

export interface Operation {
  id: string;
  date: string;       // ISO string
  place: string;
  total: number;
  type: 'expense' | 'income';
  items: ReceiptItem[];
  raw_text?: string;
}

export type Tariff = 'free' | 'start' | 'business' | 'pro';

export interface S3Config {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

export interface SBPConfig {
  tbankKey: string;
  merchantId: string;
}

// --- Операции ---
const OPS_KEY = 'babki_operations';

export const loadOperations = (): Operation[] => {
  try {
    return JSON.parse(localStorage.getItem(OPS_KEY) || '[]');
  } catch {
    return [];
  }
};

export const saveOperations = (ops: Operation[]) => {
  try {
    localStorage.setItem(OPS_KEY, JSON.stringify(ops));
  } catch { /* silent */ }
};

export const addOperation = (op: Operation) => {
  const ops = loadOperations();
  ops.unshift(op);
  saveOperations(ops);
};

// --- Тариф ---
const TARIFF_KEY = 'babki_tariff';

export const getTariff = (): Tariff => {
  try {
    return (localStorage.getItem(TARIFF_KEY) as Tariff) || 'free';
  } catch {
    return 'free';
  }
};

export const setTariff = (t: Tariff) => {
  try {
    localStorage.setItem(TARIFF_KEY, t);
  } catch { /* silent */ }
};

// Лимит сканирований для free
export const MAX_FREE_SCANS = 3;
export const getFreeScanCount = (): number => {
  return loadOperations().filter(o => o.type === 'expense').length;
};

// --- S3 ---
const S3_KEY = 'babki_s3';

export const getS3Config = (): S3Config => {
  try {
    return JSON.parse(localStorage.getItem(S3_KEY) || '{"endpoint":"","accessKey":"","secretKey":"","bucket":""}');
  } catch {
    return { endpoint: '', accessKey: '', secretKey: '', bucket: '' };
  }
};

export const setS3Config = (cfg: S3Config) => {
  try {
    localStorage.setItem(S3_KEY, JSON.stringify(cfg));
  } catch { /* silent */ }
};

// --- СБП ---
const SBP_KEY = 'babki_sbp';

export const getSBPConfig = (): SBPConfig => {
  try {
    return JSON.parse(localStorage.getItem(SBP_KEY) || '{"tbankKey":"","merchantId":""}');
  } catch {
    return { tbankKey: '', merchantId: '' };
  }
};

export const setSBPConfig = (cfg: SBPConfig) => {
  try {
    localStorage.setItem(SBP_KEY, JSON.stringify(cfg));
  } catch { /* silent */ }
};

// --- Отчёты (архив) ---
export interface ReportEntry {
  id: string;
  date: string;
  period: string;
  status: string;
}

const REPORTS_KEY = 'babki_reports';

export const loadReports = (): ReportEntry[] => {
  try {
    return JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]');
  } catch {
    return [];
  }
};

export const addReport = (entry: ReportEntry) => {
  const reports = loadReports();
  reports.unshift(entry);
  try {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
  } catch { /* silent */ }
};