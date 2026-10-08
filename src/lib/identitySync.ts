import { supabase } from "@/integrations/supabase/client";

/**
 * Persists the chosen display name to Supabase — auth user_metadata + the
 * profiles row (auto-created by the on_auth_user_created trigger).
 * No-op when there's no session (fully-local fallback users).
 */
export const syncDisplayNameToSupabase = async (name: string): Promise<void> => {
  const trimmed = name.trim();
  if (!trimmed) return;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;
  await Promise.all([
    supabase.auth.updateUser({ data: { display_name: trimmed } }),
    supabase.from("profiles").upsert({ id: session.user.id, display_name: trimmed }),
  ]);
};
