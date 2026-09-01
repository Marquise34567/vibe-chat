import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getCoinBalance, addCoins, spendCoins } from "@/lib/supabaseQueries";

/**
 * useCoins — real Supabase-backed coin balance.
 * Falls back to 0 if no user or query fails.
 */
export const useCoins = () => {
  const { user } = useAuth();
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setCoins(0); setLoading(false); return; }
    try {
      const balance = await getCoinBalance(user.id);
      setCoins(balance);
    } catch {
      setCoins(0);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const buy = useCallback(async (amount: number) => {
    if (!user) return;
    await addCoins(user.id, amount, "purchase");
    setCoins((c) => c + amount);
  }, [user]);

  const spend = useCallback(async (amount: number): Promise<boolean> => {
    if (!user) return false;
    const ok = await spendCoins(user.id, amount, "gift");
    if (ok) setCoins((c) => c - amount);
    return ok;
  }, [user]);

  return { coins, loading, buy, spend, refresh };
};
