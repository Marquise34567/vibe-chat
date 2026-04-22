export type Tier = "free" | "plus" | "vip";

export type TierFeatures = {
  // Filters
  maxCountryFilters: number; // -1 = unlimited
  canFilterByGender: boolean;
  canFilterByInterests: boolean;
  // Lobby
  priorityQueue: boolean; // access to plus/vip-only "Priority" lobby
  appearFirstInLobby: boolean;
  // Chat
  hdVideo: boolean;
  liveTranslate: boolean;
  rewindLastSkip: boolean;
  seeWhoLikedYou: boolean;
  noAds: boolean;
  // Branding
  badge: string | null;
  badgeBg: string | null;
};

export const TIER_FEATURES: Record<Tier, TierFeatures> = {
  free: {
    maxCountryFilters: 3,
    canFilterByGender: false,
    canFilterByInterests: true,
    priorityQueue: false,
    appearFirstInLobby: false,
    hdVideo: false,
    liveTranslate: false,
    rewindLastSkip: false,
    seeWhoLikedYou: false,
    noAds: false,
    badge: null,
    badgeBg: null,
  },
  plus: {
    maxCountryFilters: -1,
    canFilterByGender: true,
    canFilterByInterests: true,
    priorityQueue: true,
    appearFirstInLobby: false,
    hdVideo: false,
    liveTranslate: false,
    rewindLastSkip: false,
    seeWhoLikedYou: true,
    noAds: true,
    badge: "⭐ PLUS",
    badgeBg: "bg-primary text-primary-foreground",
  },
  vip: {
    maxCountryFilters: -1,
    canFilterByGender: true,
    canFilterByInterests: true,
    priorityQueue: true,
    appearFirstInLobby: true,
    hdVideo: true,
    liveTranslate: true,
    rewindLastSkip: true,
    seeWhoLikedYou: true,
    noAds: true,
    badge: "👑 VIP",
    badgeBg: "bg-foreground text-background",
  },
};

export const TIER_LABEL: Record<Tier, string> = {
  free: "Free",
  plus: "Plus",
  vip: "VIP",
};

export const tierRank = (t: Tier) => (t === "vip" ? 2 : t === "plus" ? 1 : 0);
export const isAtLeast = (t: Tier, min: Tier) => tierRank(t) >= tierRank(min);
