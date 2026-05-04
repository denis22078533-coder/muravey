import { useState } from "react";
import Icon from "@/components/ui/icon";

const IMG = {
  enduro: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  rally: "https://images.unsplash.com/photo-1591824438708-ce405f36ba3d?w=800&q=80",
  moto: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&q=80",
  drift: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80",
};

const STORIES = [
  { id: 1, name: "Ð¡Ð²ÐµÑÐ»Ð¾Ð³ÑÐ°Ð´", icon: "ðï¸", live: true },
  { id: 2, name: "ÐÑÐ°ÑÐ½Ð¾Ð´Ð°Ñ", icon: "ð", live: true },
  { id: 3, name: "Ð¡ÑÐ°Ð²ÑÐ¾Ð¿Ð¾Ð»Ñ", icon: "ð", live: false },
  { id: 4, name: "ÐÑÐ¼Ð°Ð²Ð¸Ñ", icon: "ð¥", live: false },
  { id: 5, name: "ÐÐ½Ð°Ð¿Ð°", icon: "ð¨", live: false },
  { id: 6, name: "ÐÐ¸ÑÐ»Ð¾Ð²Ð¾Ð´ÑÐº", icon: "â°ï¸", live: false },
];

const POSTS = [
  {
    id: 1,
    user: "MotoSvetlograd",
    avatar: "ðï¸",
    sport: "Ð­Ð½Ð´ÑÑÐ¾",
    time: "LIVE Â· 1Ñ 22Ð¼",
    isLive: true,
    image: IMG.enduro,
    title: "Ð¡Ð²ÐµÑÐ»Ð¾Ð³ÑÐ°Ð´ÑÐºÐ¸Ð¹ ÑÐ½Ð´ÑÑÐ¾-Ð¼Ð°ÑÐ°ÑÐ¾Ð½ 2026",
    desc: "Ð¡ÑÐ°ÑÑ Ð´Ð°Ð½! ÐÐ¾Ð»ÐµÐµ 80 Ð³Ð¾Ð½ÑÐ¸ÐºÐ¾Ð² Ð²ÑÑÐ»Ð¸ Ð½Ð° ÑÑÐ°ÑÑÑ Ð¿Ð¾Ð´ Ð¡Ð²ÐµÑÐ»Ð¾Ð³ÑÐ°Ð´Ð¾Ð¼ â ÑÑÐµÐ¿Ð¸, Ð¾Ð²ÑÐ°Ð³Ð¸, Ð¿ÑÐ»Ñ ÑÑÐ¾Ð»Ð±Ð¾Ð¼!",
    likes: 312,
    comments: 47,
    views: "2.4K",
    tag: "ð´ ÐÐ Ð¯ÐÐÐ Ð­Ð¤ÐÐ ",
    tagColor: "bg-red-600",
  },
  {
    id: 2,
    user: "RallyKuban",
    avatar: "ð",
    sport: "Ð Ð°Ð»Ð»Ð¸",
    time: "2 ÑÐ°ÑÐ° Ð½Ð°Ð·Ð°Ð´",
    isLive: false,
    image: IMG.rally,
    title: "Ð Ð°Ð»Ð»Ð¸ Â«ÐÑÐ±Ð°Ð½ÑÐºÐ¸Ðµ Ð¿ÑÐ¾ÑÑÐ¾ÑÑÂ» â Ð¤Ð¸Ð½Ð°Ð»",
    desc: "Ð­ÐºÐ¸Ð¿Ð°Ð¶ ÐÐµÑÑÐ¾Ð²Ð°/ÐÐ¾Ð³Ð¸Ð½Ð¾Ð²Ð° Ð²ÑÐ¸Ð³ÑÑÐ²Ð°ÐµÑ ÑÐ¸Ð½Ð°Ð»ÑÐ½ÑÐ¹ Ð¡Ð£ Ð¿Ð¾Ð´ ÐÑÐ¼Ð°Ð²Ð¸ÑÐ¾Ð¼! ÐÑÐ¾Ð³Ð¸ ÑÐµÐ·Ð¾Ð½Ð° Ð½Ð° Ð½Ð°ÑÐµÐ¼ ÐºÐ°Ð½Ð°Ð»Ðµ.",
    likes: 189,
    comments: 34,
    views: "1.8K",
    tag: "ð¬ ÐÐÐÐÐÐÐÐÐÐ¡Ð¬",
    tagColor: "bg-orange-600",
  },
  {
    id: 3,
    user: "MotoCross_Stav",
    avatar: "ð",
    sport: "ÐÐ¾ÑÐ¾ÐºÑÐ¾ÑÑ",
    time: "ÐÑÐµÑÐ°",
    isLive: false,
    image: IMG.moto,
    title: "ÐÑÐ±Ð¾Ðº Ð¡ÑÐ°Ð²ÑÐ¾Ð¿Ð¾Ð»ÑÑ Ð¿Ð¾ Ð¼Ð¾ÑÐ¾ÐºÑÐ¾ÑÑÑ",
    desc: "ÐÑÑÑÐ¸Ðµ Ð¿ÑÑÐ¶ÐºÐ¸ Ð¸ Ð¾Ð±Ð³Ð¾Ð½Ñ ÑÑÐ°Ð¿Ð° Ð² Ð¡ÑÐ°Ð²ÑÐ¾Ð¿Ð¾Ð»Ðµ! Ð§ÐµÐ¼Ð¿Ð¸Ð¾Ð½Ð°Ñ Ð¡ÐÐ¤Ð â Ð¸ÑÐ¾Ð³Ð¾Ð²ÑÐ¹ Ð·Ð°ÑÑÑ Ð·Ð° 2026 Ð³Ð¾Ð´.",
    likes: 521,
    comments: 83,
    views: "4.2K",
    tag: "ð ÐÐ£Ð§Ð¨ÐÐ",
    tagColor: "bg-yellow-600",
  },
  {
    id: 4,
    user: "DriftKrasnodar",
    avatar: "ð¨",
    sport: "ÐÑÐ¸ÑÑ",
    time: "3 Ð´Ð½Ñ Ð½Ð°Ð·Ð°Ð´",
    isLive: false,
    image: IMG.drift,
    title: "ÐÐ¾ÑÐ½Ð¾Ð¹ Ð´ÑÐ¸ÑÑ â ÐÑÐ°ÑÐ½Ð¾Ð´Ð°Ñ 2026",
    desc: "Ð¤Ð¸Ð½Ð°Ð» ÐºÑÐ°ÐµÐ²ÑÑ ÑÐ¾ÑÐµÐ²Ð½Ð¾Ð²Ð°Ð½Ð¸Ð¹ Ð¿Ð¾ Ð´ÑÐ¸ÑÑÑ Ð¿ÑÐ¾ÑÑÐ» Ð½Ð° Ð°Ð²ÑÐ¾Ð´ÑÐ¾Ð¼Ðµ Â«Ð®Ð¶Ð½ÑÐ¹Â». ÐÑÐ¼Ð¾ÑÑÐµÑÐ° â Ð¾Ð³Ð¾Ð½Ñ!",
    likes: 743,
    comments: 96,
    views: "6.7K",
    tag: "ð¬ ÐÐÐÐÐÐÐÐÐÐ¡Ð¬",
    tagColor: "bg-orange-600",
  },
];

