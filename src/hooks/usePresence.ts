import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Heartbeats the current user's last_seen_at every 30s while mounted,
 * so the lobby can show them as "online". No-op for local (non-Supabase) users.
 */
export const usePresence = () => {
  const { user, isLocal } = useAuth();

  useEffect(() => {
    if (!user || isLocal) return;

    const ping = async () => {
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
