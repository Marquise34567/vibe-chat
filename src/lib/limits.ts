/**
 * Free-tier usage limits — the hard paywall.
 * Free users get a fixed number of matches per day; Plus/VIP are unlimited.
 * Counts are stored in localStorage keyed by local date.
 */

export const FREE_DAILY_MATCH_LIMIT = 10;

const KEY = "ff:match_count";

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const read = (): { day: string; count: number } => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.day === todayKey()) return parsed;
    }
  } catch { /* ignore */ }
  return { day: todayKey(), count: 0 };
};

/** Matches used today */
export const matchesToday = (): number => read().count;

/** Matches remaining today for a free user */
export const matchesLeft = (): number =>
  Math.max(0, FREE_DAILY_MATCH_LIMIT - read().count);

/** Call when a match actually connects (WebRTC established). */
export const recordMatch = () => {
  const cur = read();
  try {
    localStorage.setItem(KEY, JSON.stringify({ day: cur.day, count: cur.count + 1 }));
  } catch { /* ignore */ }
};

/** Free user out of matches? */
export const isMatchLimitHit = (isPaid: boolean): boolean =>
  !isPaid && read().count >= FREE_DAILY_MATCH_LIMIT;
