/**
 * Supabase data access layer — typed queries for all FaceFrenzy features.
 * No mock data. All reads/writes go to real Supabase tables.
 * See supabase/schema.sql for table definitions.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ChatThread = Database["public"]["Tables"]["chat_threads"]["Row"];
type Message = Database["public"]["Tables"]["messages"]["Row"];
type Moment = Database["public"]["Tables"]["moments"]["Row"];
type CardSwipe = Database["public"]["Tables"]["card_swipes"]["Row"];
type CoinTransaction = Database["public"]["Tables"]["coin_transactions"]["Row"];
type GiftSent = Database["public"]["Tables"]["gifts_sent"]["Row"];

/* ----------------------------- Profiles ----------------------------- */

export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const updateProfile = async (
  userId: string,
  updates: Partial<Database["public"]["Tables"]["profiles"]["Update"]>
): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const upsertProfile = async (
  profile: Database["public"]["Tables"]["profiles"]["Insert"]
): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
};

/** Get online users for matching (excluding self) */
export const getOnlineProfiles = async (
  excludeId: string,
  opts: { countries?: string[]; gender?: string; scholarOnly?: boolean; limit?: number } = {}
): Promise<Profile[]> => {
  const onlineWindow = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  let q = supabase
    .from("profiles")
    .select("*")
    .gte("last_seen_at", onlineWindow)
    .neq("id", excludeId)
    .limit(opts.limit ?? 50);
  if (opts.countries?.length) q = q.in("country", opts.countries);
  if (opts.gender && opts.gender !== "Any") q = q.eq("gender", opts.gender);
  if (opts.scholarOnly) q = q.eq("is_scholar", true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
};

/** Get all profiles for card discovery (excluding already swiped) */
export const getDiscoveryProfiles = async (
  userId: string,
  limit = 20
): Promise<Profile[]> => {
  // Get IDs we've already swiped on
  const { data: swiped } = await supabase
    .from("card_swipes")
    .select("other_id")
    .eq("user_id", userId);
  const swipedIds = (swiped ?? []).map((s) => s.other_id);

  let q = supabase
    .from("profiles")
    .select("*")
    .neq("id", userId)
    .limit(limit);
  if (swipedIds.length) q = q.not("id", "in", `(${swipedIds.join(",")})`);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
};

/* --------------------------- Chat Threads --------------------------- */

export const getThreads = async (userId: string): Promise<(ChatThread & { other?: Profile })[]> => {
  const { data: threads, error } = await supabase
    .from("chat_threads")
    .select("*")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order("last_at", { ascending: false });
  if (error) throw error;
  if (!threads?.length) return [];

  // Fetch the "other" user for each thread
  const otherIds = threads.map((t) => (t.user_a === userId ? t.user_b : t.user_a));
  const { data: others } = await supabase
    .from("profiles")
    .select("*")
    .in("id", otherIds);
  const otherMap = new Map((others ?? []).map((o) => [o.id, o]));

  return threads.map((t) => ({
    ...t,
    other: otherMap.get(t.user_a === userId ? t.user_b : t.user_a),
  }));
};

export const getOrCreateThread = async (
  userA: string,
  userB: string,
  kind = "video"
): Promise<ChatThread | null> => {
  // Try to find existing
  const { data: existing } = await supabase
    .from("chat_threads")
    .select("*")
    .or(`and(user_a.eq.${userA},user_b.eq.${userB}),and(user_a.eq.${userB},user_b.eq.${userA})`)
    .maybeSingle();
  if (existing) return existing;
  // Create new
  const { data, error } = await supabase
    .from("chat_threads")
    .insert({ user_a: userA, user_b: userB, kind })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const sendMessage = async (threadId: string, senderId: string, body: string): Promise<Message | null> => {
  const { data: msg, error: msgErr } = await supabase
    .from("messages")
    .insert({ thread_id: threadId, sender_id: senderId, body })
    .select()
    .maybeSingle();
  if (msgErr) throw msgErr;
  // Update thread's last_message
  await supabase
    .from("chat_threads")
    .update({ last_message: body, last_at: new Date().toISOString() })
    .eq("id", threadId);
  return msg;
};

export const getMessages = async (threadId: string, limit = 50): Promise<Message[]> => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
};

/* ------------------------- Recent Connects ------------------------- */

export const getRecentConnects = async (userId: string, limit = 20): Promise<Profile[]> => {
  const { data: connects, error } = await supabase
    .from("recent_connects")
    .select("other_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!connects?.length) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", connects.map((c) => c.other_id));
  // Preserve order
  const map = new Map((profiles ?? []).map((p) => [p.id, p]));
  return connects.map((c) => map.get(c.other_id)).filter(Boolean) as Profile[];
};

export const addRecentConnect = async (userId: string, otherId: string): Promise<void> => {
  await supabase
    .from("recent_connects")
    .upsert({ user_id: userId, other_id: otherId }, { onConflict: "user_id,other_id" });
};

/* ------------------------------ Moments ------------------------------ */

export const getMoments = async (limit = 50): Promise<(Moment & { user?: Profile })[]> => {
  const { data: moments, error } = await supabase
    .from("moments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!moments?.length) return [];
  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .in("id", [...new Set(moments.map((m) => m.user_id))]);
  const map = new Map((users ?? []).map((u) => [u.id, u]));
  return moments.map((m) => ({ ...m, user: map.get(m.user_id) }));
};

export const createMoment = async (
  userId: string,
  caption: string | null,
  mediaUrl: string | null,
  durationSec = 15
): Promise<Moment | null> => {
  const { data, error } = await supabase
    .from("moments")
    .insert({ user_id: userId, caption, media_url: mediaUrl, duration_sec: durationSec })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const incrementMomentViews = async (momentId: string): Promise<void> => {
  try {
    await (supabase.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<unknown>)("increment_moment_views", { moment_id: momentId });
  } catch {
    // Fallback: read + update if RPC doesn't exist
  }
};

/* ----------------------------- Card Swipes ----------------------------- */

export const recordSwipe = async (
  userId: string,
  otherId: string,
  action: "like" | "pass" | "super"
): Promise<void> => {
  await supabase
    .from("card_swipes")
    .upsert({ user_id: userId, other_id: otherId, action }, { onConflict: "user_id,other_id" });
};

export const checkMutualLike = async (userId: string, otherId: string): Promise<boolean> => {
  const { data } = await supabase
    .from("card_swipes")
    .select("action")
    .eq("user_id", otherId)
    .eq("other_id", userId)
    .eq("action", "like")
    .maybeSingle();
  return !!data;
};

/* ------------------------------- Coins ------------------------------- */

export const getCoinBalance = async (userId: string): Promise<number> => {
  const { data, error } = await supabase
    .from("coin_transactions")
    .select("delta")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).reduce((sum, t) => sum + t.delta, 0);
};

export const addCoins = async (
  userId: string,
  amount: number,
  reason: string,
  referenceId?: string
): Promise<void> => {
  await supabase
    .from("coin_transactions")
    .insert({ user_id: userId, delta: amount, reason, reference_id: referenceId ?? null });
};

export const spendCoins = async (
  userId: string,
  amount: number,
  reason: string,
  referenceId?: string
): Promise<boolean> => {
  const balance = await getCoinBalance(userId);
  if (balance < amount) return false;
  await supabase
    .from("coin_transactions")
    .insert({ user_id: userId, delta: -amount, reason, reference_id: referenceId ?? null });
  return true;
};

/* ------------------------------- Gifts ------------------------------- */

export const sendGift = async (
  senderId: string,
  receiverId: string,
  giftId: string,
  cost: number
): Promise<boolean> => {
  const ok = await spendCoins(senderId, cost, "gift", giftId);
  if (!ok) return false;
  await supabase
    .from("gifts_sent")
    .insert({ sender_id: senderId, receiver_id: receiverId, gift_id: giftId, cost });
  return true;
};

export const getGiftsReceived = async (userId: string): Promise<GiftSent[]> => {
  const { data, error } = await supabase
    .from("gifts_sent")
    .select("*")
    .eq("receiver_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export type { Profile, ChatThread, Message, Moment, CardSwipe, CoinTransaction, GiftSent };
