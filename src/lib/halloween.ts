/**
 * Halloween season theming — FaceFrenzy "Fright Fest".
 * Auto-enabled Oct 1 – Nov 3. Can be forced on/off via localStorage flag
 * `ff:halloween` = "on" | "off" (mainly for testing).
 */

const FLAG_KEY = "ff:halloween";

export const isHalloweenSeason = (): boolean => {
  try {
    const forced = localStorage.getItem(FLAG_KEY);
    if (forced === "on") return true;
    if (forced === "off") return false;
  } catch { /* ignore */ }
  const now = new Date();
  const m = now.getMonth(); // 0-based
  const d = now.getDate();
  // Oct 1 → Nov 3 inclusive
  if (m === 9) return true; // all of October
  if (m === 10 && d <= 3) return true;
  return false;
};

export const setHalloweenOverride = (v: "on" | "off" | null) => {
  try {
    if (v === null) localStorage.removeItem(FLAG_KEY);
    else localStorage.setItem(FLAG_KEY, v);
  } catch { /* ignore */ }
};

/* ── Spooky palette (used inline across pages) ── */
export const HALLOWEEN = {
  pumpkin: "#FF7518",
  pumpkinDeep: "#E5540A",
  ember: "#FFB347",
  purple: "#8B2FC9",
  purpleDeep: "#4B1770",
  slime: "#7CFF6B",
  blood: "#C81E3A",
} as const;
