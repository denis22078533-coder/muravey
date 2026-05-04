import { useState } from "react";
import Icon from "@/components/ui/icon";

const CHATS = [
  {
    id: 1,
    name: "MotoGP Ð¤Ð°Ð½Ð°ÑÑ",
    avatar: "ðï¸",
    lastMsg: "ÐÐ°ÑÐº Ð¡ÐÐÐÐ Ð¿ÐµÑÐ²ÑÐ¹! ÐÑÐ¾ÑÑÐ¾ Ð½ÐµÑÐµÐ°Ð»ÑÐ½Ð¾",
    time: "ÑÐµÐ¹ÑÐ°Ñ",
    unread: 24,
    online: true,
    members: "12.4K",
  },
  {
    id: 2,
    name: "Ð¤Ð¾ÑÐ¼ÑÐ»Ð° 1 Ð Ð¾ÑÑÐ¸Ñ",
    avatar: "ðï¸",
    lastMsg: "ÐÐµÑÑÑÐ°Ð¿Ð¿ÐµÐ½: +18 Ð¾ÑÐºÐ¾Ð² Ð¾Ñ Ð¥ÑÐ¼Ð¸Ð»ÑÐ¾Ð½Ð°",
    time: "2 Ð¼Ð¸Ð½",
    unread: 7,
    online: true,
    members: "8.9K",
  },
  {
    id: 3,
    name: "WRC Ð Ð°Ð»Ð»Ð¸ ÐÐ»ÑÐ±",
    avatar: "ð",
    lastMsg: "ÐÑÐ¾ ÐµÐ´ÐµÑ ÑÐ¼Ð¾ÑÑÐµÑÑ Ð Ð°Ð»Ð»Ð¸ Ð¤Ð¸Ð½Ð»ÑÐ½Ð´Ð¸Ñ?",
    time: "15 Ð¼Ð¸Ð½",
    unread: 3,
    online: true,
    members: "4.2K",
  },
  {
    id: 4,
    name: "Ð Ð¾ÑÑÐ¸Ð¹ÑÐºÐ¸Ð¹ ÐÐ°ÑÑÐ¸Ð½Ð³",
    avatar: "ð§",
    lastMsg: "Ð ÐµÐ·ÑÐ»ÑÑÐ°ÑÑ ÑÑÐ°Ð¿Ð° Ð² Ð¡Ð¾ÑÐ¸ Ð²ÑÐ»Ð¾Ð¶ÐµÐ½Ñ",
    time: "1Ñ",
    unread: 0,
    online: false,
    members: "2.1K",
  },
  {
    id: 5,
    name: "ÐÑÐ¸ÑÑ ÐÐ¾Ð»Ð»ÐµÐºÑÐ¸Ð²",
    avatar: "ð¨",
    lastMsg: "ÐÐ¾Ð²Ð¾Ðµ Ð²Ð¸Ð´ÐµÐ¾ Ñ Ð¿ÑÐ¾Ð³ÑÐµÐ²Ð° Ð·Ð°Ð´Ð½ÐµÐ¹ Ð¾ÑÐ¸...",
    time: "3Ñ",
    unread: 0,
    online: false,
    members: "3.7K",
  },
  {
    id: 6,
    name: "Superbike ÐÑÐ±Ð¸ÑÐµÐ»Ð¸",
    avatar: "ð",
    lastMsg: "Ð¢Ð¾Ð¿-5 Ð¼Ð¾ÑÐ¾ÑÐ¸ÐºÐ»Ð¾Ð² ÑÐµÐ·Ð¾Ð½Ð° â Ð¾Ð±ÑÑÐ¶Ð´ÐµÐ½Ð¸Ðµ",
    time: "5Ñ",
    unread: 0,
    online: false,
    members: "1.8K",
  },
];

const MESSAGES = [
  { id: 1, user: "ÐÐ¸Ð¼Ð° Ð.", text: "ÐÐ°ÑÐº Ð¡ÐÐÐÐ Ð¿ÐµÑÐ²ÑÐ¹! ÐÑÐ¾ÑÑÐ¾ Ð½ÐµÑÐµÐ°Ð»ÑÐ½Ð¾ ÑÐ¼Ð¾ÑÑÐµÑÑ", time: "14:32", own: false },
  { id: 2, user: "ÐÑ", text: "ÐÐ°, ÑÑÐ¾Ñ ÐÐ°ÑÐºÐµÑ â Ð¾Ð³Ð¾Ð½Ñ! ÐÑÑÐ³ 3 Ð±ÑÐ» ÑÐµÐ´ÐµÐ²Ñ", time: "14:33", own: true },
  { id: 3, user: "ÐÐ»ÑÐ½Ð° Ð.", text: "ÐÐµÐ´ÑÐ¾ÑÐ° Ð¿ÑÑÐ°ÐµÑÑÑ Ð´Ð¾Ð³Ð½Ð°ÑÑ, Ð½Ð¾ ÑÐ¶Ðµ -4 ÑÐµÐº... Ð½Ðµ Ð´Ð¾Ð³Ð¾Ð½Ð¸Ñ", time: "14:34", own: false },
  { id: 4, user: "ÐÑÑÑÐ¼ Ð .", text: "ð¥ð¥ð¥ ÐºÐ°ÐºÐ¾Ð¹ Ð¾Ð±Ð³Ð¾Ð½ Ð² Ð¿Ð¾Ð²Ð¾ÑÐ¾ÑÐµ 7!", time: "14:35", own: false },
  { id: 5, user: "ÐÑ", text: "ÐÐ¸Ð´ÐµÐ»! Ð§ÑÑÑ ÑÐ¾ ÑÑÑÐ»Ð° Ð½Ðµ ÑÐ¿Ð°Ð» ð", time: "14:35", own: true },
  { id: 6, user: "ÐÐ²Ð°Ð½ Ð¡.", text: "Ð¡ÐºÐ¾Ð»ÑÐºÐ¾ ÐµÑÑ ÐºÑÑÐ³Ð¾Ð² Ð´Ð¾ ÑÐ¸Ð½Ð¸ÑÐ°?", time: "14:37", own: false },
  { id: 7, user: "ÐÐ¸Ð¼Ð° Ð.", text: "ÐÑÑ 8 ÐºÑÑÐ³Ð¾Ð², Ð´ÐµÑÐ¶Ð¸ÑÐµÑÑ! ÐÐ´ÐµÑÑ Ð³Ð»Ð°Ð²Ð½Ð¾Ðµ ÑÐ¸Ð½Ñ", time: "14:38", own: false },
];

