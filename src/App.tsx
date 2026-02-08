import { useEffect, useState } from "react";
import { type Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { Routes, Route, Navigate } from "react-router";
import Auth from "./pages/Auth";
import CreateRecipe from "./pages/CreateRecipe";
import UsernameModal from "./components/UsernameModal";
import Onboarding from "./pages/Onboarding";
import Recipes from "./pages/Recipes";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

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
      .select("username")
      .eq("id", session.user.id)
      .single();

    if (error) {
      console.error(error.message);
      return;
    }

    setUsername(data.username);
  };

  useEffect(() => {
    if (!session) return;
    fetchProfile();
  }, [session]);

  /* ---------------- UI ---------------- */

  if (loading) return <div>Loading...</div>;
  if (!session) return <Auth />;

  return (
    <div style={{ padding: 24 }}>
      {/* Global UI */}
      <p>
        Logged in as <strong>{username ?? "anonymous"}</strong>
      </p>

      {username === null && (
        <UsernameModal userId={session.user.id} onSuccess={fetchProfile} />
      )}

      <button onClick={() => supabase.auth.signOut()}>Logout</button>

      <hr />

      {/* App pages */}
      <Routes>
        <Route path="/" element={<Onboarding session={session} />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/recipes/new" element={<CreateRecipe />} />
      </Routes>
    </div>
  );
}

export default App;
