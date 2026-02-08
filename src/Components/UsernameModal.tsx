import { useState } from "react";
import { supabase } from "../supabase";
import { type Session } from "@supabase/supabase-js";

type Props = {
  session: Session;
  onSuccess: () => void;
};

function UsernameModal({ session, onSuccess }: Props) {
  const [usernameInput, setUsernameInput] = useState("");
  const [loading, setLoading] = useState(false);

  const submitUsername = async () => {
    const trimmed = usernameInput.trim();
    if (trimmed.length < 3) {
      alert("Username must be at least 3 characters");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("profiles").upsert(
      {
        id: session.user.id,
        username: trimmed,
      },
      { onConflict: "id" },
    );

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    onSuccess();
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2>Choose a username</h2>

        <input
          type="text"
          placeholder="username"
          value={usernameInput}
          onChange={(e) => setUsernameInput(e.target.value)}
        />

        <button onClick={submitUsername} disabled={loading}>
          {loading ? "Saving..." : "Submit"}
        </button>
      </div>
    </div>
  );
}

export default UsernameModal;

/* ---------- styles ---------- */

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: "#000000",
  padding: 24,
  borderRadius: 8,
  minWidth: 300,
};