export default function ChatPage() {
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const activeData = CHATS.find(c => c.id === activeChat);

  if (activeChat && activeData) {
    return (
      <div className="flex flex-col h-screen pb-16">
        {/* Chat header */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setActiveChat(null)} className="text-muted-foreground hover:text-white transition-colors">
            <Icon name="ArrowLeft" size={22} />
          </button>
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-lg">{activeData.avatar}</div>
          <div className="flex-1">
            <p className="font-oswald text-white font-semibold text-sm">{activeData.name}</p>
            <p className="text-xs text-fire font-roboto">{activeData.members} ÑÑÐ°ÑÑÐ½Ð¸ÐºÐ¾Ð² Â· Ð¾Ð½Ð»Ð°Ð¹Ð½</p>
          </div>
          <button className="text-muted-foreground hover:text-white transition-colors">
            <Icon name="MoreVertical" size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {MESSAGES.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.own ? 'items-end' : 'items-start'}`}>
              {!msg.own && <span className="text-xs text-fire font-oswald font-bold mb-1">{msg.user}</span>}
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl ${msg.own ? 'fire-gradient text-white rounded-br-sm' : 'bg-secondary text-white rounded-bl-sm'}`}>
                <p className="text-sm font-roboto">{msg.text}</p>
              </div>
              <span className="text-xs text-muted-foreground mt-1">{msg.time}</span>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border flex gap-2 bg-background">
          <input
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="ÐÐ°Ð¿Ð¸ÑÐ°ÑÑ ÑÐ¾Ð¾Ð±ÑÐµÐ½Ð¸Ðµ..."
            className="flex-1 bg-secondary border border-border rounded-full px-4 py-2 text-sm font-roboto text-white placeholder:text-muted-foreground outline-none focus:border-fire transition-colors"
          />
          <button className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${message ? 'fire-gradient' : 'bg-secondary'}`}>
            <Icon name="Send" size={18} className="text-white" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-oswald text-2xl font-bold tracking-widest text-white">Ð§ÐÐ¢</h1>
          <p className="text-muted-foreground text-xs font-roboto mt-0.5">Ð¡Ð¾Ð¾Ð±ÑÐµÑÑÐ²Ð° Ð¿Ð¾ Ð²Ð¸Ð´Ð°Ð¼ ÑÐ¿Ð¾ÑÑÐ°</p>
        </div>
        <button className="w-9 h-9 fire-gradient rounded-full flex items-center justify-center">
          <Icon name="Plus" size={18} className="text-white" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2 border border-border">
          <Icon name="Search" size={16} className="text-muted-foreground" />
          <input placeholder="ÐÐ¾Ð¸ÑÐº ÑÐ°ÑÐ¾Ð²..." className="flex-1 bg-transparent text-sm font-roboto text-white placeholder:text-muted-foreground outline-none" />
        </div>
      </div>

      {/* Chat list */}
      <div className="flex flex-col">
        {CHATS.map((chat, i) => (
          <button
            key={chat.id}
            onClick={() => setActiveChat(chat.id)}
            className={`animate-fade-in stagger-${Math.min(i + 1, 5)} opacity-0 flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border/50 text-left`}
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-secondary border border-border flex items-center justify-center text-2xl">
                {chat.avatar}
              </div>
              {chat.online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-oswald font-semibold text-white text-sm">{chat.name}</span>
                <span className="text-xs text-muted-foreground font-roboto">{chat.time}</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs font-roboto truncate pr-2">{chat.lastMsg}</p>
                {chat.unread > 0 && (
                  <span className="flex-shrink-0 min-w-5 h-5 fire-gradient rounded-full flex items-center justify-center text-white text-xs font-bold px-1">
                    {chat.unread}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground/60 font-roboto">{chat.members} ÑÑÐ°ÑÑÐ½Ð¸ÐºÐ¾Ð²</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
