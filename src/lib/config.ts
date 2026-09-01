/**
 * Static app configuration — gifts, coin packages, Plus features/plans.
 * This is NOT mock data. These are real app constants.
 */

/** Gradient palette for avatar placeholders (deterministic from user id) */
const GRADIENTS = [
  "from-pink-500 to-violet-500",
  "from-cyan-500 to-blue-500",
  "from-amber-500 to-pink-500",
  "from-emerald-500 to-cyan-500",
  "from-violet-500 to-fuchsia-500",
  "from-rose-500 to-orange-500",
  "from-indigo-500 to-purple-500",
  "from-teal-500 to-green-500",
];

export const gradientFor = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % GRADIENTS.length;
  return GRADIENTS[h];
};

export const initialFor = (name: string) => name.charAt(0).toUpperCase() || "?";

/* ---------------- Gifts economy ---------------- */
export type Gift = {
  id: string;
  name: string;
  emoji: string;
  cost: number;
};

export const GIFTS: Gift[] = [
  { id: "g1", name: "Rose", emoji: "🌹", cost: 5 },
  { id: "g2", name: "Heart", emoji: "💖", cost: 10 },
  { id: "g3", name: "Crown", emoji: "👑", cost: 50 },
  { id: "g4", name: "Rocket", emoji: "🚀", cost: 30 },
  { id: "g5", name: "Diamond", emoji: "💎", cost: 100 },
  { id: "g6", name: "Fire", emoji: "🔥", cost: 15 },
];

export const COIN_PACKAGES = [
  { id: "c1", coins: 50, price: "$0.99", bonus: 0 },
  { id: "c2", coins: 120, price: "$1.99", bonus: 20 },
  { id: "c3", coins: 400, price: "$5.99", bonus: 80 },
  { id: "c4", coins: 1000, price: "$12.99", bonus: 250 },
];

/* ---------------- Plus plans ---------------- */
export const PLUS_FEATURES = [
  { icon: "🌍", title: "Country choice", desc: "Match anywhere — pick any country, unlimited." },
  { icon: "♾️", title: "Unlimited matches", desc: "No daily cap. Keep swiping all night." },
  { icon: "👤", title: "Gender filters", desc: "Match with exactly who you want to meet." },
  { icon: "🚫", title: "No ads", desc: "Pure, uninterrupted vibes." },
  { icon: "⚡", title: "Priority queue", desc: "Skip the line. Get matched first." },
  { icon: "👀", title: "See who liked you", desc: "Know who's into you before you match." },
];

export const PLUS_PLANS = [
  { id: "monthly", label: "Monthly", price: "$4.99", per: "/mo", save: null, featured: false },
  { id: "yearly", label: "Yearly", price: "$29.99", per: "/yr", save: "Save 50%", featured: true },
  { id: "weekly", label: "Weekly", price: "$1.99", per: "/wk", save: null, featured: false },
];
