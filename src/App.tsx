import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Brain from './pages/Brain';
import Tax from './pages/Tax';
import Auth from './pages/Auth';
import { fetchMe, clearToken, User } from './lib/api';

export default function App() {
  // Временный bypass авторизации — всегда залогинены как гость
  const [user, setUser] = useState<User | null>({
    id: 'guest',
    email: 'guest@babki.local',
    tariff: 'free',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    setUser(null);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-2 flex-wrap">
        <h1 className="text-lg font-bold text-amber-400 mr-4">🧾 Бабки Скан</h1>
        <nav className="flex gap-2 text-sm flex-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-3 py-1 rounded-lg transition ${
                isActive ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
              }`
            }
          >
            📊 Дашборд
          </NavLink>
          <NavLink
            to="/tax"
            className={({ isActive }) =>
              `px-3 py-1 rounded-lg transition ${
                isActive ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
              }`
            }
          >
            📑 Налоги
          </NavLink>
          <NavLink
            to="/brain"
            className={({ isActive }) =>
              `px-3 py-1 rounded-lg transition ${
                isActive ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
              }`
            }
          >
            🧠 Мозг
          </NavLink>
        </nav>
        {user && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 hidden sm:inline">{user.email}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            user.tariff === 'pro' ? 'bg-purple-500/20 text-purple-400' :
            user.tariff === 'business' ? 'bg-cyan-500/20 text-cyan-400' :
            user.tariff === 'start' ? 'bg-green-500/20 text-green-400' :
            'bg-zinc-700 text-zinc-400'
          }`}>
            {user.tariff}
          </span>
          <button onClick={handleLogout} className="text-xs text-zinc-500 hover:text-red-400 transition px-2">
            Выйти
          </button>
        </div>
        )}
      </header>

      <main className="flex-1 p-4">
        <Routes>
          <Route path="/" element={<Home user={user!} />} />
          <Route path="/brain" element={<Brain />} />
          <Route path="/tax" element={<Tax />} />
        </Routes>
      </main>
    </div>
  );
}