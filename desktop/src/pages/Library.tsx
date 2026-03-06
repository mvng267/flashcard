import React, { useEffect, useMemo, useState } from "react";
import {
  BookCheck,
  BookOpen,
  Download,
  Flame,
  LayoutGrid,
  Search,
  Sparkles,
  Table2,
  Tag,
  Trophy,
} from "lucide-react";

import { api, getApiError, type LibraryDeck } from "../lib/api";

type TabType = "all" | "installed" | "not-installed";
type ViewMode = "card" | "table";
type LevelFilter = "all" | "A2" | "B1" | "C1";

const levelFilterOptions: Array<{ value: LevelFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "A2", label: "A2" },
  { value: "B1", label: "B1" },
  { value: "C1", label: "C1" },
];

const levelColor: Record<string, string> = {
  A1: "text-emerald-300 bg-emerald-500/10 border-emerald-400/30",
  A2: "text-emerald-300 bg-emerald-500/10 border-emerald-400/30",
  B1: "text-sky-300 bg-sky-500/10 border-sky-400/30",
  B2: "text-sky-300 bg-sky-500/10 border-sky-400/30",
  C1: "text-violet-300 bg-violet-500/10 border-violet-400/30",
  C2: "text-violet-300 bg-violet-500/10 border-violet-400/30",
};

const getDeckMeta = (deck: LibraryDeck) => {
  const title = deck.title.toLowerCase();
  const topic = deck.topic.toLowerCase();

  if (title.includes("ielts") || topic.includes("ielts")) {
    return {
      badge: "Exam Booster",
      note: "Tập trung vào từ học thuật và topic speaking/writing",
      icon: Trophy,
    };
  }

  if (title.includes("business") || topic.includes("business")) {
    return {
      badge: "Career",
      note: "Ứng dụng email, meeting và giao tiếp công việc thực tế",
      icon: Flame,
    };
  }

  if (title.includes("daily") || title.includes("essential") || topic.includes("daily")) {
    return {
      badge: "Daily Life",
      note: "Ưu tiên từ dùng hằng ngày, học nhanh nhớ lâu",
      icon: Sparkles,
    };
  }

  return {
    badge: "General",
    note: "Bộ từ vựng nền tảng để mở rộng vốn từ tổng quát",
    icon: BookOpen,
  };
};

