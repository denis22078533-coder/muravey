import Icon from "@/components/ui/icon";

const STANDINGS_MOTO = [
  { pos: 1, name: "Ð. ÐÐ°ÑÐºÐµÑ", team: "Ducati", points: 148, flag: "ðªð¸", change: "=" },
  { pos: 2, name: "Ð¤. ÐÐ°Ð½ÑÑÑ", team: "Ducati", points: 131, flag: "ð®ð¹", change: "â²" },
  { pos: 3, name: "Ð¥. ÐÐ°ÑÑÐ¸Ð½", team: "Aprilia", points: 122, flag: "ðªð¸", change: "â¼" },
  { pos: 4, name: "Ð­. ÐÐ°ÑÑÑÑÐ½Ð¸Ð½Ð¸", team: "KTM", points: 98, flag: "ð®ð¹", change: "â²" },
  { pos: 5, name: "Ð. Ð­ÑÐ¿Ð°ÑÐ³Ð°ÑÐ¾", team: "Honda", points: 87, flag: "ðªð¸", change: "=" },
];

const STANDINGS_F1 = [
  { pos: 1, name: "Ð. ÐÐµÑÑÑÐ°Ð¿Ð¿ÐµÐ½", team: "Red Bull", points: 219, flag: "ð³ð±", change: "=" },
  { pos: 2, name: "Ð¨. ÐÐµÐºÐ»ÐµÑ", team: "Ferrari", points: 185, flag: "ð²ð¨", change: "â²" },
  { pos: 3, name: "Ð. ÐÐ¾ÑÑÐ¸Ñ", team: "McLaren", points: 176, flag: "ð¬ð§", change: "â¼" },
  { pos: 4, name: "Ð. Ð¡Ð°Ð¹Ð½Ñ", team: "Ferrari", points: 156, flag: "ðªð¸", change: "=" },
  { pos: 5, name: "Ð. Ð¥ÑÐ¼Ð¸Ð»ÑÐ¾Ð½", team: "Mercedes", points: 138, flag: "ð¬ð§", change: "â¼" },
];

const STATS_CARDS = [
  { label: "ÐÐµÑÐ¾Ð¿ÑÐ¸ÑÑÐ¸Ð¹ ÑÐµÐ·Ð¾Ð½Ð°", value: "21", icon: "Flag", color: "text-fire" },
  { label: "ÐÐ¾Ð½ÑÐ¸ÐºÐ¾Ð² Ð²ÑÐµÐ³Ð¾", value: "142", icon: "Users", color: "text-blue-400" },
  { label: "Ð¢ÑÐ°ÑÑ Ð² 41 ÑÑÑÐ°Ð½Ðµ", value: "41", icon: "MapPin", color: "text-green-400" },
  { label: "ÐÑÐ¸ÑÐµÐ»Ð¸ Ð¾Ð½Ð»Ð°Ð¹Ð½", value: "2.4M", icon: "Eye", color: "text-purple-400" },
];

