import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "dark" | "light";
export type WidthMode = "contained" | "full";
export type EffectLevel = "off" | "low" | "high";

type UiPreferencesContextValue = {
  theme: ThemeMode;
  widthMode: WidthMode;
  contentWidth: number;
  effects: EffectLevel;
  setTheme: (mode: ThemeMode) => void;
  setWidthMode: (mode: WidthMode) => void;
  setContentWidth: (value: number) => void;
  setEffects: (level: EffectLevel) => void;
  resetUi: () => void;
};

const WIDTH_MIN = 1080;
const WIDTH_MAX = 2200;
const WIDTH_DEFAULT = 1344;

const STORAGE_KEYS = {
  theme: "flashcard_ui_theme",
  widthMode: "flashcard_ui_width_mode",
  contentWidth: "flashcard_ui_content_width",
  effects: "flashcard_ui_effects",
} as const;

const UiPreferencesContext = createContext<UiPreferencesContextValue | undefined>(undefined);

function clampWidth(value: number) {
  if (!Number.isFinite(value)) return WIDTH_DEFAULT;
  return Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, Math.round(value)));
}

function readTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const raw = window.localStorage.getItem(STORAGE_KEYS.theme);
  return raw === "light" ? "light" : "dark";
}

function readWidthMode(): WidthMode {
  if (typeof window === "undefined") return "contained";
  const raw = window.localStorage.getItem(STORAGE_KEYS.widthMode);
  return raw === "full" ? "full" : "contained";
}

function readEffects(): EffectLevel {
  if (typeof window === "undefined") return "high";
  const raw = window.localStorage.getItem(STORAGE_KEYS.effects);
  if (raw === "off" || raw === "low" || raw === "high") return raw;
  return "high";
}

function readContentWidth(): number {
  if (typeof window === "undefined") return WIDTH_DEFAULT;
  const raw = Number(window.localStorage.getItem(STORAGE_KEYS.contentWidth));
  return clampWidth(raw);
}

export const UiPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>(() => readTheme());
  const [widthMode, setWidthMode] = useState<WidthMode>(() => readWidthMode());
  const [contentWidth, setContentWidthState] = useState<number>(() => readContentWidth());
  const [effects, setEffects] = useState<EffectLevel>(() => readEffects());

  const setContentWidth = (value: number) => {
    setContentWidthState(clampWidth(value));
  };

  const resetUi = () => {
    setTheme("dark");
    setWidthMode("contained");
    setContentWidthState(WIDTH_DEFAULT);
    setEffects("high");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = window.document.documentElement;
    const studyWidth = Math.min(1600, Math.max(1080, contentWidth - 80));

    root.setAttribute("data-theme", theme);
    root.setAttribute("data-effects", effects);
    root.style.setProperty("--app-content-width", `${contentWidth}px`);
    root.style.setProperty("--study-content-width", `${studyWidth}px`);

    window.localStorage.setItem(STORAGE_KEYS.theme, theme);
    window.localStorage.setItem(STORAGE_KEYS.widthMode, widthMode);
    window.localStorage.setItem(STORAGE_KEYS.contentWidth, String(contentWidth));
    window.localStorage.setItem(STORAGE_KEYS.effects, effects);
  }, [theme, widthMode, contentWidth, effects]);

  const value = useMemo<UiPreferencesContextValue>(
    () => ({
      theme,
      widthMode,
      contentWidth,
      effects,
      setTheme,
      setWidthMode,
      setContentWidth,
      setEffects,
      resetUi,
    }),
    [theme, widthMode, contentWidth, effects],
  );

  return <UiPreferencesContext.Provider value={value}>{children}</UiPreferencesContext.Provider>;
};

export function useUiPreferences() {
  const context = useContext(UiPreferencesContext);
  if (!context) {
    throw new Error("useUiPreferences must be used within UiPreferencesProvider");
  }
  return context;
}
