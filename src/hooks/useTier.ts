import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TIER_FEATURES, Tier } from "@/lib/tiers";
import { getLocalProfile, saveLocalProfile } from "@/lib/localUser";

export const useTier = () => {
  const { user, isLocal } = useAuth();
  const [tier, setTier] = useState<Tier>("free");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setTier("free");
      setLoading(false);
      return;
    }
    // Local user — read from localStorage
    if (isLocal) {
      const profile = getLocalProfile();
      setTier(profile.subscription_tier);
      setLoading(false);
      return;
    }
    // Supabase user — read from profiles table
    const { data } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle();
    setTier((data?.subscription_tier as Tier) ?? "free");
    setLoading(false);
  }, [user, isLocal]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setTierDirect = (next: Tier) => {
    setTier(next);
    if (isLocal) saveLocalProfile({ subscription_tier: next });
  };

  return { tier, features: TIER_FEATURES[tier], loading, refresh, setTier: setTierDirect };
};
