import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getDisplayName, getLocalUser, type LocalUser } from "@/lib/localUser";
import { syncDisplayNameToSupabase } from "@/lib/identitySync";

type AuthContextType = {
  user: User | LocalUser | null;
  session: Session | null;
  loading: boolean;
  isLocal: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isLocal: false,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? getLocalUser());
    });

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session: existing } }) => {
      if (existing) {
        setSession(existing);
        setUser(existing.user);
        setLoading(false);
        return;
      }
      // No session — silently create an anonymous Supabase user so every
      // visitor is persisted (on_auth_user_created trigger → profiles row).
      try {
        const { data, error } = await supabase.auth.signInAnonymously({
          options: {
            data: {
              display_name:
                getDisplayName() ?? getLocalUser().user_metadata.display_name,
            },
          },
        });
        if (error || !data.session) throw error ?? new Error("no session");
        // onAuthStateChange picks up the new session + user
      } catch {
        // Anonymous sign-ins disabled (or offline) — local-only identity fallback
        setSession(null);
        setUser(getLocalUser());
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Keep the Postgres profile in sync with the locally-chosen display name
  // (covers names picked/changed after the anonymous session was created).
  const syncedNameRef = useRef<string | null>(null);
  useEffect(() => {
    if (!session || !user) return;
    const name = getDisplayName();
    if (!name) return;
    const key = `${user.id}:${name}`;
    if (syncedNameRef.current === key) return;
    syncedNameRef.current = key;
    void syncDisplayNameToSupabase(name);
  }, [session, user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    // Fall back to local user after sign-out
    setUser(getLocalUser());
  };

  const isLocal = !session;

  return (
    <AuthContext.Provider value={{ user, session, loading, isLocal, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