export default function FeedPage() {
  const [liked, setLiked] = useState<number[]>([]);
  const [saved, setSaved] = useState<number[]>([]);

  const toggleLike = (id: number) => {
    setLiked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSave = (id: number) => {
    setSaved(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <span className="font-oswald text-2xl font-bold tracking-widest text-white">
            MOTO<span className="text-fire">FEED</span>
          </span>
          <span className="ml-2 text-xs text-muted-foreground font-roboto">Ð¡ÑÐ°Ð²ÑÐ¾Ð¿Ð¾Ð»ÑÐµ Â· ÐÑÐ±Ð°Ð½Ñ</span>
        </div>
        <div className="flex gap-3">
          <button className="text-muted-foreground hover:text-white transition-colors">
            <Icon name="Search" size={22} />
          </button>
          <button className="text-muted-foreground hover:text-white transition-colors relative">
            <Icon name="Bell" size={22} />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-fire rounded-full" />
          </button>
        </div>
      </div>

      {/* Stories â Ð³Ð¾ÑÐ¾Ð´Ð° */}
      <div className="px-4 py-3 flex gap-3 overflow-x-auto scrollbar-hide">
        {STORIES.map((s) => (
          <div key={s.id} className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2 transition-transform hover:scale-105 ${s.live ? 'border-fire bg-fire/10' : 'border-border bg-secondary'}`}>
              {s.icon}
              {s.live && (
                <span className="absolute mt-10 ml-10 w-3 h-3 bg-red-500 rounded-full border-2 border-background live-pulse" />
              )}
            </div>
            <span className="text-xs text-muted-foreground font-roboto whitespace-nowrap">{s.name}</span>
            {s.live && <span className="text-[9px] text-fire font-oswald font-bold tracking-wider">LIVE</span>}
          </div>
        ))}
      </div>

      <div className="h-px bg-border mx-4 mb-2" />

      {/* Posts */}
      <div className="flex flex-col gap-1">
        {POSTS.map((post, i) => (
          <article key={post.id} className={`animate-fade-in stagger-${Math.min(i + 1, 5)} opacity-0`}>
            {/* Post Header */}
            <div className="px-4 py-2 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-lg">
                {post.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-oswald font-semibold text-white text-sm">{post.user}</span>
                  <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full font-roboto">{post.sport}</span>
                </div>
                <span className="text-xs text-muted-foreground font-roboto">{post.time}</span>
              </div>
              <button className="text-muted-foreground hover:text-white transition-colors">
                <Icon name="MoreHorizontal" size={18} />
              </button>
            </div>

            {/* Image */}
            <div className="relative overflow-hidden">
              <img src={post.image} alt={post.title} className="w-full aspect-video object-cover" />
              <div className="feed-gradient absolute inset-0" />

              <div className="absolute top-3 left-3">
                <span className={`${post.tagColor} text-white text-xs font-oswald font-bold px-2 py-1 rounded tracking-wider`}>
                  {post.tag}
                </span>
              </div>

              {!post.isLive && (
                <button className="absolute inset-0 flex items-center justify-center group">
                  <div className="w-14 h-14 rounded-full bg-black/60 border-2 border-white/80 flex items-center justify-center group-hover:bg-fire/80 transition-colors">
                    <Icon name="Play" size={24} className="text-white ml-1" />
                  </div>
                </button>
              )}

              {post.isLive && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded">
                  <span className="w-2 h-2 bg-red-500 rounded-full live-pulse" />
                  <span className="text-white text-xs font-oswald font-bold">Ð¡ÐÐÐ¢Ð ÐÐ¢Ð¬</span>
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="font-oswald text-white text-lg font-bold leading-tight">{post.title}</h3>
                <p className="text-white/80 text-xs font-roboto mt-0.5 line-clamp-2">{post.desc}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-white/60 text-xs font-roboto flex items-center gap-1">
                    <Icon name="Eye" size={12} />
                    {post.views}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 py-2 flex items-center gap-5">
              <button
                onClick={() => toggleLike(post.id)}
                className={`flex items-center gap-1.5 transition-colors ${liked.includes(post.id) ? 'text-fire' : 'text-muted-foreground hover:text-white'}`}
              >
                <Icon name="Heart" size={20} />
                <span className="text-sm font-roboto">{post.likes + (liked.includes(post.id) ? 1 : 0)}</span>
              </button>
              <button className="flex items-center gap-1.5 text-muted-foreground hover:text-white transition-colors">
                <Icon name="MessageCircle" size={20} />
                <span className="text-sm font-roboto">{post.comments}</span>
              </button>
              <button className="flex items-center gap-1.5 text-muted-foreground hover:text-white transition-colors">
                <Icon name="Share2" size={20} />
              </button>
              <div className="flex-1" />
              <button
                onClick={() => toggleSave(post.id)}
                className={`transition-colors ${saved.includes(post.id) ? 'text-fire' : 'text-muted-foreground hover:text-white'}`}
              >
                <Icon name="Bookmark" size={20} />
              </button>
            </div>
            <div className="h-px bg-border mx-4" />
          </article>
        ))}
      </div>
    </div>
  );
}
