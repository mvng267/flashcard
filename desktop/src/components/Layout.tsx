import React from "react";
import {
  BarChart3,
  BookCheck,
  BookOpen,
  Flame,
  Library as LibraryIcon,
  LogOut,
  MessageCircle,
  Moon,
  Sparkles,
  Sun,
} from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { useUiPreferences } from "../contexts/UiPreferencesContext";
import { getAvatarUrl } from "../lib/avatar";

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const {
    theme,
    widthMode,
    contentWidth,
    effects,
    setTheme,
    setWidthMode,
    setContentWidth,
    setEffects,
    resetUi,
  } = useUiPreferences();

  const navItems = [
    { path: "/", label: "Flashcard", icon: BookCheck },
    { path: "/library", label: "Thư viện", icon: LibraryIcon },
    { path: "/social", label: "Social", icon: Sparkles },
    { path: "/messages", label: "Tin nhắn", icon: MessageCircle },
    { path: "/streak", label: "Streak", icon: Flame },
    { path: "/reports", label: "Báo cáo", icon: BarChart3 },
  ];

  const fullScreenStudy = location.pathname.startsWith("/study/");

  const contentShellStyle: React.CSSProperties =
    widthMode === "full"
      ? { maxWidth: "100%" }
      : { maxWidth: `${contentWidth}px` };

  const studyShellStyle: React.CSSProperties | undefined =
    widthMode === "full"
      ? undefined
      : { maxWidth: `${Math.min(1880, contentWidth + 180)}px`, margin: "0 auto" };

  const reserveTrafficLightSpace = React.useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const isElectron = navigator.userAgent.toLowerCase().includes("electron");
    const isMac = navigator.platform.toLowerCase().includes("mac");
    return isElectron && isMac;
  }, []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) return;

      const key = event.key.toLowerCase();

      if (event.shiftKey && key === "t") {
        event.preventDefault();
        setTheme(theme === "dark" ? "light" : "dark");
        return;
      }

      if (event.shiftKey && key === "w") {
        event.preventDefault();
        setWidthMode(widthMode === "full" ? "contained" : "full");
        return;
      }

      if (event.shiftKey && key === "e") {
        event.preventDefault();
        const order = ["off", "low", "high"] as const;
        const idx = order.indexOf(effects);
        setEffects(order[(idx + 1) % order.length]);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [theme, widthMode, effects, setTheme, setWidthMode, setEffects]);

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <header className="window-toolbar border-b">
        <div
          className={`window-toolbar-inner window-drag ${reserveTrafficLightSpace ? "with-traffic-lights" : ""}`}
        >
          <div className="window-no-drag hidden items-center gap-2 text-[11px] font-semibold text-slate-400 lg:flex">
            <span>UI</span>
            <span className="opacity-60">Shift+T/W/E</span>
          </div>

          <div className="window-no-drag flex items-center gap-1 rounded-xl border border-slate-700/70 bg-slate-900/70 p-1">
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
                theme === "dark"
                  ? "bg-sky-500/20 text-sky-200"
                  : "text-slate-300 hover:bg-slate-800/70"
              }`}
              title="Dark mode"
            >
              <Moon size={13} />
              Dark
            </button>
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
                theme === "light"
                  ? "bg-sky-500/20 text-sky-200"
                  : "text-slate-300 hover:bg-slate-800/70"
              }`}
              title="Light mode"
            >
              <Sun size={13} />
              Light
            </button>
          </div>

          <div className="window-no-drag flex items-center gap-1 rounded-xl border border-slate-700/70 bg-slate-900/70 p-1">
            <button
              type="button"
              onClick={() => setWidthMode("contained")}
              className={`rounded-lg px-2 py-1 text-xs font-medium transition ${
                widthMode === "contained"
                  ? "bg-sky-500/20 text-sky-200"
                  : "text-slate-300 hover:bg-slate-800/70"
              }`}
            >
              Contained
            </button>
            <button
              type="button"
              onClick={() => setWidthMode("full")}
              className={`rounded-lg px-2 py-1 text-xs font-medium transition ${
                widthMode === "full"
                  ? "bg-sky-500/20 text-sky-200"
                  : "text-slate-300 hover:bg-slate-800/70"
              }`}
            >
              Full
            </button>
          </div>

          <label className="window-no-drag hidden items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900/70 px-2 py-1 text-xs text-slate-300 md:flex">
            <span className="whitespace-nowrap text-[11px] text-slate-400">Width</span>
            <input
              type="range"
              min={1080}
              max={2200}
              step={10}
              value={contentWidth}
              disabled={widthMode === "full"}
              onChange={(e) => setContentWidth(Number(e.target.value))}
              className="w-24 accent-sky-400 disabled:opacity-40 lg:w-36"
            />
            <strong className="w-[56px] text-right text-[11px] text-slate-200">{contentWidth}px</strong>
          </label>

          <div className="window-no-drag hidden items-center gap-1 rounded-xl border border-slate-700/70 bg-slate-900/70 p-1 sm:flex">
            {(["off", "low", "high"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setEffects(level)}
                className={`rounded-lg px-2 py-1 text-[11px] font-semibold uppercase transition ${
                  effects === level
                    ? "bg-sky-500/20 text-sky-200"
                    : "text-slate-300 hover:bg-slate-800/70"
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={resetUi}
            className="window-no-drag ml-auto rounded-lg border border-slate-700/80 bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
          >
            Reset UI
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {!fullScreenStudy && (
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
                const active =
                  location.pathname === item.path ||
                  (item.path === "/messages" && location.pathname.startsWith("/messages"));
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

            <div className="p-4 border-t border-slate-800/80 space-y-2">
              <Link
                to="/profile"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent"
              >
                <div className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                  <img
                    src={user?.avatar_url || getAvatarUrl(user?.avatar_seed, user?.username || "user")}
                    alt="avatar"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.src = getAvatarUrl(user?.username || "user");
                    }}
                  />
                </div>
                <span className="flex-1 truncate">{user?.full_name || "Hồ sơ"}</span>
              </Link>
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
        )}

        <main className={`relative min-h-0 flex-1 ${fullScreenStudy ? "overflow-hidden" : "overflow-y-auto scrollbar-thin"}`}>
          {fullScreenStudy ? (
            <div className="h-full w-full px-2 py-2 md:px-3 md:py-3 overflow-hidden transition-all duration-300" style={studyShellStyle}>
              <Outlet />
            </div>
          ) : (
            <div className="app-content-shell mx-auto w-full px-5 py-6 md:px-8 md:py-8 transition-all duration-300" style={contentShellStyle}>
              <Outlet />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Layout;
