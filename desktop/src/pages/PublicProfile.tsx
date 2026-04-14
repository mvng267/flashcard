import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  CheckCircle2,
  Flame,
  MessageCircle,
  Target,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
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

import { api, getApiError, type UserPublicProfileDetailResponse } from "../lib/api";
import { getAvatarUrl } from "../lib/avatar";

const PublicProfile: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const parsedUserId = Number(userId || "0");

  const [data, setData] = useState<UserPublicProfileDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!parsedUserId || Number.isNaN(parsedUserId)) {
      setError("User không hợp lệ");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.getUserPublicProfile(parsedUserId, 30);
      setData(res);
    } catch (err) {
      setError(getApiError(err, "Không tải được profile người dùng"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [parsedUserId]);

  const streakChartData = useMemo(() => {
    if (!data) return [];
    return data.streak_activity.map((item) => {
      const d = new Date(item.date);
      return {
        ...item,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        active: item.total_lessons > 0,
      };
    });
  }, [data]);

  if (loading) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/40">
        <div className="text-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent mx-auto"></div>
          <p className="text-slate-400">Đang tải hồ sơ...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-10 text-center space-y-4">
        <p className="text-red-300">{error || "Lỗi không xác định"}</p>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => void loadData()}
            className="rounded-xl bg-red-500/20 px-6 py-2 text-sm text-red-200 hover:bg-red-500/30"
          >
            Thử lại
          </button>
          <Link to="/social" className="rounded-xl border border-slate-700 px-6 py-2 text-sm text-slate-200 hover:bg-slate-800">
            Quay lại Social
          </Link>
        </div>
      </div>
    );
  }

  const { user, overview } = data;
  const completionPercent = overview.total_cards > 0 ? Math.round((overview.reviewed_cards / overview.total_cards) * 100) : 0;

  return (
    <div className="app-page max-w-6xl mx-auto">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="app-btn-secondary p-2 text-slate-400 hover:text-slate-100"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="app-title">Hồ sơ học tập</h1>
            <p className="app-subtitle">Xem tiến độ và streak cơ bản của người dùng khác.</p>
          </div>
        </div>

        <button
          onClick={() => navigate(`/messages?to=${user.id}`)}
          className="app-btn border border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20"
        >
          <MessageCircle size={16} /> Nhắn tin nhanh
        </button>
      </header>

      <section className="app-card p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <img
            src={user.avatar_url || getAvatarUrl(user.avatar_seed, user.username)}
            alt="avatar"
            className="h-20 w-20 rounded-full border border-slate-700 object-cover"
            onError={(e) => {
              e.currentTarget.src = getAvatarUrl(user.username, user.username);
            }}
          />

          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold text-slate-100 truncate">{user.full_name}</h2>
            <p className="text-sm text-slate-400">@{user.username}</p>
            {user.bio ? <p className="mt-2 text-sm text-slate-300">{user.bio}</p> : null}
          </div>

          <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-3">
            <p className="text-xs uppercase tracking-widest text-orange-300/80">Current Streak</p>
            <p className="mt-1 text-2xl font-black text-orange-200 inline-flex items-center gap-2">
              <Flame size={18} /> {overview.current_streak_days} ngày
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={<BookOpen size={18} />} title="Deck đã cài" value={overview.total_decks} tone="sky" />
        <MetricCard icon={<Brain size={18} />} title="Tổng số thẻ" value={overview.total_cards} tone="violet" />
        <MetricCard icon={<CheckCircle2 size={18} />} title="Thẻ đã review" value={overview.reviewed_cards} tone="emerald" />
        <MetricCard icon={<Target size={18} />} title="Thẻ đến hạn" value={overview.due_cards} tone="orange" />
      </section>

      <section className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 md:p-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-emerald-300/80">Tiến trình tổng</p>
            <h3 className="text-2xl font-bold mt-1">{overview.reviewed_cards}/{overview.total_cards} thẻ</h3>
          </div>
          <p className="text-3xl font-black text-emerald-300">{completionPercent}%</p>
        </div>
        <div className="mt-4 h-3 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-400" style={{ width: `${Math.max(0, Math.min(100, completionPercent))}%` }} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={<CalendarDays size={18} />} title="Review 30 ngày" value={overview.total_reviews_30d} tone="sky" />
        <MetricCard icon={<BarChart3 size={18} />} title="Độ chính xác 30 ngày" value={`${Math.round(overview.accuracy_percent_30d)}%`} tone="emerald" />
        <MetricCard icon={<BookOpen size={18} />} title="Phiên học 30 ngày" value={overview.study_sessions_30d} tone="violet" />
        <MetricCard icon={<Brain size={18} />} title="Bài tập 30 ngày" value={overview.exercise_attempts_30d} tone="orange" />
      </section>

      <article className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
              <Flame size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Biểu đồ streak cơ bản ({data.streak_range_days} ngày)</h3>
              <p className="text-xs text-slate-500">Dựa trên tổng hoạt động học mỗi ngày.</p>
            </div>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={streakChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(30,41,59,0.5)" }}
                contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "14px", color: "#f1f5f9", fontSize: "12px" }}
              />
              <Bar dataKey="total_lessons" radius={[4, 4, 0, 0]} name="Bài học">
                {streakChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.active ? "#38bdf8" : "#1e293b"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </div>
  );
};

const MetricCard: React.FC<{ icon: React.ReactNode; title: string; value: number | string; tone: "sky" | "emerald" | "violet" | "orange" }> = ({
  icon,
  title,
  value,
  tone,
}) => {
  const tones = {
    sky: "bg-sky-500/10 text-sky-400 border-sky-400/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-400/20",
    violet: "bg-violet-500/10 text-violet-400 border-violet-400/20",
    orange: "bg-orange-500/10 text-orange-400 border-orange-400/20",
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]} bg-slate-900/40`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-80">
        {icon}
        <span>{title}</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-100">{value}</p>
    </div>
  );
};

export default PublicProfile;
