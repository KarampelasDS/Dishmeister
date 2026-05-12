import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
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
  isAuthOpen: boolean;
  setIsAuthOpen: (open: boolean) => void;
  showError: (message: string) => void;
  errorMsg: string;
  isErrorOpen: boolean;
  setIsErrorOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const [isErrorOpen, setIsErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const showError = (message: string) => {
    setErrorMsg(message);
    setIsErrorOpen(true);
  };

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
    let firstRun = true;

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
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);

      if (newSession) {
        fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
        setNeedsOnboarding(false);
      }

      // Handle refresh and cache clearing
      if (!firstRun) {
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
          // If we had a FeedCache invalidateAll, we would call it here
          // but since we are reloading the page, the in-memory cache
          // will be cleared anyway.
          window.location.reload();
        }
      }
      firstRun = false;
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
        isAuthOpen,
        setIsAuthOpen,
        showError,
        isErrorOpen,
        setIsErrorOpen,
        errorMsg,
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
