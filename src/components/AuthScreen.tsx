import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";

const SPORTS = ["MotoGP", "Ð¤Ð¾ÑÐ¼ÑÐ»Ð° 1", "WRC Ð Ð°Ð»Ð»Ð¸", "Superbike", "ÐÑÐ¸ÑÑ", "ÐÐ°ÑÑÐ¸Ð½Ð³"];
const AVATARS = ["ð", "ðï¸", "ðï¸", "ð", "â¡", "ð¥", "ð", "ð¨"];

type Screen = "welcome" | "login" | "register";

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [screen, setScreen] = useState<Screen>("welcome");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [loginForm, setLoginForm] = useState({ login: "", password: "" });
  const [regForm, setRegForm] = useState({
    username: "",
    email: "",
    password: "",
    display_name: "",
    avatar_emoji: "ð",
    favorite_sports: [] as string[],
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await login(loginForm.login, loginForm.password);
    setLoading(false);
    if (res.error) setError(res.error);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!regForm.username || !regForm.email || !regForm.password) {
      setError("ÐÐ°Ð¿Ð¾Ð»Ð½Ð¸ÑÐµ Ð²ÑÐµ Ð¿Ð¾Ð»Ñ");
      return;
    }
    if (regForm.password.length < 6) {
      setError("ÐÐ°ÑÐ¾Ð»Ñ Ð¼Ð¸Ð½Ð¸Ð¼ÑÐ¼ 6 ÑÐ¸Ð¼Ð²Ð¾Ð»Ð¾Ð²");
      return;
    }
    setLoading(true);
    const res = await register({
      username: regForm.username,
      email: regForm.email,
      password: regForm.password,
      display_name: regForm.display_name || regForm.username,
    });
    setLoading(false);
    if (res.error) setError(res.error);
  };

  const toggleSport = (s: string) => {
    setRegForm(prev => ({
      ...prev,
      favorite_sports: prev.favorite_sports.includes(s)
        ? prev.favorite_sports.filter(x => x !== s)
        : [...prev.favorite_sports, s],
    }));
  };

  if (screen === "welcome") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-between px-6 py-10">
        {/* Hero */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="relative mb-6">
            <div className="w-24 h-24 fire-gradient rounded-2xl flex items-center justify-center text-5xl shadow-2xl shadow-fire/30">
              ð
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
              <span className="w-2 h-2 bg-white rounded-full live-pulse" />
            </div>
          </div>

          <h1 className="font-oswald text-5xl font-bold text-white tracking-widest text-glow mb-2">
            MOTO<span className="text-fire">FEED</span>
          </h1>
          <p className="text-muted-foreground font-roboto text-base mt-2 max-w-xs leading-relaxed">
            ÐÐ¾ÑÐ¾ÑÐ¿Ð¾ÑÑ Ð¸ Ð°Ð²ÑÐ¾ÑÐ¿Ð¾ÑÑ â Ð³Ð¾Ð½ÐºÐ¸, ÑÑÐ°Ð½ÑÐ»ÑÑÐ¸Ð¸ Ð¸ ÑÐ¾Ð¾Ð±ÑÐµÑÑÐ²Ð¾ Ð² Ð¾Ð´Ð½Ð¾Ð¼ Ð¼ÐµÑÑÐµ
          </p>

          {/* Features */}
          <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
            {[
              { icon: "Radio", text: "ÐÑÑÐ¼ÑÐµ ÑÑÐ°Ð½ÑÐ»ÑÑÐ¸Ð¸ Ð³Ð¾Ð½Ð¾Ðº" },
              { icon: "Calendar", text: "ÐÑÐµ Ð¼ÐµÑÐ¾Ð¿ÑÐ¸ÑÑÐ¸Ñ ÑÐµÐ·Ð¾Ð½Ð°" },
              { icon: "MessageCircle", text: "ÐÐ¸Ð²ÑÐµ ÑÐ°ÑÑ ÑÐ°Ð½Ð°ÑÐ¾Ð²" },
            ].map((f) => (
              <div key={f.icon} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                <Icon name={f.icon} size={18} className="text-fire flex-shrink-0" />
                <span className="text-white/80 text-sm font-roboto">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="w-full max-w-xs flex flex-col gap-3 mt-8">
          <button
            onClick={() => setScreen("register")}
            className="w-full fire-gradient text-white font-oswald font-bold text-base py-4 rounded-xl tracking-wider shadow-lg shadow-fire/20 hover:opacity-90 transition-opacity"
          >
            ÐÐÐ§ÐÐ¢Ð¬ ÐÐÐ¡ÐÐÐÐ¢ÐÐ
          </button>
          <button
            onClick={() => setScreen("login")}
            className="w-full bg-secondary border border-border text-white font-oswald font-semibold text-base py-4 rounded-xl tracking-wider hover:border-fire/40 transition-colors"
          >
            ÐÐÐÐ¢Ð Ð ÐÐÐÐÐ£ÐÐ¢
          </button>
          <p className="text-center text-muted-foreground text-xs font-roboto mt-1">
            ÐÐ°Ð¶Ð¸Ð¼Ð°Ñ Â«ÐÐ°ÑÐ°ÑÑÂ», Ð²Ñ ÑÐ¾Ð³Ð»Ð°ÑÐ°ÐµÑÐµÑÑ Ñ ÑÑÐ»Ð¾Ð²Ð¸ÑÐ¼Ð¸ Ð¸ÑÐ¿Ð¾Ð»ÑÐ·Ð¾Ð²Ð°Ð½Ð¸Ñ
          </p>
        </div>
      </div>
    );
  }

  if (screen === "login") {
    return (
      <div className="min-h-screen bg-background flex flex-col px-6 py-8">
        <button onClick={() => { setScreen("welcome"); setError(""); }} className="self-start text-muted-foreground hover:text-white transition-colors mb-6">
          <Icon name="ArrowLeft" size={24} />
        </button>

        <div className="mb-8">
          <h2 className="font-oswald text-3xl font-bold text-white tracking-wider">ÐÐÐÐ Ð<br /><span className="text-fire">ÐÐÐÐÐÐÐÐÐ¢Ð¬</span></h2>
          <p className="text-muted-foreground text-sm font-roboto mt-2">ÐÐ¾Ð¹Ð´Ð¸ÑÐµ Ð² ÑÐ²Ð¾Ð¹ Ð°ÐºÐºÐ°ÑÐ½Ñ</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-oswald font-bold text-muted-foreground tracking-wider mb-1.5 block">EMAIL ÐÐÐ ÐÐÐÐÐ</label>
            <input
              type="text"
              value={loginForm.login}
              onChange={e => setLoginForm(p => ({ ...p, login: e.target.value }))}
              placeholder="example@mail.ru"
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-white font-roboto text-sm placeholder:text-muted-foreground outline-none focus:border-fire transition-colors"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-xs font-oswald font-bold text-muted-foreground tracking-wider mb-1.5 block">ÐÐÐ ÐÐÐ¬</label>
            <input
              type="password"
              value={loginForm.password}
              onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
              placeholder="â¢â¢â¢â¢â¢â¢â¢â¢"
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-white font-roboto text-sm placeholder:text-muted-foreground outline-none focus:border-fire transition-colors"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 flex items-center gap-2">
              <Icon name="AlertCircle" size={16} className="text-red-400 flex-shrink-0" />
              <span className="text-red-300 text-sm font-roboto">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full fire-gradient text-white font-oswald font-bold text-base py-4 rounded-xl tracking-wider mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <><Icon name="Loader" size={18} className="animate-spin" /> ÐÐ¥ÐÐÐÐ...</> : "ÐÐÐÐ¢Ð"}
          </button>
        </form>

        <div className="mt-auto pt-8 text-center">
          <span className="text-muted-foreground text-sm font-roboto">ÐÐµÑ Ð°ÐºÐºÐ°ÑÐ½ÑÐ°? </span>
          <button onClick={() => { setScreen("register"); setError(""); }} className="text-fire font-roboto font-medium text-sm hover:underline">
            ÐÐ°ÑÐµÐ³Ð¸ÑÑÑÐ¸ÑÐ¾Ð²Ð°ÑÑÑÑ
          </button>
        </div>
      </div>
    );
  }

  // Register screen
  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-8 overflow-y-auto">
      <button onClick={() => { setScreen("welcome"); setError(""); }} className="self-start text-muted-foreground hover:text-white transition-colors mb-6">
        <Icon name="ArrowLeft" size={24} />
      </button>

      <div className="mb-6">
        <h2 className="font-oswald text-3xl font-bold text-white tracking-wider">ÐÐÐÐ«Ð<br /><span className="text-fire">ÐÐÐÐÐ£ÐÐ¢</span></h2>
        <p className="text-muted-foreground text-sm font-roboto mt-2">Ð¡Ð¾Ð·Ð´Ð°Ð¹ÑÐµ Ð¿ÑÐ¾ÑÐ¸Ð»Ñ Ð³Ð¾Ð½ÑÐ¸ÐºÐ°</p>
      </div>

      <form onSubmit={handleRegister} className="flex flex-col gap-4 pb-8">
        {/* Avatar picker */}
        <div>
          <label className="text-xs font-oswald font-bold text-muted-foreground tracking-wider mb-2 block">ÐÐÐÐ¢ÐÐ </label>
          <div className="flex gap-2 flex-wrap">
            {AVATARS.map(a => (
              <button
                key={a}
                type="button"
                onClick={() => setRegForm(p => ({ ...p, avatar_emoji: a }))}
                className={`w-11 h-11 rounded-xl text-2xl flex items-center justify-center border-2 transition-all ${regForm.avatar_emoji === a ? 'border-fire bg-fire/10 scale-110' : 'border-border bg-secondary'}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-oswald font-bold text-muted-foreground tracking-wider mb-1.5 block">ÐÐÐ¯</label>
          <input
            type="text"
            value={regForm.display_name}
            onChange={e => setRegForm(p => ({ ...p, display_name: e.target.value }))}
            placeholder="ÐÐ»ÐµÐºÑÐµÐ¹ ÐÑÐ¾Ð¼Ð¾Ð²"
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-white font-roboto text-sm placeholder:text-muted-foreground outline-none focus:border-fire transition-colors"
          />
        </div>
        <div>
          <label className="text-xs font-oswald font-bold text-muted-foreground tracking-wider mb-1.5 block">ÐÐÐÐÐ *</label>
          <input
            type="text"
            value={regForm.username}
            onChange={e => setRegForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g, '') }))}
            placeholder="aleksey_moto"
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-white font-roboto text-sm placeholder:text-muted-foreground outline-none focus:border-fire transition-colors"
            autoComplete="username"
          />
        </div>
        <div>
          <label className="text-xs font-oswald font-bold text-muted-foreground tracking-wider mb-1.5 block">EMAIL *</label>
          <input
            type="email"
            value={regForm.email}
            onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))}
            placeholder="example@mail.ru"
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-white font-roboto text-sm placeholder:text-muted-foreground outline-none focus:border-fire transition-colors"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="text-xs font-oswald font-bold text-muted-foreground tracking-wider mb-1.5 block">ÐÐÐ ÐÐÐ¬ *</label>
          <input
            type="password"
            value={regForm.password}
            onChange={e => setRegForm(p => ({ ...p, password: e.target.value }))}
            placeholder="ÐÐ¸Ð½Ð¸Ð¼ÑÐ¼ 6 ÑÐ¸Ð¼Ð²Ð¾Ð»Ð¾Ð²"
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-white font-roboto text-sm placeholder:text-muted-foreground outline-none focus:border-fire transition-colors"
            autoComplete="new-password"
          />
        </div>

        {/* Favorite sports */}
        <div>
          <label className="text-xs font-oswald font-bold text-muted-foreground tracking-wider mb-2 block">ÐÐ®ÐÐÐÐ«Ð ÐÐÐÐ« Ð¡ÐÐÐ Ð¢Ð</label>
          <div className="flex flex-wrap gap-2">
            {SPORTS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSport(s)}
                className={`px-3 py-1.5 rounded-full text-sm font-oswald font-semibold tracking-wide border transition-all ${regForm.favorite_sports.includes(s) ? 'fire-gradient border-fire text-white' : 'border-border bg-secondary text-muted-foreground'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 flex items-center gap-2">
            <Icon name="AlertCircle" size={16} className="text-red-400 flex-shrink-0" />
            <span className="text-red-300 text-sm font-roboto">{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full fire-gradient text-white font-oswald font-bold text-base py-4 rounded-xl tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <><Icon name="Loader" size={18} className="animate-spin" /> Ð¡ÐÐÐÐÐÐ...</> : "Ð¡ÐÐÐÐÐ¢Ð¬ ÐÐÐÐÐ£ÐÐ¢"}
        </button>
      </form>

      <div className="text-center -mt-4 pb-4">
        <span className="text-muted-foreground text-sm font-roboto">Ð£Ð¶Ðµ ÐµÑÑÑ Ð°ÐºÐºÐ°ÑÐ½Ñ? </span>
        <button onClick={() => { setScreen("login"); setError(""); }} className="text-fire font-roboto font-medium text-sm hover:underline">
          ÐÐ¾Ð¹ÑÐ¸
        </button>
      </div>
    </div>
  );
}
