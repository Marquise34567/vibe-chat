import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { syncVisitorToSupabase } from "@/lib/identitySync";

/**
 * Heartbeats every 30s while mounted: signed-in users update
 * profiles.last_seen_at; guests upsert their `visitors` row,
 * so everyone who joins is tracked in Postgres.
 */
export const usePresence = () => {
  const { user, isLocal } = useAuth();

  useEffect(() => {
    if (!user) return;

    const ping = async () => {
      if (isLocal) {
        await syncVisitorToSupabase();
        return;
      }
      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", user.id);
    };

    ping();
    const interval = setInterval(ping, 30_000);
    return () => clearInterval(interval);
  }, [user, isLocal]);
};
