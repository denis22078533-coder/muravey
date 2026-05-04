import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/ui/icon";

interface Props {
  status: "idle" | "generating" | "done" | "error";
  previewHtml: string | null;
  liveUrl?: string;
  onApplyToGitHub?: () => Promise<void>;
  onUndo?: () => void;
  canUndo?: boolean;
}

const GRID_SIZE = 32;

export default function LivePreview({ status, previewHtml, liveUrl, onApplyToGitHub, onUndo, canUndo }: Props) {
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleApply = async () => {
    if (!onApplyToGitHub || applying) return;
    setApplying(true);
    setApplyResult(null);
    try {
      await onApplyToGitHub();
      setApplyResult({ ok: true, message: "Ð¡Ð°Ð¹Ñ ÑÑÐ¿ÐµÑÐ½Ð¾ Ð¾Ð±Ð½Ð¾Ð²Ð»ÑÐ½!" });
    } catch (e) {
      setApplyResult({ ok: false, message: e instanceof Error ? e.message : "ÐÑÐ¸Ð±ÐºÐ° ÑÐ¾ÑÑÐ°Ð½ÐµÐ½Ð¸Ñ" });
    } finally {
      setApplying(false);
      setTimeout(() => setApplyResult(null), 5000);
    }
  };

  const hasPreview = !!previewHtml;

  return (
    <div className="relative flex-1 w-full h-full min-w-0 min-h-0 overflow-hidden bg-[#07070c] flex flex-col">

      {/* Action Bar â Ð²ÑÐµÐ³Ð´Ð° Ð²Ð¸Ð´Ð¸Ð¼ÑÐ¹ */}
      <div className="shrink-0 z-10 flex items-center gap-1.5 px-3 py-2 bg-[#0d0d18] border-b border-white/[0.07] flex-wrap">

        {/* ÐÑÐ¼ÐµÐ½Ð¸ÑÑ */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="ÐÐµÑÐ½ÑÑÑÑÑ Ðº Ð¿ÑÐµÐ´ÑÐ´ÑÑÐµÐ¹ Ð²ÐµÑÑÐ¸Ð¸"
          className={`flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-semibold transition-all ${
            canUndo
              ? "bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 hover:border-amber-500/50 text-amber-400 hover:text-amber-300"
              : "bg-white/[0.02] border border-white/[0.04] text-white/15 cursor-not-allowed"
          }`}
        >
          <Icon name="Undo2" size={11} />
          ÐÑÐ¼ÐµÐ½Ð¸ÑÑ
        </button>

        {/* ÐÑÐ¸Ð¼ÐµÐ½Ð¸ÑÑ Ð² GitHub */}
        <button
          onClick={handleApply}
          disabled={applying || !hasPreview || !onApplyToGitHub}
          className={`flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-semibold transition-all ${
            applying
              ? "bg-[#9333ea]/20 border border-[#9333ea]/30 text-purple-400/60 cursor-wait"
              : !hasPreview || !onApplyToGitHub
                ? "bg-white/[0.03] border border-white/[0.06] text-white/20 cursor-not-allowed"
                : "bg-[#9333ea]/20 border border-[#9333ea]/40 hover:bg-[#9333ea]/35 hover:border-[#9333ea]/60 text-purple-300 hover:text-white"
          }`}
        >
          <Icon name={applying ? "Loader" : "Upload"} size={11} className={applying ? "animate-spin" : ""} />
          {applying ? "Ð¡Ð¾ÑÑÐ°Ð½ÑÑ..." : "Ð GitHub"}
        </button>

        {/* ÐÐ¸Ð²Ð°Ñ ÑÑÑÐ»ÐºÐ° */}
        {liveUrl && (
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300 transition-all ml-auto"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ÐÐ¸Ð²Ð¾Ð¹ ÑÐ°Ð¹Ñ
            <Icon name="ExternalLink" size={10} />
          </a>
        )}

        {/* Ð¡ÑÐ°ÑÑÑ ÑÐ²ÐµÐ´Ð¾Ð¼Ð»ÐµÐ½Ð¸Ðµ */}
        <AnimatePresence>
          {applyResult && (
            <motion.span
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className={`text-[11px] font-semibold ${liveUrl ? "" : "ml-auto"} ${applyResult.ok ? "text-emerald-400" : "text-red-400"}`}
            >
              {applyResult.ok ? "â " : "â "}{applyResult.message}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Preview area */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)
            `,
            backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
          }}
        />



        {/* Content */}
        <AnimatePresence mode="wait">
          {/* IDLE */}
          {status === "idle" && !previewHtml && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600/30 to-indigo-700/30 border border-violet-500/20 flex items-center justify-center"
              >
                <Icon name="Sparkles" size={22} className="text-violet-400" />
              </motion.div>
              <div>
                <p className="text-white/80 text-sm font-medium leading-snug max-w-xs">
                  ÐÐ¿Ð¸ÑÐ¸ÑÐµ ÑÐ°Ð¹Ñ Ð² ÑÐ°ÑÐµ Ð¸Ð»Ð¸ Ð·Ð°Ð³ÑÑÐ·Ð¸ÑÐµ Ð¿ÑÐ¾ÐµÐºÑ â<br />
                  <span className="text-violet-400">ÑÐµÐ·ÑÐ»ÑÑÐ°Ñ Ð¿Ð¾ÑÐ²Ð¸ÑÑÑ Ð·Ð´ÐµÑÑ</span>
                </p>
                <div className="mt-3 flex flex-col gap-1.5 text-xs text-white/30 text-left max-w-xs">
                  <span>ð <span className="text-cyan-400/70">HTML</span> â Ð·Ð°Ð³ÑÑÐ·Ð¸ÑÑ Ð³Ð¾ÑÐ¾Ð²ÑÐ¹ index.html</span>
                  <span>ð¦ <span className="text-violet-400/70">ZIP Ð¿ÑÐ¾ÐµÐºÑ</span> â Ð·Ð°Ð³ÑÑÐ·Ð¸ÑÑ React/Vite Ð°ÑÑÐ¸Ð², AI ÐºÐ¾Ð½Ð²ÐµÑÑÐ¸ÑÑÐµÑ</span>
                </div>
              </div>

              <div className="absolute top-4 left-4 w-5 h-5 border-l border-t border-white/10 rounded-tl-sm" />
              <div className="absolute top-4 right-4 w-5 h-5 border-r border-t border-white/10 rounded-tr-sm" />
              <div className="absolute bottom-4 left-4 w-5 h-5 border-l border-b border-white/10 rounded-bl-sm" />
              <div className="absolute bottom-4 right-4 w-5 h-5 border-r border-b border-white/10 rounded-br-sm" />
            </motion.div>
          )}

          {/* GENERATING */}
          {status === "generating" && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4"
            >
              {previewHtml && (
                <iframe
                  srcDoc={previewHtml}
                  className="absolute inset-0 w-full h-full border-0 opacity-30"
                  title="Preview (background)"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
              )}
              <motion.div
                className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent"
                animate={{ top: ["10%", "90%", "10%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              />
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 rounded-full border-2 border-transparent border-t-violet-400 border-r-violet-400/30"
                />
              </div>
              <div className="text-center">
                <p className="text-violet-400 text-sm font-semibold">ÐÐµÐ½ÐµÑÐ¸ÑÑÑ ÑÐ°Ð¹Ñ</p>
                <GeneratingDots />
              </div>
            </motion.div>
          )}

          {/* DONE â iframe */}
          {(status === "done" || (previewHtml && status !== "generating")) && previewHtml && (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full border-0"
                title="Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </motion.div>
          )}

          {/* ERROR */}
          {status === "error" && !previewHtml && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            >
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Icon name="AlertTriangle" size={22} className="text-red-400" />
              </div>
              <p className="text-red-400 text-sm font-medium">ÐÑÐ¸Ð±ÐºÐ° Ð³ÐµÐ½ÐµÑÐ°ÑÐ¸Ð¸</p>
              <p className="text-white/30 text-xs">ÐÑÐ¾Ð²ÐµÑÑÑÐµ API ÐºÐ»ÑÑ Ð² Ð½Ð°ÑÑÑÐ¾Ð¹ÐºÐ°Ñ</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function GeneratingDots() {
  return (
    <div className="flex items-center justify-center gap-1 mt-1">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="w-1 h-1 rounded-full bg-violet-400/60"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}