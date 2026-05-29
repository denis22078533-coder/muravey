import { Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import Brain from './pages/Brain';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center gap-6">
        <h1 className="text-lg font-bold text-cyan-400">🧾 Бабки Скан</h1>
        <nav className="flex gap-4 text-sm">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? 'text-cyan-300 underline' : 'text-slate-300 hover:text-white'
            }
          >
            📸 Чеки
          </NavLink>
          <NavLink
            to="/brain"
            className={({ isActive }) =>
              isActive ? 'text-cyan-300 underline' : 'text-slate-300 hover:text-white'
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
        </Routes>
      </main>
    </div>
  );
}