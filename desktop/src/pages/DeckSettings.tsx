import React, { useState } from "react";
import { AlertTriangle, ArrowLeft, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { api, getApiError } from "../lib/api";

const DeckSettings: React.FC = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const parsedId = Number(deckId);

  const [resetConfirm, setResetConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleReset = async () => {
    if (resetConfirm !== "RESET") return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.resetDeckProgress(parsedId);
      setSuccess(`Đã reset thành công ${res.reset_cards} thẻ. Lịch sử học đã được xoá sạch.`);
      setResetConfirm("");
    } catch (err) {
      setError(getApiError(err, "Reset thất bại"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-page max-w-3xl mx-auto">
      <header className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="app-btn-secondary p-2 text-slate-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="app-title text-2xl">Cài đặt Deck #{deckId}</h1>
          <p className="app-subtitle">Quản lý tiến độ và dữ liệu học tập của bộ thẻ này.</p>
        </div>
      </header>

      <section className="app-card p-6 space-y-6">
        <div className="flex items-center gap-3 text-red-400">
          <AlertTriangle size={20} />
          <h2 className="text-lg font-semibold">Vùng nguy hiểm</h2>
        </div>

        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-200">
          Việc reset sẽ đưa toàn bộ thẻ về trạng thái "Mới", xoá sạch lịch sử ôn tập và điểm bài tập của deck này. Hành động này không thể hoàn tác.
        </div>

        <div className="space-y-3">
          <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Nhập "RESET" để xác nhận</p>
          <input
            value={resetConfirm}
            onChange={(e) => setResetConfirm(e.target.value)}
            placeholder="RESET"
            className="app-input px-4 py-3 text-lg font-mono focus:border-red-500"
          />
        </div>

        {error && <div className="text-sm text-red-400 font-medium">{error}</div>}
        {success && <div className="text-sm text-emerald-400 font-medium">{success}</div>}

        <button
          disabled={resetConfirm !== "RESET" || loading}
          onClick={handleReset}
          className="app-btn w-full justify-center bg-red-600 py-3 font-bold text-white hover:bg-red-500 disabled:opacity-30"
        >
          <Trash2 size={18} />
          {loading ? "Đang xử lý..." : "Xác nhận Reset Tiến Độ"}
        </button>
      </section>
      
      <div className="flex justify-center">
        <button onClick={() => navigate("/")} className="text-sm text-slate-500 hover:text-slate-300">Quay lại Dashboard</button>
      </div>
    </div>
  );
};

export default DeckSettings;
