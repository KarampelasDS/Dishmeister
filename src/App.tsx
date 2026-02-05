import { useEffect, useState } from "react";
import { type Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import Auth from "./pages/Auth";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div>Loading...</div>;
  if (!session) return <Auth />;

  return (
    <div>
      <p>Logged in as {session.user.email}</p>
      <button onClick={() => supabase.auth.signOut()}>Logout</button>
    </div>
  );
}

export default App;
