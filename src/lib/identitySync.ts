import { supabase } from "@/integrations/supabase/client";
import { getDisplayName, getLocalProfile, getLocalUser } from "@/lib/localUser";

/**
 * Persists every visitor to the `visitors` table via the `record_visitor`
 * SECURITY DEFINER RPC — no auth required, and the anon key gets zero direct
 * table access (visitors can't be enumerated via PostgREST). Upserts on the
 * stable local user id and doubles as the guest last_seen_at heartbeat.
 */
export const syncVisitorToSupabase = async (): Promise<void> => {
  const user = getLocalUser();
  const profile = getLocalProfile();
  const { error } = await supabase.rpc("record_visitor", {
    p_id: user.id,
    p_display_name: getDisplayName() ?? user.user_metadata.display_name,
    p_gender: profile.gender,
    p_country: profile.country,
  });
  if (error) console.warn("[identity] visitor sync failed:", error.message);
};
