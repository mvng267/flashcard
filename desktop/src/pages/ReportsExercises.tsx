import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, ClipboardList, Search, XCircle } from "lucide-react";

import { api, getApiError, type ExerciseAttemptDetail, type ExerciseAttemptReportItem } from "../lib/api";

const scoreTone = (score: number) => {
  if (score >= 80) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  if (score >= 50) return "text-sky-400 bg-sky-500/10 border-sky-500/20";
  return "text-orange-400 bg-orange-500/10 border-orange-500/20";
};

const ReportsExercises: React.FC = () => {
  const [attempts, setAttempts] = useState<ExerciseAttemptReportItem[]>([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ExerciseAttemptDetail | null>(null);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const loadAttempts = async () => {
    try {
      setLoading(true);
      setError(null);
      const rows = await api.reportExerciseAttempts(100);
      setAttempts(rows);
      if (rows.length > 0) {
        setSelectedAttemptId(rows[0].attempt_id);
      }
    } catch (err) {
      setError(getApiError(err, "Không tải được danh sách bài tập"));
    } finally {
      setLoading(false);
    }
  };

  const loadAttemptDetail = async (attemptId: number) => {
    try {
      setDetailLoading(true);
      const detail = await api.reportExerciseAttemptDetail(attemptId);
      setSelectedDetail(detail);
    } catch (err) {
      setError(getApiError(err, "Không tải được chi tiết attempt"));
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    void loadAttempts();
  }, []);

  useEffect(() => {
    if (!selectedAttemptId) return;
    void loadAttemptDetail(selectedAttemptId);
  }, [selectedAttemptId]);

  const filteredAttempts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return attempts;
    return attempts.filter((a) =>
      `${a.deck_title} ${a.score_percent} ${new Date(a.created_at).toLocaleDateString("vi-VN")}`.toLowerCase().includes(q),
    );
  }, [attempts, query]);

  if (loading) {
    return <div className="app-card-soft p-6 text-sm text-slate-400">Đang tải lịch sử bài tập...</div>;
  }

  return (
    <div className="app-page">
      <header>
        <h1 className="app-title">Bài tập đã làm</h1>
        <p className="app-subtitle">Xem lại từng attempt: mày chọn đáp án gì, đúng/sai ra sao và điểm số chi tiết.</p>
      </header>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <aside className="app-card p-4">
          <div className="relative mb-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo deck, điểm, ngày..."
              className="app-input pl-9 focus:border-sky-500"
            />
          </div>

          <div className="max-h-[65vh] space-y-2 overflow-y-auto pr-1">
            {filteredAttempts.length === 0 ? (
              <p className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">Không có attempt phù hợp.</p>
            ) : (
              filteredAttempts.map((item) => {
                const active = item.attempt_id === selectedAttemptId;
                return (
                  <button
                    key={item.attempt_id}
                    onClick={() => setSelectedAttemptId(item.attempt_id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-sky-400/40 bg-sky-500/10"
                        : "border-slate-800 bg-slate-950/70 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-100">{item.deck_title}</p>
                        <p className="text-xs text-slate-500 mt-1">{new Date(item.created_at).toLocaleString("vi-VN")}</p>
                      </div>
                      <span className={`rounded-md border px-2 py-1 text-xs font-bold ${scoreTone(item.score_percent)}`}>{item.score_percent}%</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{item.correct_answers}/{item.total_questions} câu đúng</p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="app-card p-5 md:p-6">
          {!selectedAttemptId ? (
            <div className="grid h-[60vh] place-items-center text-slate-500">Chưa chọn attempt nào.</div>
          ) : detailLoading || !selectedDetail ? (
            <div className="grid h-[60vh] place-items-center text-slate-500">Đang tải chi tiết...</div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">Attempt #{selectedDetail.attempt_id}</p>
                    <h2 className="text-xl font-semibold mt-1">{selectedDetail.deck_title}</h2>
                    <p className="text-xs text-slate-500 mt-1">{new Date(selectedDetail.created_at).toLocaleString("vi-VN")}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-center">
                      <p className="text-[10px] text-slate-500 uppercase">Kết quả</p>
                      <p className="text-lg font-bold">{selectedDetail.correct_answers}/{selectedDetail.total_questions}</p>
                    </div>
                    <div className={`rounded-xl border px-4 py-2 text-center ${scoreTone(selectedDetail.score_percent)}`}>
                      <p className="text-[10px] uppercase opacity-70">Điểm</p>
                      <p className="text-lg font-bold">{selectedDetail.score_percent}%</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {selectedDetail.answers.map((ans, idx) => (
                  <article key={`${ans.user_card_id}-${idx}`} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500">
                        <ClipboardList size={14} />
                        Câu {idx + 1} · {ans.question_type === "multiple_choice" ? "Trắc nghiệm" : "Điền từ"}
                      </div>

                      {ans.is_correct ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-300"><CheckCircle2 size={14} /> Đúng</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-300"><XCircle size={14} /> Sai</span>
                      )}
                    </div>

                    <p className="text-sm font-medium text-slate-100">{ans.question_text}</p>
                    <p className="mt-1 text-xs text-slate-500">{ans.prompt_text}</p>

                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      <div className={`rounded-lg border px-3 py-2 text-sm ${ans.is_correct ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100" : "border-red-500/20 bg-red-500/10 text-red-100"}`}>
                        <p className="text-[10px] uppercase opacity-70 mb-1">Bạn chọn</p>
                        <p>{ans.user_answer || <span className="opacity-60">(trống)</span>}</p>
                      </div>
                      <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
                        <p className="text-[10px] uppercase opacity-70 mb-1">Đáp án đúng</p>
                        <p>{ans.correct_answer}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ReportsExercises;
