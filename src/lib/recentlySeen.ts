// Tracks recently matched/skipped users so the queue avoids repeats.
// Stored in sessionStorage so it resets when the tab closes.

const KEY = "ff:recently_seen";
const TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_ENTRIES = 100;

type Entry = { id: string; ts: number };

const read = (): Entry[] => {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Entry[];
    const cutoff = Date.now() - TTL_MS;
    return parsed.filter((e) => e && e.id && e.ts > cutoff);
  } catch {
    return [];
  }
};

const write = (entries: Entry[]) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    /* ignore quota errors */
  }
};

export const getRecentlySeen = (): string[] => read().map((e) => e.id);

export const addRecentlySeen = (id: string) => {
  if (!id) return;
  const next = read().filter((e) => e.id !== id);
  next.push({ id, ts: Date.now() });
  write(next);
};

export const clearRecentlySeen = () => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};
