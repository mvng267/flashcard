import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { api, authStorage, type AuthPayload, type MeResponse, type RegisterPayload } from "../lib/api";

type AuthContextValue = {
  user: MeResponse | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: AuthPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    const profile = await api.me();
    setUser(profile);
  };

  const bootstrap = async () => {
    const token = authStorage.getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      await refreshProfile();
    } catch {
      authStorage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void bootstrap();
  }, []);

  const login = async (payload: AuthPayload) => {
    const tokens = await api.login(payload);
    authStorage.setTokens(tokens);
    await refreshProfile();
  };

  const register = async (payload: RegisterPayload) => {
    const tokens = await api.register(payload);
    authStorage.setTokens(tokens);
    await refreshProfile();
  };

  const logout = () => {
    authStorage.clear();
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshProfile,
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
