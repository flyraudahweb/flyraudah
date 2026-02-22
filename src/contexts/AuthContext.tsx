import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: { full_name: string | null; phone: string | null; avatar_url: string | null } | null;
  roles: AppRole[];
  loading: boolean;
  rolesLoaded: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; roles: AppRole[] }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const signInRolesSetRef = useRef(false);
  const loadingForRef = useRef<string | null>(null);

  /** Fetch profile + roles — silently no-ops on network failure */
  const fetchUserData = async (userId: string) => {
    try {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("full_name, phone, avatar_url").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (rolesRes.data) setRoles(rolesRes.data.map((r) => r.role));
    } catch {
      // Network failure — keep whatever state we had; will retry on next mount/focus
    }
  };

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      const newUserId = session?.user?.id ?? null;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // If we are already signed in as this user and roles are loaded, skip
        if (loadingForRef.current === session.user.id && rolesLoaded) {
          return;
        }

        // Check if signIn() is already handling this login
        if (signInRolesSetRef.current) {
          // We don't reset the ref here; let signIn handle its own lifecycle
          return;
        }

        loadingForRef.current = session.user.id;
        fetchUserData(session.user.id).then(() => {
          if (isMounted && loadingForRef.current === session.user.id) {
            setRolesLoaded(true);
          }
        });
      } else {
        // Only clear if we are genuinely signing out
        if (event === "SIGNED_OUT" || !session) {
          loadingForRef.current = null;
          setProfile(null);
          setRoles([]);
          setRolesLoaded(false);
        }
      }
    });

    // Initial session load — always resolves (session is local storage, no network needed)
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserData(session.user.id);
          if (isMounted) setRolesLoaded(true);
        }
      })
      .catch(() => {
        // getSession failed entirely — still unblock the loading screen
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, phone: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName, phone },
        },
      });
      return { error: error as Error | null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: Error | null; roles: AppRole[] }> => {
    setLoading(true);
    setRolesLoaded(false);
    try {
      signInRolesSetRef.current = true;

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        signInRolesSetRef.current = false;
        setLoading(false);
        return { error: error as Error, roles: [] };
      }

      if (data.user && data.session) {
        try {
          // Micro-delay to ensure the primary client session state has propagated
          await new Promise((resolve) => setTimeout(resolve, 0));

          const [profileRes, rolesRes] = await Promise.all([
            supabase.from("profiles").select("full_name, phone, avatar_url").eq("id", data.user.id).maybeSingle(),
            supabase.from("user_roles").select("role").eq("user_id", data.user.id),
          ]);

          if (profileRes.data) setProfile(profileRes.data);
          const fetchedRoles = rolesRes.data?.map((r) => r.role as AppRole) ?? [];

          loadingForRef.current = data.user.id;
          setRoles(fetchedRoles);
          setRolesLoaded(true);

          return { error: null, roles: fetchedRoles };
        } catch (fetchErr) {
          setRolesLoaded(true);
          return { error: null, roles: [] };
        }
      }
      return { error: null, roles: [] };
    } catch (err) {
      signInRolesSetRef.current = false;
      return { error: err as Error, roles: [] };
    } finally {
      // Small safety delay before unblocking global loading
      setTimeout(() => {
        if (loadingForRef.current) {
          setLoading(false);
          setRolesLoaded(true); // Final safety to ensure observers trigger
        }
        signInRolesSetRef.current = false;
      }, 150);
    }
  };

  const signOut = async () => {
    setLoading(true);
    signInRolesSetRef.current = false;
    loadingForRef.current = null;
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setRoles([]);
      setRolesLoaded(false);
      // Ensure UI is unblocked after state is cleared
      setTimeout(() => setLoading(false), 100);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error: error as Error | null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      return { error: error as Error | null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider value={{ session, user, profile, roles, loading, rolesLoaded, signUp, signIn, signOut, resetPassword, updatePassword, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};
