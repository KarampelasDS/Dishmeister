import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  needsOnboarding: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  /* ---------------- FETCH PROFILE ---------------- */

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, username")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(error.message);
      return;
    }

    if (!data || !data.display_name) {
      setProfile(null);
      setNeedsOnboarding(true);
      return;
    }

    setProfile({
      display_name: data.display_name,
      avatar_url: data.avatar_url ?? null,
      username: data.username ?? null,
    });

    setNeedsOnboarding(false);
  };

  /* ---------------- AUTH INIT ---------------- */

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const currentSession = data.session;
      setSession(currentSession);

      if (currentSession) {
        fetchProfile(currentSession.user.id);
      }

      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);

      if (newSession) {
        fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
        setNeedsOnboarding(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (!session) return;
    await fetchProfile(session.user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        needsOnboarding,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ---------------- HOOK ---------------- */

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
