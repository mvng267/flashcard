import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { api, authStorage, getApiError } from "../lib/api";

const GoogleCallback: React.FC = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const state = params.get("state");
        if (!code || !state) {
          throw new Error("Thiếu code/state từ Google callback");
        }

        const verifierKey = `google.pkce.verifier.${state}`;
        const codeVerifier = sessionStorage.getItem(verifierKey);
        if (!codeVerifier) {
          throw new Error("Không tìm thấy code_verifier (state mismatch)");
        }

        const redirectUri = `${window.location.origin}/auth/google/callback`;
        const tokens = await api.googleCallback(code, state, codeVerifier, redirectUri);
        authStorage.setTokens(tokens);
        sessionStorage.removeItem(verifierKey);

        await refreshProfile();
        navigate("/", { replace: true });
      } catch (err) {
        setError(getApiError(err, "Google callback thất bại"));
      }
    };

    void run();
  }, [navigate, refreshProfile]);

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-100 p-6">
        <div className="max-w-lg rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-100 p-6">
      <div className="app-card p-6 text-slate-300">Đang xử lý đăng nhập Google...</div>
    </div>
  );
};

export default GoogleCallback;
