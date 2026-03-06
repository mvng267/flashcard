import React, { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Flame,
  PieChart as PieIcon,
  Target,
} from "lucide-react";

import { api, getApiError, type ReportDetailed, type ReportOverview } from "../lib/api";

const Reports: React.FC = () => {
  const [overview, setOverview] = useState<ReportOverview | null>(null);
  const [detailed, setDetailed] = useState<ReportDetailed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ov, det] = await Promise.all([api.reportsOverview(30), api.reportsDetailed(30)]);
      setOverview(ov);
      setDetailed(det);
    } catch (err) {
      setError(getApiError(err, "Không tải được dữ liệu báo cáo"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40">
        <div className="text-center">
          <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent mx-auto"></div>
          <p className="text-sm text-slate-400">Đang tổng hợp báo cáo chi tiết...</p>
        </div>
      </div>
    );
  }

  if (error || !overview || !detailed) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">{error || "Lỗi dữ liệu"}</div>
        <button onClick={() => void loadData()} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200">
          Thử lại
        </button>
      </div>
    );
  }

  const chartData = overview.daily_activity.map((item) => {
    const date = new Date(item.date);
    return { ...item, label: `${date.getDate()}/${date.getMonth() + 1}` };
  });

  const ratingData = detailed.rating_breakdown.map((r) => ({
    name: r.rating.charAt(0).toUpperCase() + r.rating.slice(1),
    value: r.count,
  }));

  const COLORS = ["#f87171", "#fb923c", "#38bdf8", "#34d399"];

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Phân tích học tập</h1>
        <p className="mt-2 text-sm text-slate-400">Báo cáo chi tiết hiệu suất flashcard và bài tập trong 30 ngày qua.</p>
      </header>

      {/* Tóm tắt nhanh */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric title="Độ chính xác" value={`${overview.accuracy_percent}%`} icon={<Target size={16} />} tone="sky" />
        <Metric title="Lượt ôn tập" value={`${overview.total_reviews}`} icon={<Activity size={16} />} tone="emerald" />
        <Metric title="Streak" value={`${overview.streak_days} ngày`} icon={<Flame size={16} />} tone="orange" />
        <Metric title="Bài tập đã làm" value={`${overview.exercise_attempts}`} icon={<Award size={16} />} tone="violet" />
        <Metric title="Điểm bài tập TB" value={`${overview.exercise_average_score}%`} icon={<Target size={16} />} tone="sky" />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Biểu đồ hoạt động */}
        <article className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold">
            <CalendarDays size={18} className="text-sky-400" />
            Tần suất ôn luyện
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "12px", color: "#f1f5f9" }}
                />
                <Line type="monotone" dataKey="reviews" name="Lượt ôn" stroke="#38bdf8" strokeWidth={3} dot={{ r: 3, fill: "#38bdf8" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Tỉ lệ đánh giá */}
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold">
            <PieIcon size={18} className="text-violet-400" />
            Phân bố ghi nhớ
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={ratingData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {ratingData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-wider text-slate-500">
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-red-400" /> Again</div>
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-orange-400" /> Hard</div>
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-sky-400" /> Good</div>
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-400" /> Easy</div>
          </div>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hiệu suất theo bộ thẻ */}
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="mb-5 text-lg font-semibold">Hiệu suất theo bộ thẻ</h3>
          <div className="space-y-4">
            {detailed.deck_breakdown.map((d) => (
              <div key={d.deck_id} className="group rounded-xl border border-slate-800/50 bg-slate-950/40 p-4 transition hover:border-slate-700">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-medium text-slate-200">{d.deck_title}</span>
                  <span className="text-xs font-bold text-sky-400">{d.accuracy_percent}% acc</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-500">
                  <div>Thẻ: <b>{d.total_cards}</b></div>
                  <div>Ôn: <b>{d.review_count}</b></div>
                  <div>Bài tập: <b>{d.exercise_attempts}</b></div>
                </div>
                <div className="mt-3 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-sky-500 transition-all" style={{ width: `${d.accuracy_percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        {/* Thẻ hay sai nhất */}
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-red-400">
            <AlertTriangle size={18} />
            Thẻ cần chú ý (Hay sai)
          </h3>
          <div className="divide-y divide-slate-800/50">
            {detailed.weak_cards.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500 italic">Mày đang làm rất tốt, chưa có thẻ nào bị sai nhiều.</p>
            ) : (
              detailed.weak_cards.map((card, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{card.question_text}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Đáp án: {card.correct_answer}</p>
                  </div>
                  <div className="rounded-md bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-400">
                    SAI {card.wrong_count} LẦN
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </div>

      {/* Lịch sử bài tập gần đây */}
      <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h3 className="mb-5 text-lg font-semibold">Lịch sử bài tập gần đây</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-medium">
                <th className="pb-3 px-2">Ngày làm</th>
                <th className="pb-3 px-2">Bộ thẻ</th>
                <th className="pb-3 px-2 text-center">Kết quả</th>
                <th className="pb-3 px-2 text-right">Điểm số</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {detailed.recent_exercises.map((ex) => (
                <tr key={ex.attempt_id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 px-2 text-xs text-slate-400">
                    {new Date(ex.created_at).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="py-3 px-2 font-medium">{ex.deck_title}</td>
                  <td className="py-3 px-2 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-[10px]">
                      {ex.correct_answers}/{ex.total_questions} câu
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className={`font-bold ${ex.score_percent >= 80 ? "text-emerald-400" : ex.score_percent >= 50 ? "text-sky-400" : "text-orange-400"}`}>
                      {ex.score_percent}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
};

type MetricProps = {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone: "sky" | "emerald" | "orange" | "violet";
};

const metricTone: Record<MetricProps["tone"], string> = {
  sky: "text-sky-300 bg-sky-500/10 border-sky-400/20",
  emerald: "text-emerald-300 bg-emerald-500/10 border-emerald-400/20",
  orange: "text-orange-300 bg-orange-500/10 border-orange-400/20",
  violet: "text-violet-300 bg-violet-500/10 border-violet-400/20",
};

const Metric: React.FC<MetricProps> = ({ title, value, icon, tone }) => {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${metricTone[tone]}`}>{icon}</div>
      <p className="mt-3 text-sm text-slate-400">{title}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
};

export default Reports;
