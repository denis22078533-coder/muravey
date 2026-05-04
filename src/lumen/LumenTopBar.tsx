import { motion } from "framer-motion";
import Icon from "@/components/ui/icon";

interface Props {
  status: "idle" | "generating" | "done" | "error";
  cycleLabel?: string;
  onNewProject?: () => void;
  onExport?: () => void;
  onExportSource?: () => void;
  exportingSource?: boolean;
  selfEditActive?: boolean;
  isAdmin?: boolean;
  onSettings: () => void;
  onLogout?: () => void;
}

const STATUS_MAP = {
  idle:       { dot: "bg-zinc-500",                  text: "text-zinc-400" },
  generating: { dot: "bg-[#f59e0b] animate-pulse",   text: "text-[#f59e0b]" },
  done:       { dot: "bg-emerald-400",               text: "text-emerald-400" },
  error:      { dot: "bg-red-500",                   text: "text-red-400" },
};

export default function LumenTopBar({ status, cycleLabel, selfEditActive, isAdmin, onSettings, onLogout }: Props) {
  const s = STATUS_MAP[status];

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`h-11 flex items-center justify-between px-3 border-b bg-[#07070c]/90 backdrop-blur-xl z-50 shrink-0 min-w-0 transition-colors ${
        selfEditActive ? "border-amber-500/30" : "border-[#f59e0b]/20"
      }`}
    >
      {/* Left â Logo + status */}
      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#f59e0b] to-[#ef4444] flex items-center justify-center shadow-[0_0_8px_#f59e0b80] text-sm">
            ð
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">LUMIN PRO</span>
          <span className="hidden lg:inline text-white/20 text-[10px] font-medium tracking-wider ml-1">â AI-ÑÐ°Ð·ÑÐ°Ð±Ð¾ÑÑÐ¸Ðº ÑÐ°Ð¹ÑÐ¾Ð²</span>
        </div>

        <div className="hidden sm:block w-px h-4 bg-white/10 shrink-0" />

        {/* Cycle status label */}
        <div className="hidden sm:flex items-center gap-1.5 min-w-0 overflow-hidden">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
          <span className={`text-xs font-medium truncate ${s.text}`}>
            {cycleLabel || (status === "idle" ? "ÐÐ¾ÑÐ¾Ð²" : status === "generating" ? "ÐÐ±ÑÐ°Ð±Ð¾ÑÐºÐ°..." : status === "done" ? "ÐÐ¾ÑÐ¾Ð²Ð¾" : "ÐÑÐ¸Ð±ÐºÐ°")}
          </span>
        </div>
      </div>

      {/* Right â Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {selfEditActive && (
          <div className="hidden sm:flex items-center gap-1.5 h-6 px-2.5 rounded-md bg-amber-500/10 border border-amber-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-400 text-[10px] font-semibold">Self-Edit</span>
          </div>
        )}

        {/* Ð¨ÐµÑÑÐµÑÑÐ½ÐºÐ° â Ð²ÑÐµÐ¼ Ð²Ð¸Ð´Ð½Ð°, Ð½Ð¾ Ð¿ÑÐ¸ ÐºÐ»Ð¸ÐºÐµ Ð·Ð°Ð¿ÑÐ°ÑÐ¸Ð²Ð°ÐµÑ Ð¿Ð°ÑÐ¾Ð»Ñ ÐµÑÐ»Ð¸ Ð½Ðµ admin */}
        <button
          onClick={onSettings}
          title={isAdmin ? "ÐÐ°ÑÑÑÐ¾Ð¹ÐºÐ¸" : "ÐÐ°ÑÑÑÐ¾Ð¹ÐºÐ¸ (ÑÐ¾Ð»ÑÐºÐ¾ Ð´Ð»Ñ Ð°Ð´Ð¼Ð¸Ð½Ð¸ÑÑÑÐ°ÑÐ¾ÑÐ°)"}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
            isAdmin
              ? "text-white/40 hover:text-white/80 hover:bg-white/[0.06]"
              : "text-white/15 hover:text-white/30 hover:bg-white/[0.03]"
          }`}
        >
          <Icon name="Settings" size={14} />
        </button>

        {isAdmin && onLogout && (
          <button
            onClick={onLogout}
            title="ÐÑÐ¹ÑÐ¸ Ð¸Ð· ÑÐµÐ¶Ð¸Ð¼Ð° Ð°Ð´Ð¼Ð¸Ð½Ð¸ÑÑÑÐ°ÑÐ¾ÑÐ°"
            className="w-7 h-7 rounded-md flex items-center justify-center text-white/25 hover:text-red-400 hover:bg-red-500/[0.08] transition-colors"
          >
            <Icon name="LogOut" size={13} />
          </button>
        )}
      </div>
    </motion.header>
  );
}
