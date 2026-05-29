import { Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import Brain from './pages/Brain';
import Tax from './pages/Tax';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-2 flex-wrap">
        <h1 className="text-lg font-bold text-amber-400 mr-4">🧾 Бабки Скан</h1>
        <nav className="flex gap-2 text-sm">
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
      </header>

      <main className="flex-1 p-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/brain" element={<Brain />} />
          <Route path="/tax" element={<Tax />} />
        </Routes>
      </main>
    </div>
  );
}