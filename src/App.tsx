import { useEffect, useState } from "react";
import { type Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import Auth from "./pages/Auth";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState<string>("");

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
      console.error("Profile fetch failed:", error.message);
      return;
    }

    setUsername(data.username);
  };

  useEffect(() => {
    if (!session) return;
    fetchProfile();
  }, [session]);

  /* ---------------- UPDATE USERNAME ---------------- */

  const submitUsername = async () => {
    if (!session) return;

    const trimmed = usernameInput.trim();

    if (trimmed.length < 3) {
      alert("Username must be at least 3 characters long");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ username: trimmed })
      .eq("id", session.user.id);

    if (error) {
      alert(error.message);
      return;
    }

    setUsernameInput("");
    fetchProfile();
  };

  /* ---------------- UI ---------------- */

  if (loading) return <div>Loading...</div>;
  if (!session) return <Auth />;

  return (
    <div style={{ padding: 24 }}>
      <p>
        Logged in as <strong>{username ?? "anonymous"}</strong>
      </p>

      {username === null ? (
        <div>
          <p>You need to set a username</p>

          <input
            type="text"
            placeholder="username"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
          />

          <button onClick={submitUsername}>Submit</button>
        </div>
      ) : (
        <p>Your username is: {username}</p>
      )}

      <button onClick={() => supabase.auth.signOut()}>Logout</button>
    </div>
  );
}

export default App;
