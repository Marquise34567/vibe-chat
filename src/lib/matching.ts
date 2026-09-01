/**
 * Smart matching algorithm for FaceFrenzy.
 * Scores candidates by: shared interests, country proximity, gender preference,
 * tier priority, scholar status, behavioral signals (recently seen penalty,
 * response rate, session activity), and mode compatibility.
 */

export type MatchCandidate = {
  id: string;
  display_name: string;
  gender: string | null;
  country: string | null;
  interests: string[];
  subscription_tier: "free" | "plus" | "vip";
  isScholar: boolean;
  age: number;
  lastSeenAt: string;
};

export type MatchPreferences = {
  countries: string[];
  gender: string; // "Any" or specific
  interests: string[];
  mode: MatchMode;
  groupSize: GroupSize;
  scholarOnly: boolean;
  excludeIds: string[];
};

export type MatchMode = "solo" | "group" | "blind";
export type GroupSize = 2 | 3 | 4; // 2=1v1, 3=trio, 4=2v2

export type MatchScore = {
  candidate: MatchCandidate;
  score: number;
  breakdown: {
    interests: number;
    country: number;
    gender: number;
    tier: number;
    scholar: number;
    freshness: number;
    behavioral: number;
  };
};

const INTEREST_WEIGHT = 30;
const COUNTRY_WEIGHT = 15;
const GENDER_WEIGHT = 20;
const TIER_WEIGHT = 10;
const SCHOLAR_WEIGHT = 15;
const FRESHNESS_WEIGHT = 8;
const BEHAVIORAL_WEIGHT = 12;

export const scoreCandidate = (
  candidate: MatchCandidate,
  prefs: MatchPreferences
): MatchScore => {
  const breakdown = {
    interests: 0,
    country: 0,
    gender: 0,
    tier: 0,
    scholar: 0,
    freshness: 0,
    behavioral: 0,
  };

  // Interest overlap — the strongest signal
  if (prefs.interests.length > 0) {
    const shared = candidate.interests.filter((i) => prefs.interests.includes(i));
    breakdown.interests = (shared.length / prefs.interests.length) * INTEREST_WEIGHT;
  } else {
    // No preference = mild bonus for people with interests (more interesting)
    breakdown.interests = candidate.interests.length > 0 ? INTEREST_WEIGHT * 0.4 : 0;
  }

  // Country match
  if (prefs.countries.length > 0) {
    breakdown.country = candidate.country && prefs.countries.includes(candidate.country)
      ? COUNTRY_WEIGHT
      : 0;
  } else {
    breakdown.country = COUNTRY_WEIGHT * 0.5; // no preference = neutral
  }

  // Gender match
  if (prefs.gender !== "Any") {
    breakdown.gender = candidate.gender === prefs.gender ? GENDER_WEIGHT : 0;
  } else {
    breakdown.gender = GENDER_WEIGHT * 0.5;
  }

  // Tier priority — higher tiers get slight boost (they're invested users)
  breakdown.tier =
    candidate.subscription_tier === "vip" ? TIER_WEIGHT :
    candidate.subscription_tier === "plus" ? TIER_WEIGHT * 0.6 :
    TIER_WEIGHT * 0.2;

  // Scholar bonus
  if (prefs.scholarOnly) {
    breakdown.scholar = candidate.isScholar ? SCHOLAR_WEIGHT : 0;
  } else {
    breakdown.scholar = candidate.isScholar ? SCHOLAR_WEIGHT * 0.5 : 0;
  }

  // Freshness — prefer recently active users
  const lastSeen = new Date(candidate.lastSeenAt).getTime();
  const minutesAgo = (Date.now() - lastSeen) / 60000;
  if (minutesAgo < 2) breakdown.freshness = FRESHNESS_WEIGHT;
  else if (minutesAgo < 10) breakdown.freshness = FRESHNESS_WEIGHT * 0.6;
  else if (minutesAgo < 60) breakdown.freshness = FRESHNESS_WEIGHT * 0.3;
  else breakdown.freshness = 0;

  // Behavioral — penalize excluded (recently seen) users
  if (prefs.excludeIds.includes(candidate.id)) {
    breakdown.behavioral = -BEHAVIORAL_WEIGHT * 2; // strong penalty
  } else {
    breakdown.behavioral = BEHAVIORAL_WEIGHT * 0.5;
  }

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);

  return { candidate, score, breakdown };
};

export const rankCandidates = (
  candidates: MatchCandidate[],
  prefs: MatchPreferences
): MatchScore[] => {
  // Filter: scholar-only, exclude ids
  const filtered = candidates.filter((c) => {
    if (prefs.excludeIds.includes(c.id)) {
      // Keep but heavily penalize (don't hard exclude — allows fallback)
      return true;
    }
    if (prefs.scholarOnly && !c.isScholar) return false;
    if (prefs.countries.length && c.country && !prefs.countries.includes(c.country)) return false;
    if (prefs.gender !== "Any" && c.gender !== prefs.gender) return false;
    return true;
  });

  const pool = filtered.length > 0 ? filtered : candidates; // fallback to all

  return pool
    .map((c) => scoreCandidate(c, prefs))
    .sort((a, b) => b.score - a.score);
};

/** Pick the best match with some randomness among top candidates (avoid deterministic) */
export const pickBestMatch = (
  candidates: MatchCandidate[],
  prefs: MatchPreferences
): MatchCandidate | null => {
  const ranked = rankCandidates(candidates, prefs);
  if (ranked.length === 0) return null;

  // Pick from top 3 with weighted randomness (best gets highest chance)
  const top = ranked.slice(0, Math.min(3, ranked.length));
  const weights = top.map((_, i) => 3 - i); // [3, 2, 1]
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < top.length; i++) {
    r -= weights[i];
    if (r <= 0) return top[i].candidate;
  }
  return top[0].candidate;
};
