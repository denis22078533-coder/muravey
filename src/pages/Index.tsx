import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import {
  useSettings, getSettings, type AiProvider, getActiveProviderConfig,
  MODELS_BY_PROVIDER, PROVIDER_DEFAULTS,
  IMAGE_ENGINE_DEFAULTS, MEDIA_ENGINE_DEFAULTS,
  DESIGNER_PROMPT, ENGINEER_PROMPT, type PromptPreset,
} from "@/lib/store";
import { chat, callLlmOnce, extractHtml, type ChatMessage } from "@/lib/ai";
import {
  importZip, exportZip, findIndexHtml, loadFiles, saveFiles, filesContextForAi,
  loadMeta, saveMeta, clearProject, buildVirtualPreview, parsePackageDeps,
  type ProjectFiles, type ProjectMeta,
} from "@/lib/files";
import { commitToGitHub, pingGitHub } from "@/lib/github";
import { toast } from "sonner";
import { AntTyping } from "@/components/AntTyping";
import { BackgroundAnt } from "@/components/BackgroundAnt";
import { detectIntent, generateImage, generateVideo, generateAudio, fileToBase64 } from "@/lib/media";
import { pingSupabase, applySql } from "@/lib/supabase";
import { AuthGate } from "@/components/AuthGate";
import { SupportWidget } from "@/components/SupportWidget";
import {
  useAuth, signOut, addModerator, removeModerator, transferOwnership,
  setTokensFor, banUser, deleteUser, checkContent, logAudit, clearAudit, consumeToken, syncTopBalance,
} from "@/lib/auth";
import { useSupport, addMessage, resolveThread, markReadForAdmin } from "@/lib/support";
import {
  useIntegrations, addIntegration, updateIntegration, removeIntegration,
  pingIntegration, buildLeadInjector, getIntegrationsSnapshot, KIND_LABEL, KIND_HINT, type IntegrationKind,
} from "@/lib/integrations";

type Tab = "chat" | "core" | "projects";
type CoreTab = "ai" | "github" | "payments" | "system" | "logs" | "users" | "dialogs" | "integrations";
type Device = "desktop" | "mobile";
type Msg = {
  role: "user" | "ai";
  text: string;
  image?: string;
  video?: string;
  audio?: string;
  status?: "loading";
  actions?: string[];
  progress?: number;
  sql?: string;
};

