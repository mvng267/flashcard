import React, { useState } from "react";
import { ArrowRight, AtSign, BookOpen, Chrome, Lock, Mail, User } from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { api, getApiError } from "../lib/api";
import { createOAuthState, createPkcePair } from "../lib/pkce";

const Login: React.FC = () => {
  const { login, loginWithGoogle, register } = useAuth();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      setSubmitting(true);

      if (isRegister) {
        await register({
          full_name: fullName.trim(),
          username: username.trim() || undefined,
          email: email.trim(),
          password,
        });
      } else {
        await login({ email: email.trim(), password });
      }
    } catch (error) {
      setErrorMessage(getApiError(error, "Đăng nhập thất bại"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);

    try {
      setGoogleLoading(true);

      const redirectUri = `${window.location.origin}/auth/google/callback`;
      const state = createOAuthState();
      const { codeVerifier, codeChallenge } = await createPkcePair();

      sessionStorage.setItem(`google.pkce.verifier.${state}`, codeVerifier);

      const { authorization_url } = await api.googleAuthorize(redirectUri, state, codeChallenge);
      window.location.href = authorization_url;
    } catch (error) {
      const fallback = window.prompt("OAuth chưa sẵn sàng. Dán Google id_token tạm thời:");
      if (fallback?.trim()) {
        try {
          await loginWithGoogle(fallback.trim());
          return;
        } catch (err) {
          setErrorMessage(getApiError(err, "Đăng nhập Google thất bại"));
        }
      } else {
        setErrorMessage(getApiError(error, "Không khởi tạo được Google OAuth"));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 app-card overflow-hidden shadow-2xl">
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
            <div className="app-card-soft p-3">✔ Thư viện thẻ có sẵn</div>
            <div className="app-card-soft p-3">✔ Theo dõi tiến độ</div>
            <div className="app-card-soft p-3">✔ Lặp lại ngắt quãng</div>
            <div className="app-card-soft p-3">✔ Dùng offline nhẹ</div>
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
              className="app-btn-secondary px-3 py-1.5 text-xs"
            >
              {isRegister ? "Đã có tài khoản" : "Đăng ký"}
            </button>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            {isRegister && (
              <>
                <label className="block">
                  <span className="mb-1.5 block text-sm text-slate-300">Họ tên</span>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="app-input pl-10 focus:border-sky-400"
                      placeholder="Vinh Nguyen"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm text-slate-300">Username (tuỳ chọn)</span>
                  <div className="relative">
                    <AtSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="app-input pl-10 focus:border-sky-400"
                      placeholder="vinh_nguyen"
                    />
                  </div>
                </label>
              </>
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
                  className="app-input pl-10 focus:border-sky-400"
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
                  className="app-input pl-10 focus:border-sky-400"
                  placeholder="••••••••"
                />
              </div>
            </label>

            {errorMessage && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{errorMessage}</div>}

            <button
              type="submit"
              disabled={submitting || googleLoading}
              className="mt-2 app-btn-primary w-full"
            >
              {submitting ? "Đang xử lý..." : isRegister ? "Tạo tài khoản" : "Vào học ngay"}
              <ArrowRight size={16} />
            </button>
          </form>

          {!isRegister && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-800" />
                <span className="text-[10px] uppercase tracking-wider text-slate-500">hoặc</span>
                <div className="h-px flex-1 bg-slate-800" />
              </div>

              <button
                type="button"
                onClick={() => void handleGoogleLogin()}
                disabled={submitting || googleLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-sky-400/40 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Chrome size={16} />
                {googleLoading ? "Đang đăng nhập Google..." : "Đăng nhập bằng Google"}
              </button>
            </>
          )}

          <p className="mt-4 text-xs text-slate-500">
            Google OAuth đang chạy theo flow popup/callback PKCE. Nếu backend chưa bật OAuth sẽ fallback nhập id_token thủ công.
            {!googleClientId ? " (Chưa cấu hình VITE_GOOGLE_CLIENT_ID)" : ""}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
