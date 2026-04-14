import React from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Flame,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

const Reports: React.FC = () => {
  const cards = [
    {
      title: "Tổng quan hiệu suất",
      desc: "Xem độ chính xác, tần suất ôn tập, thẻ yếu và phân bố Again/Hard/Good/Easy.",
      to: "/reports/overview",
      icon: <BarChart3 size={20} />,
      tone: "from-sky-500/20 to-cyan-500/20 border-sky-400/20 text-sky-200",
    },
    {
      title: "Bài tập đã làm",
      desc: "Xem từng attempt, điểm số, đáp án đã chọn và đáp án đúng của từng câu.",
      to: "/reports/exercises",
      icon: <Target size={20} />,
      tone: "from-violet-500/20 to-fuchsia-500/20 border-violet-400/20 text-violet-200",
    },
    {
      title: "Streak & Daily Goal",
      desc: "Theo dõi chuỗi học, số phiên học hôm nay, số thẻ đã review và tiến độ daily goal.",
      to: "/streak",
      icon: <Flame size={20} />,
      tone: "from-orange-500/20 to-amber-500/20 border-orange-400/20 text-orange-200",
    },
    {
      title: "Retention theo tuần",
      desc: "Biểu đồ tỉ lệ nhớ bài hàng tuần để thấy chất lượng ghi nhớ dài hạn.",
      to: "/retention",
      icon: <TrendingUp size={20} />,
      tone: "from-emerald-500/20 to-lime-500/20 border-emerald-400/20 text-emerald-200",
    },
  ] as const;

  return (
    <div className="app-page">
      <header className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs text-slate-400">
              <Sparkles size={14} />
              Report Center
            </p>
            <h1 className="app-title md:text-4xl font-bold">Báo cáo học tập</h1>
            <p className="mt-3 max-w-2xl app-subtitle">
              Tách rõ từng mảng báo cáo thành từng màn: tổng quan, streak, retention và lịch sử bài tập chi tiết.
            </p>
          </div>

          <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 px-5 py-4">
            <div className="text-xs uppercase tracking-wider text-sky-300/70">Gợi ý xem nhanh</div>
            <div className="mt-2 flex items-center gap-2 text-sm text-sky-100">
              <CalendarDays size={16} />
              Overview → Exercises → Streak → Retention
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-5 md:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="group relative overflow-hidden app-card p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-700 hover:bg-slate-900"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.tone} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
            <div className="relative z-10">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-200">
                {card.icon}
              </div>

              <h3 className="text-xl font-semibold tracking-tight">{card.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{card.desc}</p>

              <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-sky-300">
                Mở màn này
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        ))}
      </section>

      <section className="app-card p-5">
        <h3 className="text-sm font-semibold text-slate-200">Cách đọc nhanh hệ thống chỉ số</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-400">
          <li className="flex items-start gap-2"><ChevronRight size={15} className="mt-0.5 text-slate-600" /> Học = số phiên start session</li>
          <li className="flex items-start gap-2"><ChevronRight size={15} className="mt-0.5 text-slate-600" /> Ôn tập = số lần chấm thẻ (Again/Hard/Good/Easy)</li>
          <li className="flex items-start gap-2"><ChevronRight size={15} className="mt-0.5 text-slate-600" /> Acc = % lượt review đúng (Hard/Good/Easy)</li>
          <li className="flex items-start gap-2"><ChevronRight size={15} className="mt-0.5 text-slate-600" /> Bài tập = số lần nộp quiz hoàn chỉnh</li>
        </ul>
      </section>
    </div>
  );
};

export default Reports;