function stripToolCmds(text: string): string {
  let t = text;
  // WRITE/EDIT блоки с кодом — целиком
  t = t.replace(/(?:^|\n)\s*(?:💉\s*)?\[?(?:WRITE|EDIT)\]?:\s*[^\n`]+\s*\n+```(?:[a-zA-Z]+)?\n[\s\S]*?\n```/g, "\n");
  // SEARCH-команды
  t = t.replace(/(?:^|\n)\s*(?:🔎\s*)?\[?SEARCH\]?:\s*.+?(?:\n|$)/gi, "\n");
  // READ-команды
  t = t.replace(/(?:^|\n)\s*(?:📖\s*)?\[?READ\]?:\s*.+?(?:\n|$)/gi, "\n");
  return t.trim();
}

function extractActions(text: string): { actions: string[]; rest: string } {
  const firstLine = text.split("\n").find((l) => l.trim().length > 0) || "";
  if (firstLine.includes("·") && firstLine.length < 240) {
    const actions = firstLine.split("·").map((s) => s.trim()).filter(Boolean);
    if (actions.length >= 2 && actions.length <= 8) {
      return { actions, rest: text.replace(firstLine, "").trim() };
    }
  }
  return { actions: [], rest: text };
}

function injectSupabase(html: string, url: string, anonKey: string): string {
  if (!html.toLowerCase().includes("supabase")) return html;
  const inject = `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>window.__SUPABASE_URL__=${JSON.stringify(url)};window.__SUPABASE_ANON_KEY__=${JSON.stringify(anonKey)};window.supabaseClient=window.supabase&&window.supabase.createClient(window.__SUPABASE_URL__,window.__SUPABASE_ANON_KEY__);</script>`;
  if (html.includes("</head>")) return html.replace("</head>", `${inject}\n</head>`);
  return inject + html;
}

const TEMPLATES = [
  { id: 1, title: "Магазин продуктов", desc: "Онлайн-магазин с корзиной", emoji: "🛒", tag: "Электронная коммерция", color: "purple", prompt: "Сделай красивый магазин продуктов с карточками товаров, корзиной и итоговой суммой." },
  { id: 2, title: "Портфолио", desc: "Минималистичное портфолио", emoji: "🎨", tag: "Личное", color: "orange", prompt: "Создай минималистичное портфолио дизайнера с шапкой, проектами в сетке и контактами." },
  { id: 3, title: "SaaS Лендинг", desc: "Посадочная страница для стартапа", emoji: "🚀", tag: "Маркетинг", color: "purple", prompt: "Создай SaaS-лендинг с hero, фичами в 3 колонки, тарифами и формой подписки." },
  { id: 4, title: "Блог-журнал", desc: "Редакторский блог со статьями", emoji: "📰", tag: "Контент", color: "orange", prompt: "Сделай блог-журнал с крупным заголовком, обложкой статьи и сеткой превью записей." },
  { id: 5, title: "Запись на услуги", desc: "Бронирование и календарь", emoji: "📅", tag: "Сервис", color: "purple", prompt: "Создай страницу записи на услуги с выбором даты, времени и формой контактов." },
  { id: 6, title: "Ресторан", desc: "Сайт ресторана с меню", emoji: "🍝", tag: "Еда и напитки", color: "orange", prompt: "Создай сайт ресторана: hero с фото, фичами в 3 колонки, тарифами и формой подписки." },
];

export default function Index() {
  return (
    <AuthGate>
      <IndexInner />
    </AuthGate>
  );
}

function IndexInner() {
  const [tab, setTab] = useState<Tab>("chat");
  const [presetPrompt, setPresetPrompt] = useState("");
  const { isModerator } = useAuth();

  useEffect(() => { syncTopBalance(); }, []);

  // Если не модератор/админ — насильно прячем «Мозг»
  useEffect(() => {
    if (tab === "core" && !isModerator) setTab("chat");
  }, [isModerator, tab]);

  return (
    <div className="min-h-screen bg-background text-foreground grid-bg relative">
      <BackgroundAnt />
      <div className="relative z-10">
        <TopBar />
        <main className="pb-24">
          {tab === "chat" && <ChatTab presetPrompt={presetPrompt} clearPreset={() => setPresetPrompt("")} />}
          {tab === "core" && isModerator && <CoreTab />}
          {tab === "projects" && (
            <ProjectsTab onUse={(p) => { setPresetPrompt(p); setTab("chat"); }} />
          )}
        </main>
        <BottomNav tab={tab} setTab={setTab} />
        <SupportWidget />
      </div>
    </div>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────
function TopBar() {
  const [s] = useSettings();
  const { session } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = session?.email ? session.email.slice(0, 2).toUpperCase() : "??";
  const roleColor = session?.role === "superadmin" ? "text-orange-400" : session?.role === "moderator" ? "text-purple-400" : "text-muted-foreground";
  const roleLabel = session?.role === "superadmin" ? "OWNER" : session?.role === "moderator" ? "MOD" : "USER";
  const activeCfg = getActiveProviderConfig(s);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center font-heading font-bold text-sm text-black">
            М
          </div>
          <div className="leading-tight">
            <div className="font-heading text-base tracking-wider uppercase">Муравей Тест</div>
            <div className="text-[10px] text-muted-foreground font-mono -mt-0.5">v2.0 · БЕТА</div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border">
            <span className={`w-1.5 h-1.5 rounded-full ${activeCfg.apiKey ? "bg-green-500" : "bg-muted-foreground"} animate-pulse-dot`} />
            <span className="font-mono text-muted-foreground">{activeCfg.provider} · {activeCfg.model}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border">
            <Icon name="Coins" size={12} className="text-orange-500" />
            <span className="font-mono font-medium">{(session?.tokens ?? s.tokens).toLocaleString("ru-RU")}</span>
            <span className="text-muted-foreground">токенов</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border">
            <div className={`w-6 h-6 rounded-full bg-gradient-to-br from-purple-500/30 to-orange-500/30 flex items-center justify-center text-[10px] font-bold ${roleColor}`}>
              {initials}
            </div>
            <span className={`font-mono text-[10px] ${roleColor}`}>{roleLabel}</span>
          </div>
        </div>

        <div className="md:hidden flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary border border-border text-xs">
            <Icon name="Coins" size={10} className="text-orange-500" />
            <span className="font-mono font-medium">{(session?.tokens ?? s.tokens).toLocaleString("ru-RU")}</span>
          </div>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-bold hover:bg-accent transition-colors"
          >
            <Icon name="Menu" size={14} />
          </button>
          {menuOpen && (
            <div className="absolute top-14 right-4 w-56 bg-popover border border-border rounded-xl shadow-2xl p-2 z-50">
              <div className="px-3 py-2 text-xs font-mono text-muted-foreground border-b border-border mb-1">
                {session?.email ?? "unknown"}
              </div>
              <button
                onClick={() => { signOut(); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg hover:bg-accent transition-colors text-red-400"
              >
                <Icon name="LogOut" size={12} />
                Выйти
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}