const Library: React.FC = () => {
  const [decks, setDecks] = useState<LibraryDeck[]>([]);
  const [query, setQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [tab, setTab] = useState<TabType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("card");

  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const [installingDeckId, setInstallingDeckId] = useState<number | null>(null);
  const [installedDeckIds, setInstalledDeckIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const loadDecks = async () => {
    try {
      setLoading(true);
      setLoadingError(null);

      const [library, myDecks] = await Promise.all([api.getLibraryDecks(), api.getMyDecks()]);

      const installedFromServer = new Set(
        myDecks
          .filter((d) => typeof d.source_library_deck_id === "number")
          .map((d) => Number(d.source_library_deck_id)),
      );

      setDecks(library);
      setInstalledDeckIds(installedFromServer);
    } catch (error) {
      setLoadingError(getApiError(error, "Không tải được thư viện"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDecks();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const topics = useMemo(() => ["all", ...Array.from(new Set(decks.map((d) => d.topic)))], [decks]);

  const stats = useMemo(() => {
    const total = decks.length;
    const installed = decks.filter((d) => installedDeckIds.has(d.id)).length;
    const pending = Math.max(0, total - installed);
    return { total, installed, pending };
  }, [decks, installedDeckIds]);

  const filtered = useMemo(() => {
    return decks.filter((deck) => {
      const q = query.toLowerCase().trim();
      const hitQuery =
        !q ||
        deck.title.toLowerCase().includes(q) ||
        deck.topic.toLowerCase().includes(q) ||
        deck.tags.toLowerCase().includes(q) ||
        deck.level.toLowerCase().includes(q);

      const hitTopic = topicFilter === "all" || deck.topic === topicFilter;

      const normalizedTags = deck.tags
        .toLowerCase()
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const hitLevel =
        levelFilter === "all" ||
        deck.level.toUpperCase() === levelFilter ||
        normalizedTags.includes(levelFilter.toLowerCase());

      const installed = installedDeckIds.has(deck.id);
      const hitTab =
        tab === "all" || (tab === "installed" && installed) || (tab === "not-installed" && !installed);

      return hitQuery && hitTopic && hitLevel && hitTab;
    });
  }, [decks, query, topicFilter, levelFilter, tab, installedDeckIds]);

  const installDeck = async (deck: LibraryDeck) => {
    try {
      setInstallingDeckId(deck.id);
      const result = await api.installLibraryDeck(deck.id);

      setInstalledDeckIds((prev) => {
        const next = new Set(prev);
        next.add(deck.id);
        return next;
      });

      if (result.already_installed) {
        setToast(`"${deck.title}" đã có sẵn trong thư viện của mày.`);
      } else {
        setToast(`Đã cài "${deck.title}" (${result.installed_cards} thẻ).`);
      }
    } catch (error) {
      setToast(getApiError(error, `Cài "${deck.title}" thất bại`));
    } finally {
      setInstallingDeckId(null);
    }
  };

  const renderInstallButton = (deck: LibraryDeck, compact = false) => {
    const isInstalled = installedDeckIds.has(deck.id);
    const isInstalling = installingDeckId === deck.id;

    return (
      <button
        onClick={() => void installDeck(deck)}
        disabled={isInstalling}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all ${
          compact ? "px-3 py-2 text-xs" : "mt-5 w-full px-4 py-2.5 text-sm"
        } ${
          isInstalled
            ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20"
            : "bg-sky-500 text-slate-950 hover:bg-sky-400"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <Download size={compact ? 14 : 16} />
        {isInstalling ? "Đang cài..." : isInstalled ? "Đã cài vào thư viện" : "Cài bộ thẻ"}
      </button>
    );
  };

  return (
    <div className="space-y-7 animate-fade-up">
      <header className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Thư viện flashcard</h1>
            <p className="mt-2 text-sm text-slate-400 max-w-2xl">
              Kho deck học tiếng Anh theo chủ đề. Mày có thể phân biệt rõ deck đã cài/chưa cài, lọc nhanh theo
              trình độ và cài một chạm.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <StatPill label="Tổng deck" value={stats.total} icon={<BookOpen size={13} />} />
            <StatPill label="Đã cài" value={stats.installed} icon={<BookCheck size={13} />} tone="sky" />
            <StatPill label="Chưa cài" value={stats.pending} icon={<Download size={13} />} tone="amber" />
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo tên deck, topic, tag..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-9 py-2.5 text-sm outline-none focus:border-sky-400"
              />
            </label>

            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm outline-none focus:border-sky-400"
            >
              {topics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic === "all" ? "Tất cả chủ đề" : topic}
                </option>
              ))}
            </select>

            <div className="inline-flex rounded-xl border border-slate-700 bg-slate-950 p-1 text-xs self-start">
              <FilterBtn active={viewMode === "card"} onClick={() => setViewMode("card")}>
                <LayoutGrid size={13} /> Thẻ
              </FilterBtn>
              <FilterBtn active={viewMode === "table"} onClick={() => setViewMode("table")}>
                <Table2 size={13} /> Bảng
              </FilterBtn>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex rounded-xl border border-slate-700 bg-slate-950 p-1 text-xs w-fit">
              <FilterBtn active={tab === "all"} onClick={() => setTab("all")}>
                Tất cả
              </FilterBtn>
              <FilterBtn active={tab === "installed"} onClick={() => setTab("installed")}>
                Đã cài
              </FilterBtn>
              <FilterBtn active={tab === "not-installed"} onClick={() => setTab("not-installed")}>
                Chưa cài
              </FilterBtn>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">Lọc thẻ:</span>
              {levelFilterOptions.map((opt) => {
                const active = levelFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLevelFilter(opt.value)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      active
                        ? "border-sky-400/50 bg-sky-500/15 text-sky-200"
                        : "border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {loading && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-sm text-slate-400">Đang tải thư viện...</div>
      )}

      {loadingError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {loadingError}
          <button
            onClick={() => void loadDecks()}
            className="ml-3 rounded-md border border-red-400/40 px-2 py-1 text-xs hover:bg-red-500/10"
          >
            Thử lại
          </button>
        </div>
      )}

      {!loading && !loadingError && viewMode === "card" && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((deck, idx) => {
            const isInstalled = installedDeckIds.has(deck.id);
            const meta = getDeckMeta(deck);
            const MetaIcon = meta.icon;

            return (
              <article
                key={deck.id}
                className="group rounded-2xl border border-slate-800 bg-slate-900/65 p-5 transition-all hover:-translate-y-1 hover:border-slate-700 hover:shadow-[0_10px_30px_rgba(15,23,42,0.4)] animate-fade-up"
                style={{ animationDelay: `${Math.min(idx * 35, 300)}ms` }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                      levelColor[deck.level] || "text-slate-200 bg-slate-700/30 border-slate-600"
                    }`}
                  >
                    <Tag size={11} /> {deck.level}
                  </span>

                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      isInstalled
                        ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300 animate-soft-pulse"
                        : "border-amber-400/40 bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {isInstalled ? "Đã cài" : "Chưa cài"}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-slate-100">{deck.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-slate-400">{deck.description || "Bộ thẻ học tiếng Anh chất lượng cao."}</p>

                <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 p-2.5 text-xs text-slate-400">
                  <div className="mb-1 flex items-center gap-1.5 text-slate-300">
                    <MetaIcon size={13} /> {meta.badge}
                  </div>
                  <p>{meta.note}</p>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>{deck.card_count} thẻ</span>
                  <span>{deck.estimated_minutes} phút</span>
                  <span>{deck.topic}</span>
                </div>

                {renderInstallButton(deck)}
              </article>
            );
          })}
        </section>
      )}

      {!loading && !loadingError && viewMode === "table" && (
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/65">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                  <th className="px-4 py-3 font-medium">Bộ thẻ</th>
                  <th className="px-4 py-3 font-medium">Level</th>
                  <th className="px-4 py-3 font-medium">Chủ đề</th>
                  <th className="px-4 py-3 font-medium">Số thẻ</th>
                  <th className="px-4 py-3 font-medium">Thời lượng</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 font-medium text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filtered.map((deck) => {
                  const isInstalled = installedDeckIds.has(deck.id);

                  return (
                    <tr key={deck.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-100">{deck.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-400">{deck.description || "Bộ thẻ học tiếng Anh chất lượng cao."}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                            levelColor[deck.level] || "text-slate-200 bg-slate-700/30 border-slate-600"
                          }`}
                        >
                          <Tag size={11} /> {deck.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{deck.topic}</td>
                      <td className="px-4 py-3 text-slate-300">{deck.card_count}</td>
                      <td className="px-4 py-3 text-slate-300">{deck.estimated_minutes} phút</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            isInstalled
                              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                              : "border-amber-400/40 bg-amber-500/10 text-amber-300"
                          }`}
                        >
                          {isInstalled ? "Đã cài" : "Chưa cài"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{renderInstallButton(deck, true)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!loading && !loadingError && filtered.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">Không tìm thấy bộ thẻ phù hợp với bộ lọc hiện tại.</div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 shadow-2xl animate-fade-up">
          {toast}
        </div>
      )}
    </div>
  );
};

const FilterBtn: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  active,
  onClick,
  children,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
        active ? "bg-sky-500 text-slate-950 font-semibold" : "text-slate-300 hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
};

const StatPill: React.FC<{ label: string; value: number; icon: React.ReactNode; tone?: "default" | "sky" | "amber" }> = ({
  label,
  value,
  icon,
  tone = "default",
}) => {
  const toneClass =
    tone === "sky"
      ? "border-sky-400/30 bg-sky-500/10 text-sky-200"
      : tone === "amber"
        ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
        : "border-slate-700 bg-slate-900 text-slate-200";

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClass}`}>
      <div className="mb-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider opacity-80">
        {icon}
        {label}
      </div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
};

export default Library;
