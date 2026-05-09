import { useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "../supabase";
import ErrorModal from "./ErrorModal/ErrorModal";


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
  const [errorModal, setErrorModal] = useState({ open: false, message: "" });


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorModal({ open: true, message: "Only image files allowed" });
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
      setErrorModal({ open: true, message: uploadError.message });
      return null;
    }


    // Manually build public URL using env variable
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${filePath}`;

    return publicUrl;
  };

  const submit = async () => {
    const trimmed = usernameInput.trim();

    if (trimmed.length < 3) {
      setErrorModal({ open: true, message: "Username must be at least 3 characters" });
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
      setErrorModal({ open: true, message: error.message });
      return;
    }


    onSuccess();
  };

  return (
    <div style={overlayStyle}>
      <ErrorModal
        isOpen={errorModal.open}
        onClose={() => setErrorModal({ ...errorModal, open: false })}
        message={errorModal.message}
      />
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
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.6)",
  backdropFilter: "blur(8px)",
  zIndex: 10000,
};



const modalStyle: CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  margin: "auto",
  
  width: "90%",
  maxWidth: 400,
  height: "fit-content",
  maxHeight: "90vh",
  overflowY: "auto",
  
  background: "#000000",
  padding: 24,
  borderRadius: 16,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  zIndex: 10001,
  boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
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
