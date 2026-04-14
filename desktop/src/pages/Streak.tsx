import React, { useEffect, useState } from "react";
import {
  Activity,
  Award,
  BookOpen,
  Calendar,
  Flame,
  LayoutGrid,
  RotateCcw,
  Target,
  Trophy,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api, getApiError, type StreakReportResponse } from "../lib/api";

const Streak: React.FC = () => {
  const [data, setData] = useState<StreakReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.reportsStreak(30);
      setData(res);
    } catch (err) {
      setError(getApiError(err, "Không tải được dữ liệu streak"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/40">
        <div className="text-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent mx-auto"></div>
          <p className="text-slate-400">Đang tính toán streak của mày...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-10 text-center space-y-4">
        <p className="text-red-300">{error || "Lỗi không xác định"}</p>
        <button onClick={() => void loadData()} className="rounded-xl bg-red-500/20 px-6 py-2 text-sm text-red-200 hover:bg-red-500/30">
          Thử lại
        </button>
      </div>
    );
  }

  const chartData = data.daily_activity.map((item) => {
    const d = new Date(item.date);
    return {
      ...item,
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      active: item.total_lessons > 0,
    };
  });

  return (
    <div className="app-page">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="app-title">Kỷ luật & Streak</h1>
          <p className="app-subtitle">Giữ vững phong độ học tập mỗi ngày để đạt kết quả tốt nhất.</p>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-orange-500/20 bg-orange-500/10 px-6 py-4">
          <div className="h-12 w-12 rounded-xl bg-orange-500 flex items-center justify-center text-slate-900 shadow-lg shadow-orange-500/20">
            <Flame size={28} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-orange-300/80">Streak hiện tại</p>
            <p className="text-2xl font-black text-orange-200 leading-none mt-1">{data.current_streak_days} NGÀY</p>
          </div>
        </div>
      </header>

      {/* Hôm nay */}
      <section className="relative overflow-hidden rounded-3xl border border-sky-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/30 p-8 shadow-xl">
        <div className="relative z-10 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sky-400 mb-1">
                <Calendar size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Hôm nay</span>
            </div>
            <h2 className="text-4xl font-bold">{data.today_study_sessions} <span className="text-xl font-normal text-slate-500">phiên học</span></h2>
            <p className="text-sm text-slate-400">Đã ôn {data.today_review_count} thẻ trong hôm nay.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:col-span-3">
             <MetricRow title="Số phiên học hôm nay" value={data.today_study_sessions} icon={<BookOpen size={18} />} tone="sky" />
             <MetricRow title="Số thẻ đã review hôm nay" value={data.today_review_count} icon={<RotateCcw size={18} />} tone="emerald" />
             <MetricRow title="Bài tập đã hoàn thành" value={data.today_exercise_attempts} icon={<Award size={18} />} tone="violet" />
             <MetricRow title="Tổng lesson trong 7 ngày" value={data.weekly_total_lessons} icon={<Trophy size={18} />} tone="orange" />
          </div>
        </div>
        
        {/* Background icon decoration */}
        <Activity size={180} className="absolute -bottom-10 -right-10 text-sky-500/5 rotate-12 pointer-events-none" />
      </section>

      <section className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-emerald-300/80">Daily Goal</p>
            <h3 className="text-2xl font-bold mt-1">{data.today_review_count}/{data.daily_goal_reviews} thẻ review hôm nay</h3>
            <p className="text-sm text-slate-400 mt-2">
              {data.daily_goal_reached ? "✅ Đạt mục tiêu hôm nay" : "⏳ Chưa đạt mục tiêu, cố thêm chút nữa"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black text-emerald-300">{Math.round(data.daily_goal_progress_percent)}%</p>
            <p className="text-xs text-slate-500">Tiến độ mục tiêu</p>
          </div>
        </div>
        <div className="mt-5 h-3 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-400 transition-all"
            style={{ width: `${Math.max(0, Math.min(100, data.daily_goal_progress_percent))}%` }}
          />
        </div>
      </section>

      {/* Biểu đồ 30 ngày */}
      <article className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 md:p-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
              <Activity size={20} />
            </div>
            <h3 className="text-lg font-semibold">Hoạt động 30 ngày qua</h3>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-sky-500" /> Có học</div>
            <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-slate-800" /> Nghỉ</div>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(30,41,59,0.5)" }}
                contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "14px", color: "#f1f5f9", fontSize: "12px" }}
              />
              <Bar dataKey="total_lessons" radius={[4, 4, 0, 0]} name="Bài học">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.active ? "#38bdf8" : "#1e293b"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <section className="grid gap-6 md:grid-cols-3">
        <AdviceCard
            icon={<Target className="text-sky-400" />}
            title="Mục tiêu nhỏ"
            desc="Học ít nhất 5 phút mỗi ngày hiệu quả hơn học 1 tiếng mỗi tuần."
        />
        <AdviceCard
            icon={<Flame className="text-orange-400" />}
            title="Giữ lửa streak"
            desc="Streak là cam kết của mày với chính mình. Đừng để nó tắt."
        />
        <AdviceCard
            icon={<LayoutGrid className="text-violet-400" />}
            title="Đa dạng bài học"
            desc="Kết hợp flashcard và bài tập giúp nhớ lâu hơn gấp 3 lần."
        />
      </section>
    </div>
  );
};

const MetricRow: React.FC<{ title: string; value: number; icon: React.ReactNode; tone: "sky" | "emerald" | "violet" | "orange" }> = ({
  title,
  value,
  icon,
  tone,
}) => {
  const tones = {
    sky: "bg-sky-500/10 text-sky-400 border-sky-400/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-400/20",
    violet: "bg-violet-500/10 text-violet-400 border-violet-400/20",
    orange: "bg-orange-500/10 text-orange-400 border-orange-400/20",
  };

  return (
    <div className={`flex flex-col justify-between p-4 rounded-2xl border ${tones[tone]} bg-slate-900/40`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="opacity-70">{icon}</div>
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{title}</p>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};

const AdviceCard: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
      <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center">
        {icon}
      </div>
      <h4 className="font-semibold">{title}</h4>
      <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
};

export default Streak;
