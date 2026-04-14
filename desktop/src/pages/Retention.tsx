import React, { useEffect, useState } from "react";
import { BarChart3, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api, getApiError, type RetentionReportResponse } from "../lib/api";

const Retention: React.FC = () => {
  const [data, setData] = useState<RetentionReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.reportsRetention(8);
      setData(res);
    } catch (err) {
      setError(getApiError(err, "Không tải được retention"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">Đang tải retention...</div>;
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
        {error || "Lỗi dữ liệu"}
      </div>
    );
  }

  const chartData = data.weekly.map((w) => {
    const d = new Date(w.week_start);
    return {
      ...w,
      label: `${d.getDate()}/${d.getMonth() + 1}`,
    };
  });

  return (
    <div className="app-page">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="app-title">Retention theo tuần</h1>
          <p className="app-subtitle">Tỉ lệ nhớ bài = % review không phải Again.</p>
        </div>
        <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 px-5 py-3 text-right">
          <p className="text-xs uppercase tracking-widest text-sky-300/80">Overall</p>
          <p className="text-3xl font-black text-sky-200">{data.overall_retention_percent}%</p>
        </div>
      </header>

      <article className="app-card p-6">
        <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold">
          <TrendingUp size={18} className="text-sky-400" />
          Biểu đồ retention {data.range_weeks} tuần
        </h3>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "12px", color: "#f1f5f9" }}
              />
              <Line
                type="monotone"
                dataKey="retention_percent"
                name="Retention %"
                stroke="#38bdf8"
                strokeWidth={3}
                dot={{ r: 3, fill: "#38bdf8" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="app-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <BarChart3 size={18} className="text-violet-400" />
          Bảng chi tiết
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="pb-2">Tuần bắt đầu</th>
                <th className="pb-2">Review</th>
                <th className="pb-2">Retained</th>
                <th className="pb-2 text-right">Retention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {data.weekly.map((w) => (
                <tr key={w.week_start}>
                  <td className="py-2">{new Date(w.week_start).toLocaleDateString("vi-VN")}</td>
                  <td className="py-2">{w.reviewed_cards}</td>
                  <td className="py-2">{w.retained_cards}</td>
                  <td className="py-2 text-right font-semibold text-sky-300">{w.retention_percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
};

export default Retention;
