import React, { useState } from "react";
import { ArrowRight, BookOpen, Lock, Mail, User } from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { getApiError } from "../lib/api";

const Login: React.FC = () => {
  const { login, register } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      setSubmitting(true);

      if (isRegister) {
        await register({ full_name: fullName.trim(), email: email.trim(), password });
      } else {
        await login({ email: email.trim(), password });
      }
    } catch (error) {
      setErrorMessage(getApiError(error, "Đăng nhập thất bại"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/60 shadow-2xl">
        <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-sky-500/20 via-slate-900 to-slate-900 border-r border-slate-800">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-sky-200">
            <BookOpen size={24} />
          </div>

          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-sky-200/80 mb-3">Eyna Flashcard</p>
            <h1 className="text-3xl font-semibold leading-tight mb-3">Học tiếng Anh mỗi ngày, giữ nhịp bằng flashcard SRS.</h1>
            <p className="text-slate-300/90 text-sm">
              Đăng nhập để tiếp tục phiên học. App tối ưu cho MacBook, giao diện tối giản và dễ dùng.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">✔ Thư viện thẻ có sẵn</div>
            <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">✔ Theo dõi tiến độ</div>
            <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">✔ Lặp lại ngắt quãng</div>
            <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">✔ Dùng offline nhẹ</div>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-semibold">{isRegister ? "Tạo tài khoản" : "Đăng nhập"}</h2>
              <p className="text-sm text-slate-400 mt-1">
                {isRegister ? "Tạo tài khoản mới để bắt đầu học" : "Đăng nhập để tiếp tục phiên học"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsRegister((prev) => !prev);
                setErrorMessage(null);
              }}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-sky-400/50 hover:text-sky-200 transition"
            >
              {isRegister ? "Đã có tài khoản" : "Đăng ký"}
            </button>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            {isRegister && (
              <label className="block">
                <span className="mb-1.5 block text-sm text-slate-300">Họ tên</span>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-sky-400"
                    placeholder="Vinh Nguyen"
                  />
                </div>
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm text-slate-300">Email</span>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-sky-400"
                  placeholder="vinh@example.com"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm text-slate-300">Mật khẩu</span>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-sky-400"
                  placeholder="••••••••"
                />
              </div>
            </label>

            {errorMessage && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{errorMessage}</div>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Đang xử lý..." : isRegister ? "Tạo tài khoản" : "Vào học ngay"}
              <ArrowRight size={16} />
            </button>
          </form>

          <p className="mt-4 text-xs text-slate-500">Đã kết nối API thật cho đăng nhập/đăng ký.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