export default function StatsPage() {
  return (
    <div className="pb-4">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <h1 className="font-oswald text-2xl font-bold tracking-widest text-white">Ð¡Ð¢ÐÐ¢ÐÐ¡Ð¢ÐÐÐ</h1>
        <p className="text-muted-foreground text-xs font-roboto mt-0.5">Ð¢ÑÑÐ½Ð¸ÑÐ½ÑÐµ ÑÐ°Ð±Ð»Ð¸ÑÑ ÑÐµÐ·Ð¾Ð½Ð° 2024</p>
      </div>

      {/* Quick stats */}
      <div className="px-4 pt-3 grid grid-cols-2 gap-2">
        {STATS_CARDS.map((stat, i) => (
          <div key={i} className={`animate-fade-in stagger-${i + 1} opacity-0 bg-card border border-border rounded-xl p-3 flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center ${stat.color}`}>
              <Icon name={stat.icon} size={20} />
            </div>
            <div>
              <p className={`font-oswald font-bold text-xl ${stat.color}`}>{stat.value}</p>
              <p className="text-muted-foreground text-xs font-roboto leading-tight">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* MotoGP Standings */}
      <div className="px-4 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">ðï¸</span>
          <span className="font-oswald font-bold text-white tracking-wider">MotoGP â Ð§ÐÐÐÐÐÐÐÐ¢</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in stagger-2 opacity-0">
          <div className="flex items-center justify-between px-3 py-2 bg-secondary/50 border-b border-border">
            <span className="text-xs text-muted-foreground font-oswald tracking-wider">ÐÐÐÐ©ÐÐ</span>
            <span className="text-xs text-muted-foreground font-oswald tracking-wider">ÐÐ§ÐÐ</span>
          </div>
          {STANDINGS_MOTO.map((p) => (
            <div key={p.pos} className={`flex items-center gap-3 px-3 py-2.5 border-b border-border/50 last:border-b-0 ${p.pos === 1 ? 'bg-fire/5' : ''}`}>
              <span className={`w-6 font-oswald font-bold text-sm ${p.pos === 1 ? 'text-fire' : 'text-muted-foreground'}`}>
                {p.pos}
              </span>
              <span className="text-lg">{p.flag}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-roboto font-medium">{p.name}</p>
                <p className="text-muted-foreground text-xs font-roboto">{p.team}</p>
              </div>
              <span className={`text-xs font-bold mr-1 ${p.change === 'â²' ? 'text-green-500' : p.change === 'â¼' ? 'text-red-500' : 'text-muted-foreground'}`}>
                {p.change}
              </span>
              <span className={`font-oswald font-bold text-base ${p.pos === 1 ? 'text-fire' : 'text-white'}`}>
                {p.points}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* F1 Standings */}
      <div className="px-4 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">ðï¸</span>
          <span className="font-oswald font-bold text-white tracking-wider">Ð¤ÐÐ ÐÐ£ÐÐ 1 â Ð§ÐÐÐÐÐÐÐÐ¢</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in stagger-3 opacity-0">
          <div className="flex items-center justify-between px-3 py-2 bg-secondary/50 border-b border-border">
            <span className="text-xs text-muted-foreground font-oswald tracking-wider">ÐÐÐÐÐ¢</span>
            <span className="text-xs text-muted-foreground font-oswald tracking-wider">ÐÐ§ÐÐ</span>
          </div>
          {STANDINGS_F1.map((p) => (
            <div key={p.pos} className={`flex items-center gap-3 px-3 py-2.5 border-b border-border/50 last:border-b-0 ${p.pos === 1 ? 'bg-fire/5' : ''}`}>
              <span className={`w-6 font-oswald font-bold text-sm ${p.pos === 1 ? 'text-fire' : 'text-muted-foreground'}`}>
                {p.pos}
              </span>
              <span className="text-lg">{p.flag}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-roboto font-medium">{p.name}</p>
                <p className="text-muted-foreground text-xs font-roboto">{p.team}</p>
              </div>
              <span className={`text-xs font-bold mr-1 ${p.change === 'â²' ? 'text-green-500' : p.change === 'â¼' ? 'text-red-500' : 'text-muted-foreground'}`}>
                {p.change}
              </span>
              <span className={`font-oswald font-bold text-base ${p.pos === 1 ? 'text-fire' : 'text-white'}`}>
                {p.points}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Last Race Result */}
      <div className="px-4 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-oswald font-bold text-fire tracking-wider text-sm">ð ÐÐÐ¡ÐÐÐÐÐ¯Ð¯ ÐÐÐÐÐ</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="bg-card border border-border rounded-xl p-3 animate-fade-in stagger-4 opacity-0">
          <p className="font-oswald text-white font-bold">MotoGP â ÐÑÐ°Ð½-ÐÑÐ¸ ÐÑÐ¿Ð°Ð½Ð¸Ð¸</p>
          <p className="text-muted-foreground text-xs font-roboto mt-0.5 mb-3">Ð¥ÐµÑÐµÑ, 26 Ð¼Ð°Ñ 2024</p>
          {[
            { place: "ð¥", name: "Ð. ÐÐ°ÑÐºÐµÑ", time: "40:12.643", gap: "ÐÐ¾Ð±ÐµÐ´Ð¸ÑÐµÐ»Ñ" },
            { place: "ð¥", name: "Ð¤. ÐÐ°Ð½ÑÑÑ", time: "40:14.201", gap: "+1.558" },
            { place: "ð¥", name: "Ð¥. ÐÐ°ÑÑÐ¸Ð½", time: "40:16.887", gap: "+4.244" },
          ].map((r, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-t border-border/50">
              <span className="text-xl">{r.place}</span>
              <div className="flex-1">
                <p className="text-white text-sm font-roboto font-medium">{r.name}</p>
                <p className="text-muted-foreground text-xs font-roboto">{r.time}</p>
              </div>
              <span className={`text-sm font-oswald font-bold ${i === 0 ? 'text-fire' : 'text-muted-foreground'}`}>{r.gap}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}