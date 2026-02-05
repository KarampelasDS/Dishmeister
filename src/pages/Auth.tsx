import { useState } from "react";
import { supabase } from "../supabase";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signUp = async () => {
    setLoading(true);
    setError(null);
    setInfo(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setInfo(
      "If an account with this email exists, we’ve sent you a confirmation email. Please check your inbox.",
    );

    setLoading(false);
  };

  const signIn = async () => {
    setLoading(true);
    setError(null);
    setInfo(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Invalid email or password");
    }

    setLoading(false);
  };

  return (
    <div>
      <h2>Dishmeister Auth</h2>

      <input
        type="email"
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={signUp} disabled={loading}>
        Sign Up
      </button>

      <button onClick={signIn} disabled={loading}>
        Sign In
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {info && <p style={{ color: "green" }}>{info}</p>}
    </div>
  );
}
