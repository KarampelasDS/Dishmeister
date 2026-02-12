import { useEffect, useState } from "react";
import { type Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { Routes, Route } from "react-router";
import Auth from "./pages/Auth";
import CreateRecipe from "./pages/CreateRecipe";
import UsernameModal from "./Components/UsernameModal";
import Onboarding from "./pages/Onboarding";
import Recipes from "./pages/Recipes";
import { useTheme } from "./Hooks/useTheme";
import Header from "./Components/Header/Header";
import Button from "./Components/Button/Button";
import Profile from "./pages/Profile";
import HomePage from "./pages/HomePage";
import AuthModal from "./Components/AuthModal/AuthModal";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarlUrl] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { toggleTheme } = useTheme();

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

  /* ---------------- PROFILE ---------------- */

  const fetchProfile = async () => {
    if (!session) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error(error.message);
      return;
    }

    if (!data) {
      setUsername(null);
      setAvatarlUrl(null);
      return;
    }

    setUsername(data.username ?? null);
    setAvatarlUrl(data.avatar_url ?? null);
  };

  useEffect(() => {
    if (session) {
      fetchProfile();
    } else {
      setUsername(null);
      setAvatarlUrl(null);
    }
  }, [session]);

  /* ---------------- LOADING ---------------- */

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <Header
        username={username}
        avatarUrl={avatarUrl}
        onLoginClick={() => setIsAuthOpen(true)}
      />

      {session && username === null && (
        <UsernameModal userId={session.user.id} onSuccess={fetchProfile} />
      )}

      {/* DEV ONLY */}
      {session && (
        <button onClick={() => supabase.auth.signOut()}>Logout</button>
      )}

      <button onClick={toggleTheme}>Toggle Dark Mode</button>

      <hr />

      {/* App pages */}
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
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(session) => setSession(session)}
      />
    </div>
  );
}

export default App;
