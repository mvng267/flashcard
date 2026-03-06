import React from "react";
import { BarChart3, BookCheck, BookOpen, Library as LibraryIcon, LogOut } from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const navItems = [
    { path: "/", label: "Flashcard", icon: BookCheck },
    { path: "/library", label: "Thư viện", icon: LibraryIcon },
    { path: "/reports", label: "Báo cáo", icon: BarChart3 },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <aside className="hidden md:flex md:w-72 md:flex-col border-r border-slate-800/80 bg-slate-900/60 backdrop-blur">
        <div className="px-6 py-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300">
              <BookOpen size={22} />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">Eyna Flashcard</p>
              <p className="text-xs text-slate-400">English Learning Desktop</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-5 space-y-2">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  active
                    ? "bg-sky-500/20 text-sky-200 border border-sky-500/40"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/80">
          <button
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300 transition hover:border-red-400/40 hover:text-red-300 hover:bg-red-500/10 inline-flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto w-full max-w-7xl px-5 py-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
