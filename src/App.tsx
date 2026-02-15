import { useEffect, useState } from "react";
import { type Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { Routes, Route, useLocation, useNavigate } from "react-router";
import CreateRecipe from "./pages/CreateRecipe";
import Recipes from "./pages/Recipes";
import { useTheme } from "./Hooks/useTheme";
import Header from "./Components/Header/Header";
import Profile from "./pages/Profile";
import HomePage from "./pages/HomePage";
import AuthModal from "./Components/AuthModal/AuthModal";
import OnboardingModal from "./Components/OnboardingModal/OnboardingModal";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarlUrl] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const { toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  /* ---------------- AUTH LISTENER ---------------- */

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  /* ---------------- OPEN MODAL VIA /auth ---------------- */

  useEffect(() => {
    if (location.pathname === "/auth") {
      setIsAuthOpen(true);
    }
  }, [location.pathname]);

  /* ---------------- PROFILE ---------------- */

  const fetchProfile = async () => {
    if (!session) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error(error.message);
      return;
    }

    if (!data || !data.display_name) {
      setUsername(null);
      setAvatarlUrl(null);
      setIsOnboardingOpen(true);
      return;
    }

    setUsername(data.display_name);
    setAvatarlUrl(data.avatar_url ?? null);
    setIsOnboardingOpen(false);
  };

  useEffect(() => {
    if (session) {
      fetchProfile();
    } else {
      setUsername(null);
      setAvatarlUrl(null);
      setIsOnboardingOpen(false);
    }
  }, [session]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <Header
        username={username}
        avatarUrl={avatarUrl}
        onLoginClick={() => setIsAuthOpen(true)}
      />

      {session && (
        <button onClick={() => supabase.auth.signOut()}>Logout</button>
      )}

      <button onClick={toggleTheme}>Toggle Dark Mode</button>

      <hr />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route
          path="/recipes/new"
          element={
            session ? (
              <CreateRecipe />
            ) : (
              <div>
                <p>You must log in to create a recipe.</p>
                <button onClick={() => setIsAuthOpen(true)}>Login</button>
              </div>
            )
          }
        />
        <Route path="/profile" element={<Profile />} />
      </Routes>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          if (location.pathname === "/auth") {
            navigate("/");
          }
        }}
        onAuthSuccess={(session) => {
          setSession(session);
          setIsAuthOpen(false);
        }}
      />

      {session && (
        <OnboardingModal
          userId={session.user.id}
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
          onComplete={fetchProfile}
        />
      )}
    </div>
  );
}

export default App;
