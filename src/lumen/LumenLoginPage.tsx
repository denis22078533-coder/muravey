import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/ui/icon";

interface Props {
  onLogin: (password: string) => boolean;
}

export default function LumenLoginPage({ onLogin }: Props) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;

    setLoading(true);
    setError(false);

    // ÐÐµÐ±Ð¾Ð»ÑÑÐ°Ñ Ð·Ð°Ð´ÐµÑÐ¶ÐºÐ° Ð´Ð»Ñ Ð²Ð¸Ð·ÑÐ°Ð»ÑÐ½Ð¾Ð³Ð¾ ÑÑÑÐµÐºÑÐ°
    await new Promise(r => setTimeout(r, 500));

    const ok = onLogin(password);
    if (!ok) {
      setError(true);
      setPassword("");
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="h-screen bg-[#07070c] flex items-center justify-center overflow-hidden relative">

      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.15, 0.22, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#9333ea]/25 blur-[120px]"
        />
        <motion.div
          animate={{ scale: [1.05, 1, 1.05], opacity: [0.1, 0.18, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-indigo-600/15 blur-[100px]"
        />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,transparent_30%,#07070c_100%)] pointer-events-none" />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        {/* Logo block */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4, ease: "easeOut" }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#f59e0b] to-[#ef4444] flex items-center justify-center shadow-[0_0_50px_#f59e0b60] mb-4"
          >
            <span className="text-2xl">ð</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.35 }}
            className="text-white text-2xl font-semibold tracking-tight"
          >
            ÐÑÑÐ°Ð²ÐµÐ¹
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.35 }}
            className="text-white/30 text-sm mt-1 text-center"
          >
            AI-ÑÐ°Ð·ÑÐ°Ð±Ð¾ÑÑÐ¸Ðº ÑÐ°Ð¹ÑÐ¾Ð² Ð¸ Ð¿ÑÐ¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ð¹
          </motion.p>
        </div>

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4, ease: "easeOut" }}
          className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm"
        >
          <h2 className="text-white/80 text-sm font-medium mb-5">ÐÐ²ÐµÐ´Ð¸ÑÐµ Ð¿Ð°ÑÐ¾Ð»Ñ Ð´Ð»Ñ Ð²ÑÐ¾Ð´Ð°</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Password field */}
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(false); }}
                placeholder="â¢â¢â¢â¢â¢â¢â¢â¢"
                autoComplete="current-password"
                className={`w-full h-11 bg-white/[0.05] border rounded-xl px-4 pr-11 text-white text-sm placeholder:text-white/20 outline-none transition-all ${
                  error
                    ? "border-red-500/50 focus:border-red-500/70 bg-red-500/[0.04]"
                    : "border-white/[0.08] focus:border-[#9333ea]/50 focus:bg-white/[0.07]"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
              >
                <Icon name={showPassword ? "EyeOff" : "Eye"} size={15} />
              </button>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 text-red-400 text-xs overflow-hidden"
                >
                  <Icon name="AlertCircle" size={13} />
                  ÐÐµÐ²ÐµÑÐ½ÑÐ¹ Ð¿Ð°ÑÐ¾Ð»Ñ. ÐÐ¾Ð¿ÑÐ¾Ð±ÑÐ¹ÑÐµ ÐµÑÑ ÑÐ°Ð·.
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={!password.trim() || loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="h-11 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#ef4444] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all mt-1 shadow-[0_0_20px_#f59e0b40]"
            >
              {loading ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    className="block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                  ÐÑÐ¾Ð²ÐµÑÐºÐ°...
                </>
              ) : (
                <>
                  <Icon name="LogIn" size={15} />
                  ÐÐ¾Ð¹ÑÐ¸
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Footer hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-white/15 text-xs mt-5"
        >
          ÐÐ¾ÑÑÑÐ¿ ÑÐ¾Ð»ÑÐºÐ¾ Ð¿Ð¾ Ð¿Ð°ÑÐ¾Ð»Ñ
        </motion.p>
      </motion.div>
    </div>
  );
}