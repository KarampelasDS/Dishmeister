import { useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "../supabase";

type Props = {
  userId: string;
  onSuccess: () => void;
};

function UsernameModal({ userId, onSuccess }: Props) {
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
        id: userId,
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

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle: CSSProperties = {
  background: "#000000",
  padding: 24,
  borderRadius: 8,
  minWidth: 300,
};
