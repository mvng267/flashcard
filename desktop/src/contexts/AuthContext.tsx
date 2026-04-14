import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  api,
  authStorage,
  type AuthPayload,
  type MeResponse,
  type RegisterPayload,
  type UpdateProfilePayload,
  type UserPublicProfile,
} from "../lib/api";

type AuthContextType = {
  user: MeResponse | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: AuthPayload) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
  refreshProfile: () => Promise<void>;
  myFriends: UserPublicProfile[];
  refreshFriends: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [myFriends, setMyFriends] = useState<UserPublicProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshFriends = useCallback(async () => {
    try {
      const friends = await api.getFriends();
      setMyFriends(friends);
    } catch {
      // ignore
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = authStorage.getAccessToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api.me();
      setUser(data);
      void refreshFriends();
    } catch (error) {
      authStorage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [refreshFriends]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const login = async (payload: AuthPayload) => {
    const tokens = await api.login(payload);
    authStorage.setTokens(tokens);
    await refreshProfile();
  };

  const loginWithGoogle = async (idToken: string) => {
    const tokens = await api.loginWithGoogle({ id_token: idToken });
    authStorage.setTokens(tokens);
    await refreshProfile();
  };

  const register = async (payload: RegisterPayload) => {
    const tokens = await api.register(payload);
    authStorage.setTokens(tokens);
    await refreshProfile();
  };

  const updateProfile = async (payload: UpdateProfilePayload) => {
    const updated = await api.updateMe(payload);
    setUser(updated);
  };

  const logout = () => {
    authStorage.clear();
    setUser(null);
    setMyFriends([]);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      loginWithGoogle,
      register,
      logout,
      updateProfile,
      refreshProfile,
      myFriends,
      refreshFriends,
    }),
    [loading, user, myFriends, refreshProfile, refreshFriends],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
