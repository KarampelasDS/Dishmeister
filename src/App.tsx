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

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarlUrl] = useState<string | null>(null);
  const { toggleTheme } = useTheme();

  /* ---------------- AUTH ---------------- */

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

    if (data.avatar_url) {
      setAvatarlUrl(data.avatar_url);
    } else {
      setAvatarlUrl(null);
    }
  };

  useEffect(() => {
    if (!session) return;
    fetchProfile();
  }, [session]);

  /* ---------------- UI ---------------- */

  if (loading) return <div>Loading...</div>;
  if (!session) return <Auth />;

  return (
    <div>
      <Header username={username} avatarUrl={avatarUrl} />
      {/* Global UI */}
      <p>
        Logged in as <strong>{username ?? "anonymous"}</strong>
      </p>

      {username === null && (
        <UsernameModal userId={session.user.id} onSuccess={fetchProfile} />
      )}

      <button onClick={() => supabase.auth.signOut()}>Logout</button>
      <button onClick={toggleTheme}>Toggle Dark Mode</button>
      <hr />


      {/* App pages */}
      <Routes>
        <Route path="/" element={<Onboarding session={session} />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/recipes/new" element={<CreateRecipe />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </div>
  );
}

export default App;
