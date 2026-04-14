const DICEBEAR_BASE = "https://api.dicebear.com/8.x";

export const avatarStyleOptions = [
  { value: "adventurer-neutral", label: "Adventurer" },
  { value: "bottts-neutral", label: "Robot" },
  { value: "thumbs", label: "Thumbs" },
  { value: "pixel-art", label: "Pixel" },
  { value: "notionists-neutral", label: "Notionist" },
] as const;

export type AvatarStyle = (typeof avatarStyleOptions)[number]["value"];

export const DEFAULT_AVATAR_STYLE: AvatarStyle = "adventurer-neutral";

export const encodeAvatarSeed = (seed: string, style: AvatarStyle = DEFAULT_AVATAR_STYLE) => {
  return `${style}:${seed}`;
};

export const parseAvatarSeed = (raw?: string | null) => {
  const value = (raw || "").trim();
  if (!value) return { style: DEFAULT_AVATAR_STYLE, seed: "user" };

  const idx = value.indexOf(":");
  if (idx === -1) {
    return { style: DEFAULT_AVATAR_STYLE, seed: value };
  }

  const style = value.slice(0, idx) as AvatarStyle;
  const seed = value.slice(idx + 1) || "user";

  const supported = avatarStyleOptions.some((s) => s.value === style);
  return {
    style: supported ? style : DEFAULT_AVATAR_STYLE,
    seed,
  };
};

export const getAvatarUrl = (seedRaw?: string | null, fallback = "user") => {
  const parsed = parseAvatarSeed(seedRaw || fallback);
  const seed = encodeURIComponent(parsed.seed || fallback || "user");
  return `${DICEBEAR_BASE}/${parsed.style}/svg?seed=${seed}&backgroundType=gradientLinear`;
};
