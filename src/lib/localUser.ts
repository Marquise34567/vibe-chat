/**
 * Local user system — provides a persistent identity + profile without Supabase auth.
 * The app works fully without login. If a Supabase session exists, it takes priority.
 */

const USER_KEY = "ff:local_user";
const PROFILE_KEY = "ff:local_profile";
const NAME_KEY = "ff:display_name";

export type LocalProfile = {
  id: string;
  display_name: string;
  gender: string | null;
  country: string | null;
  interests: string[];
  avatar_url: string | null;
  subscription_tier: "free" | "plus" | "vip";
};

export type LocalUser = {
  id: string;
  email: string;
  user_metadata: {
    display_name: string;
    gender: string | null;
    country: string | null;
    interests: string[];
  };
};

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const DEFAULT_NAME = () => {
  const adjs = ["Chill", "Cosmic", "Neon", "Lunar", "Solar", "Retro", "Hyper", "Mellow"];
  const nouns = ["Vibe", "Wave", "Spark", "Drift", "Pulse", "Glow", "Flux", "Echo"];
  const n = Math.floor(Math.random() * 1000);
  return `${adjs[Math.floor(Math.random() * adjs.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${n}`;
};

export const getLocalUser = (): LocalUser => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) return JSON.parse(raw) as LocalUser;
  } catch { /* ignore */ }
  const name = DEFAULT_NAME();
  const user: LocalUser = {
    id: generateId(),
    email: `${name.toLowerCase()}@local.facefrenzy`,
    user_metadata: { display_name: name, gender: null, country: null, interests: [] },
  };
  try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch { /* ignore */ }
  return user;
};

export const getLocalProfile = (): LocalProfile => {
  const user = getLocalUser();
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return { ...JSON.parse(raw), id: user.id } as LocalProfile;
  } catch { /* ignore */ }
  return {
    id: user.id,
    display_name: user.user_metadata.display_name,
    gender: null,
    country: null,
    interests: [],
    avatar_url: null,
    subscription_tier: "free",
  };
};

export const saveLocalProfile = (profile: Partial<LocalProfile>): LocalProfile => {
  const current = getLocalProfile();
  const next = { ...current, ...profile, id: current.id };
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
};

export const updateLocalUserMeta = (meta: Partial<LocalUser["user_metadata"]>) => {
  const user = getLocalUser();
  const updated = { ...user, user_metadata: { ...user.user_metadata, ...meta } };
  try { localStorage.setItem(USER_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  return updated;
};

// ── Display name (chosen on first visit via AgeGate) ──
export const getDisplayName = (): string | null => {
  try { return localStorage.getItem(NAME_KEY); } catch { return null; }
};
export const setDisplayName = (name: string) => {
  try { localStorage.setItem(NAME_KEY, name); } catch { /* ignore */ }
  // Also sync into the local user + profile so existing reads pick it up
  updateLocalUserMeta({ display_name: name });
  saveLocalProfile({ display_name: name });
};
export const hasDisplayName = (): boolean => {
  return !!getDisplayName();
};
