import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BookCheck,
  BookOpen,
  ChartNoAxesCombined,
  CheckCircle2,
  Clock3,
  Filter,
  LayoutGrid,
  Play,
  Search,
  Share2,
  SlidersHorizontal,
  Table2,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { api, getApiError, type ReportDetailed, type UserDeck } from "../lib/api";

type ViewMode = "card" | "table";
type StatusFilter = "all" | "pending" | "done";
type SortMode = "pending-first" | "title-asc" | "accuracy-desc";

type DeckBreakdown = ReportDetailed["deck_breakdown"][number];
type DeckRow = {
  deck: UserDeck;
  done: boolean;
  report?: DeckBreakdown;
};

type RemoveState = {
  open: boolean;
  deckId: number | null;
  deckTitle: string;
  loading: boolean;
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const [decks, setDecks] = useState<UserDeck[]>([]);
  const [detailedReport, setDetailedReport] = useState<ReportDetailed | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [sortMode, setSortMode] = useState<SortMode>("pending-first");
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [removeState, setRemoveState] = useState<RemoveState>({
    open: false,
    deckId: null,
    deckTitle: "",
    loading: false,
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const [deckResult, reportResult] = await Promise.allSettled([
      api.getMyDecks(),
      api.reportsDetailed(30),
    ]);

    if (deckResult.status === "rejected") {
      setError(getApiError(deckResult.reason, "Không tải được danh sách flashcard"));
      setDecks([]);
    } else {
      setDecks(deckResult.value);
    }

    if (reportResult.status === "fulfilled") {
      setDetailedReport(reportResult.value);
    } else {
      setDetailedReport(null);
    }

    setLoading(false);
  };

  const openRemoveModal = (deck: UserDeck) => {
    setRemoveState({
      open: true,
      deckId: deck.id,
      deckTitle: deck.title,
      loading: false,
    });
  };

  const closeRemoveModal = () => {
    setRemoveState((prev) => (prev.loading ? prev : { ...prev, open: false, deckId: null, deckTitle: "" }));
  };

  const confirmRemoveDeck = async () => {
    if (!removeState.deckId) return;

    try {
      setRemoveState((prev) => ({ ...prev, loading: true }));
      await api.deleteDeck(removeState.deckId);
      setDecks((prev) => prev.filter((d) => d.id !== removeState.deckId));
      setDetailedReport((prev) =>
        prev
          ? {
              ...prev,
              deck_breakdown: prev.deck_breakdown.filter((item) => item.deck_id !== removeState.deckId),
            }
          : prev,
      );
      setRemoveState({ open: false, deckId: null, deckTitle: "", loading: false });
    } catch (error) {
      setError(getApiError(error, "Gỡ deck thất bại"));
      setRemoveState((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const reportByDeckId = useMemo(() => {
    const map = new Map<number, DeckBreakdown>();
    detailedReport?.deck_breakdown.forEach((item) => {
      map.set(item.deck_id, item);
    });
    return map;
  }, [detailedReport]);

  const topics = useMemo(() => {
    return ["all", ...Array.from(new Set(decks.map((deck) => deck.topic))).sort((a, b) => a.localeCompare(b))];
  }, [decks]);

  const levels = useMemo(() => {
    return ["all", ...Array.from(new Set(decks.map((deck) => deck.level))).sort((a, b) => a.localeCompare(b))];
  }, [decks]);

  const stats = useMemo(() => {
    const total = decks.length;
    const done = decks.filter((deck) => deck.due_cards === 0).length;
    const pending = total - done;
    const dueCards = decks.reduce((sum, deck) => sum + deck.due_cards, 0);
    return { total, done, pending, dueCards };
  }, [decks]);

  const rows = useMemo<DeckRow[]>(() => {
    const q = query.trim().toLowerCase();

    const filtered = decks
      .map((deck) => {
        const done = deck.due_cards === 0;
        return {
          deck,
          done,
          report: reportByDeckId.get(deck.id),
        };
      })
      .filter((row) => {
        const hitQuery =
          !q ||
          row.deck.title.toLowerCase().includes(q) ||
          row.deck.description.toLowerCase().includes(q) ||
          row.deck.topic.toLowerCase().includes(q) ||
          row.deck.level.toLowerCase().includes(q);

        const hitTopic = topicFilter === "all" || row.deck.topic === topicFilter;
        const hitLevel = levelFilter === "all" || row.deck.level === levelFilter;

        const hitStatus =
          statusFilter === "all" || (statusFilter === "done" && row.done) || (statusFilter === "pending" && !row.done);

        return hitQuery && hitTopic && hitLevel && hitStatus;
      });

    const cloned = [...filtered];

    if (sortMode === "title-asc") {
      cloned.sort((a, b) => a.deck.title.localeCompare(b.deck.title));
    } else if (sortMode === "accuracy-desc") {
      cloned.sort((a, b) => (b.report?.accuracy_percent || 0) - (a.report?.accuracy_percent || 0));
    } else {
      cloned.sort((a, b) => {
        const statusOrder = Number(a.done) - Number(b.done);
        if (statusOrder !== 0) return statusOrder;
        if (!a.done && !b.done) return b.deck.due_cards - a.deck.due_cards;
        return a.deck.title.localeCompare(b.deck.title);
      });
    }

    return cloned;
  }, [decks, levelFilter, query, reportByDeckId, sortMode, statusFilter, topicFilter]);

  const pendingRows = useMemo(() => rows.filter((row) => !row.done), [rows]);
  const doneRows = useMemo(() => rows.filter((row) => row.done), [rows]);

  const hasActiveFilters =
    query.trim() !== "" || topicFilter !== "all" || levelFilter !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    setQuery("");
    setTopicFilter("all");
    setLevelFilter("all");
    setStatusFilter("all");
    setSortMode("pending-first");
  };

  return (
    <div className="app-page">
      <header className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/45 p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Flashcard của mày</h1>
            <p className="mt-1 text-xs md:text-sm text-slate-400 max-w-2xl">
              Quản lý deck đã cài và theo dõi tiến độ học trong ngày.
            </p>
          </div>

          <div className="inline-flex w-fit rounded-xl border border-slate-700 bg-slate-950 p-1 text-xs">
            <ModeButton active={viewMode === "card"} onClick={() => setViewMode("card")}>
              <LayoutGrid size={14} /> Thẻ
            </ModeButton>
            <ModeButton active={viewMode === "table"} onClick={() => setViewMode("table")}>
              <Table2 size={14} /> Bảng
            </ModeButton>
          </div>
        </div>
      </header>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Tổng deck đã cài" value={stats.total} icon={<BookOpen size={16} />} tone="slate" />
        <MetricCard title="Chưa làm hôm nay" value={stats.pending} icon={<Clock3 size={16} />} tone="amber" />
        <MetricCard title="Đã làm hôm nay" value={stats.done} icon={<BookCheck size={16} />} tone="emerald" />
        <MetricCard title="Tổng thẻ đến hạn" value={stats.dueCards} icon={<Target size={16} />} tone="sky" />
      </section>

      <section className="app-card p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="relative min-w-[320px] flex-[2] max-w-3xl">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm deck..."
              className="app-input h-11 px-10 text-sm md:text-[15px] focus:border-indigo-400"
            />
          </label>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilterPopover((prev) => !prev)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
            >
              <SlidersHorizontal size={15} /> Lọc
              {hasActiveFilters ? <span className="h-2 w-2 rounded-full bg-sky-400" /> : null}
            </button>

            {showFilterPopover && (
              <div className="absolute right-0 top-12 z-40 w-[330px] rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-2xl">
                <div className="grid gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="app-input h-9 px-3 text-sm focus:border-indigo-400"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="pending">Chưa làm hôm nay</option>
                    <option value="done">Đã làm hôm nay</option>
                  </select>

                  <select
                    value={topicFilter}
                    onChange={(e) => setTopicFilter(e.target.value)}
                    className="app-input h-10 px-3 text-sm font-medium focus:border-indigo-400"
                  >
                    {topics.map((topic) => (
                      <option key={topic} value={topic}>
                        {topic === "all" ? "Tất cả chủ đề" : topic}
                      </option>
                    ))}
                  </select>

                  <select
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                    className="app-input h-9 px-3 text-sm focus:border-indigo-400"
                  >
                    {levels.map((level) => (
                      <option key={level} value={level}>
                        {level === "all" ? "Tất cả level" : level}
                      </option>
                    ))}
                  </select>

                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as SortMode)}
                    className="app-input h-9 px-3 text-sm focus:border-indigo-400"
                  >
                    <option value="pending-first">Ưu tiên deck chưa làm</option>
                    <option value="title-asc">Sắp theo tên A-Z</option>
                    <option value="accuracy-desc">Sắp theo độ chính xác</option>
                  </select>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    <X size={12} /> Reset
                  </button>
                  <button
                    onClick={() => setShowFilterPopover(false)}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
                  >
                    <CheckCircle2 size={12} /> Xong
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={14} /> Reset
          </button>

          <div className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-300">
            <Filter size={12} /> {rows.length}/{decks.length}
          </div>
        </div>
      </section>

      {loading && (
        <div className="app-card-soft p-5 text-sm text-slate-400">Đang tải flashcard...</div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
          <button
            onClick={() => void loadData()}
            className="ml-3 rounded-md border border-red-400/40 px-2 py-1 text-xs hover:bg-red-500/10"
          >
            Thử lại
          </button>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
          <div className="inline-flex items-center gap-2 text-slate-300">
            <AlertCircle size={16} className="text-amber-300" />
            Không có deck nào khớp bộ lọc hiện tại.
          </div>
        </div>
      )}

      {!loading && !error && rows.length > 0 && viewMode === "card" && (
        <div className="space-y-4">
          {(statusFilter === "all" || statusFilter === "pending") && (
            <DeckSection
              title="Chưa làm hôm nay"
              subtitle="Ưu tiên xử lý các deck còn thẻ đến hạn."
              rows={pendingRows}
              emptyMessage="Không còn deck nào chưa làm."
              tone="amber"
              onNavigate={navigate}
              onOpenSettings={openRemoveModal}
            />
          )}

          {(statusFilter === "all" || statusFilter === "done") && (
            <DeckSection
              title="Đã làm hôm nay"
              subtitle="Deck đã hoàn tất hôm nay có báo cáo nhanh ngay trên thẻ."
              rows={doneRows}
              emptyMessage="Chưa có deck nào hoàn tất hôm nay."
              tone="emerald"
              onNavigate={navigate}
              withReport
              onOpenSettings={openRemoveModal}
            />
          )}
        </div>
      )}

      {!loading && !error && rows.length > 0 && viewMode === "table" && (
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-900/60 shadow-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-300">
                  <th className="px-4 py-3 font-semibold">Deck</th>
                  <th className="px-4 py-3 font-semibold">Topic / Level</th>
                  <th className="px-4 py-3 font-semibold">Tổng thẻ</th>
                  <th className="px-4 py-3 font-semibold">Đến hạn</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Báo cáo nhanh</th>
                  <th className="px-4 py-3 font-semibold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {rows.map((row) => {
                  const { deck, done, report } = row;

                  return (
                    <tr key={deck.id} className="hover:bg-slate-800/45 transition-colors duration-150">
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-indigo-300">
                            <BookOpen size={14} />
                          </span>
                          <p className="font-semibold text-slate-100">{deck.title}</p>
                        </div>
                        <p className="mt-1 line-clamp-2 pl-9 text-xs text-slate-400">{deck.description || "Không có mô tả"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-xs text-slate-300">{deck.topic}</span>
                          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs text-sky-300">{deck.level}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{deck.total_cards}</td>
                      <td className="px-4 py-3 text-slate-300">{deck.due_cards}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                            done
                              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                              : "border-amber-400/40 bg-amber-500/10 text-amber-300"
                          }`}
                        >
                          {done ? "Đã làm" : "Chưa làm"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {done ? (
                          report ? (
                            <div className="space-y-1.5 text-[11px]">
                              <div className="flex justify-between text-slate-400 mb-0.5">
                                <span>Lượt học: {report.study_sessions}</span>
                                <span>Bài tập: {report.exercise_attempts}</span>
                              </div>
                              <SimpleProgress label="Độ chính xác" value={report.accuracy_percent} color="sky" />
                              <SimpleProgress
                                label="Điểm bài tập"
                                value={Math.round(report.exercise_average_score || 0)}
                                color="violet"
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">Chưa có dữ liệu</span>
                          )
                        ) : (
                          <span className="text-xs text-slate-500">Hiện khi hoàn tất</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => navigate(`/study/${deck.id}?mode=${done ? "practice" : "due"}`)}
                            className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                          >
                            {done ? "Luyện" : "Học"}
                          </button>
                          <button
                            onClick={() => navigate(`/study/${deck.id}?mode=exercise`)}
                            disabled={!done}
                            title={!done ? "Học flashcard trước rồi mới làm bài tập" : undefined}
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                              done
                                ? "bg-indigo-500 text-white hover:bg-indigo-400"
                                : "cursor-not-allowed border border-slate-700 bg-slate-900 text-slate-500"
                            }`}
                          >
                            Bài tập
                          </button>
                          <button
                            onClick={() => openRemoveModal(deck)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/20"
                          >
                            <Trash2 size={12} /> Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {removeState.open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-100">Gỡ bộ thẻ khỏi tài khoản?</h3>
            <p className="mt-2 text-sm text-slate-400">
              Bộ thẻ <b className="text-slate-200">{removeState.deckTitle}</b> sẽ bị ẩn khỏi Dashboard.
              Log học tập tổng vẫn giữ lại.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeRemoveModal}
                disabled={removeState.loading}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={() => void confirmRemoveDeck()}
                disabled={removeState.loading}
                className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
              >
                <Trash2 size={14} /> {removeState.loading ? "Đang gỡ..." : "Xác nhận gỡ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

type DeckSectionProps = {
  title: string;
  subtitle: string;
  rows: DeckRow[];
  emptyMessage: string;
  tone: "amber" | "emerald";
  withReport?: boolean;
  onNavigate: ReturnType<typeof useNavigate>;
  onOpenSettings: (deck: UserDeck) => void;
};

const DeckSection: React.FC<DeckSectionProps> = ({
  title,
  subtitle,
  rows,
  emptyMessage,
  tone,
  withReport = false,
  onNavigate,
  onOpenSettings,
}) => {
  return (
    <section className="space-y-2.5">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
        </div>
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
            tone === "amber"
              ? "border-amber-400/40 bg-amber-500/10 text-amber-300"
              : "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {rows.length} deck
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">{emptyMessage}</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <DeckCard key={row.deck.id} row={row} withReport={withReport} onNavigate={onNavigate} onOpenSettings={onOpenSettings} />
          ))}
        </div>
      )}
    </section>
  );
};

const DeckCard: React.FC<{
  row: DeckRow;
  withReport: boolean;
  onNavigate: ReturnType<typeof useNavigate>;
  onOpenSettings: (deck: UserDeck) => void;
}> = ({ row, withReport, onNavigate, onOpenSettings }) => {
  const { deck, done, report } = row;

  return (
    <article
      className={`rounded-2xl border p-3.5 transition hover:-translate-y-0.5 ${
        done
          ? "border-emerald-500/25 bg-gradient-to-b from-slate-900/75 to-emerald-950/20"
          : "border-amber-500/25 bg-gradient-to-b from-slate-900/75 to-amber-950/20"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
            done
              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
              : "border-amber-400/40 bg-amber-500/10 text-amber-300"
          }`}
        >
          {done ? "Đã làm hôm nay" : "Chưa làm hôm nay"}
        </span>
        <span className="text-xs text-slate-500">
          {deck.due_cards}/{deck.total_cards} đến hạn
        </span>
      </div>

      <h3 className="text-lg font-semibold text-slate-100">{deck.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-slate-400">{deck.description || "Không có mô tả"}</p>

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
        <span className="rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1">{deck.topic}</span>
        <span className="rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1">{deck.level}</span>
      </div>

      {withReport && done && (
        <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-emerald-200">
            <ChartNoAxesCombined size={14} /> Báo cáo nhanh 30 ngày
          </div>

          {report ? (
            <>
              <DoneMiniChart report={report} />
                <div className="mt-2 grid grid-cols-4 gap-1.5 text-[11px] text-slate-300">
                  <InfoPill label="Học" value={`${report.study_sessions}`} />
                  <InfoPill label="Ôn tập" value={`${report.review_count}`} />
                  <InfoPill label="Acc" value={`${report.accuracy_percent}%`} />
                  <InfoPill label="Bài tập" value={`${report.exercise_attempts}`} />
                </div>
            </>
          ) : (
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-400">
              Chưa đủ dữ liệu để vẽ chart cho deck này.
            </div>
          )}
        </div>
      )}

      {!done && (
        <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-xs text-amber-200">
          Còn <b>{deck.due_cards}</b> thẻ chưa xử lý hôm nay.
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => onNavigate(`/study/${deck.id}?mode=${done ? "practice" : "due"}`)}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-700 px-2 py-2 text-xs text-slate-200 hover:bg-slate-800"
        >
          <Play size={13} /> {done ? "Luyện" : "Học"}
        </button>
        <button
          onClick={() => onNavigate(`/study/${deck.id}?mode=exercise`)}
          disabled={!done}
          title={!done ? "Học flashcard trước rồi mới làm bài tập" : undefined}
          className={`rounded-lg px-2 py-2 text-xs font-semibold ${
            done
              ? "bg-indigo-500 text-white hover:bg-indigo-400"
              : "cursor-not-allowed border border-slate-700 bg-slate-900 text-slate-500"
          }`}
        >
          Bài tập
        </button>
        <button
          onClick={() => onNavigate(`/social?share_deck_id=${deck.id}`)}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-300 hover:text-sky-300 transition"
        >
          <Share2 size={13} /> Share
        </button>
        <button
          onClick={() => onOpenSettings(deck)}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-2 text-xs text-red-300 hover:bg-red-500/20"
        >
          <Trash2 size={13} /> Xóa
        </button>
      </div>
    </article>
  );
};

const DoneMiniChart: React.FC<{ report: DeckBreakdown }> = ({ report }) => {
  const chartData = [
    { key: "Ôn tập", value: Math.max(0, Math.min(100, report.accuracy_percent)) },
    {
      key: "Bài tập",
      value: Math.max(0, Math.min(100, Math.round(report.exercise_average_score || 0))),
    },
  ];

  return (
    <div className="h-24 w-full rounded-lg border border-slate-700/70 bg-slate-950/60 px-2 py-1.5">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 6, right: 2, left: -20, bottom: -8 }}>
          <XAxis dataKey="key" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis hide domain={[0, 100]} />
          <Tooltip
            cursor={{ fill: "rgba(30,41,59,0.45)" }}
            contentStyle={{
              background: "#020617",
              border: "1px solid #334155",
              borderRadius: "10px",
              color: "#e2e8f0",
              fontSize: "12px",
            }}
            formatter={(value: number) => [`${value}%`, "Điểm"]}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.key} fill={entry.key === "Ôn tập" ? "#38bdf8" : "#a78bfa"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const SimpleProgress: React.FC<{ label: string; value: number; color: "sky" | "violet" }> = ({
  label,
  value,
  color,
}) => {
  const safe = Math.max(0, Math.min(100, Math.round(value || 0)));
  const barColor = color === "sky" ? "bg-sky-500" : "bg-violet-500";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-slate-300">
        <span>{label}</span>
        <span>{safe}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
};

const InfoPill: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/80 px-2 py-1 text-center">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-100">{value}</p>
    </div>
  );
};

const ModeButton: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
        active ? "bg-indigo-500 text-white font-semibold" : "text-slate-300 hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  tone: "slate" | "amber" | "emerald" | "sky";
}> = ({ title, value, icon, tone }) => {
  const toneClass: Record<string, string> = {
    slate: "border-slate-700 bg-slate-900/70 text-slate-200",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-200",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    sky: "border-sky-400/20 bg-sky-500/10 text-sky-200",
  };

  return (
    <div className={`rounded-2xl border p-4 ${toneClass[tone]}`}>
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-current/20">{icon}</div>
      <p className="mt-3 text-sm opacity-80">{title}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
};

export default Dashboard;
