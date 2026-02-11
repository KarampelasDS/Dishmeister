import { useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "../supabase";

type Props = {
  userId: string;
  onSuccess: () => void;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function UsernameModal({ userId, onSuccess }: Props) {
  const [usernameInput, setUsernameInput] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Only image files allowed");
      return;
    }

    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return null;

    const filePath = `${userId}/avatar.png`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, avatarFile, { upsert: true });

    if (uploadError) {
      alert(uploadError.message);
      return null;
    }

    // Manually build public URL using env variable
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${filePath}`;

    return publicUrl;
  };

  const submit = async () => {
    const trimmed = usernameInput.trim();

    if (trimmed.length < 3) {
      alert("Username must be at least 3 characters");
      return;
    }

    setLoading(true);

    const avatarUrl = await uploadAvatar();

    const { error } = await supabase
      .from("profiles")
      .update({
        username: trimmed,
        ...(avatarUrl && { avatar_url: avatarUrl }),
      })
      .eq("id", userId);

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
        <h2>Complete your profile</h2>

        <div style={{ marginBottom: 16, textAlign: "center" }}>
          <div style={avatarPreviewStyle}>
            {previewUrl ? (
              <img src={previewUrl} alt="preview" style={avatarImageStyle} />
            ) : (
              <span style={{ color: "#888" }}>No avatar</span>
            )}
          </div>

          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={loading}
          />
        </div>

        <input
          type="text"
          placeholder="username"
          value={usernameInput}
          onChange={(e) => setUsernameInput(e.target.value)}
          disabled={loading}
        />

        <button onClick={submit} disabled={loading}>
          {loading ? "Saving..." : "Finish"}
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
  minWidth: 320,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const avatarPreviewStyle: CSSProperties = {
  width: 120,
  height: 120,
  borderRadius: "50%",
  background: "#222",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 8px auto",
  overflow: "hidden",
};

const avatarImageStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};
