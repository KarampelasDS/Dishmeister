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
    let lastUserId = "";
    let isInitialized = false;

    supabase.auth.getSession().then(({ data }) => {
      const currentSession = data.session;
      setSession(currentSession);
      lastUserId = currentSession?.user?.id || "";

      if (currentSession) {
        fetchProfile(currentSession.user.id);
      }

      setLoading(false);
      // We don't set isInitialized = true here because onAuthStateChange 
      // will also fire its initial event, and we want to capture that first.
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      const newUserId = newSession?.user?.id || "";
      setSession(newSession);

      if (newSession) {
        fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
        setNeedsOnboarding(false);
      }

      // Handle refresh and cache clearing
      // We only reload if the user ID has actually changed (e.g. login/logout)
      // and only after the initial session has been established/processed.
      if (isInitialized && (event === "SIGNED_IN" || event === "SIGNED_OUT")) {
        if (newUserId !== lastUserId) {
          // If we are reloading and there's an auth token in the hash, 
          // we should redirect to the clean URL to prevent an infinite loop.
          if (window.location.hash.includes("access_token") || window.location.hash.includes("error")) {
            window.location.href = window.location.origin + window.location.pathname;
          } else {
            window.location.reload();
          }
        }
      }

      lastUserId = newUserId;
      isInitialized = true;
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
