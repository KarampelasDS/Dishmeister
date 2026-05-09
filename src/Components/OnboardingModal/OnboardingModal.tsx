import { useEffect, useState, useRef } from "react";
import { supabase } from "../../supabase";
import styles from "./OnboardingModal.module.css";
import Button from "../Button/Button";
import { useAuth } from "../../Context/AuthProvider";
import PhotoEditor from "../PhotoEditor/PhotoEditor";
import { compressImage } from "../../utils/compressImage";

const AVATAR_BUCKET = "avatars";
const MAX_FILE_MB = 2;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function OnboardingModal({ isOpen, onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { session, refreshProfile } = useAuth();

  const userId = session?.user.id;

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState<boolean>(false);
  const [fileKey, setFileKey] = useState(0);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  useEffect(() => {
    if (!avatarFile) {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
  }, [isOpen]);

  if (!isOpen) return null;

  if (!userId) {
    return null;
  }

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const validateAvatar = (file: File) => {
    const isImage = file.type.startsWith("image/");
    if (!isImage) return "Avatar must be an image file.";

    const maxBytes = MAX_FILE_MB * 1024 * 1024;
    if (file.size > maxBytes) return `Avatar must be under ${MAX_FILE_MB}MB.`;

    return null;
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    const validationError = validateAvatar(file);
    if (validationError) {
      setAvatarFile(null);
      setAvatarPath(null);
      setError(validationError);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (fileInputRef.current) fileInputRef.current.value = "";

    setFileKey((k) => k + 1);
    setAvatarFile(file);
    setAvatarPath(null);
    setAvatarEditorOpen(true);
  };

  const uploadAvatarIfNeeded = async () => {
    if (!avatarFile) return avatarPath;

    const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "png";
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const path = `${userId}/${fileName}`;

    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, avatarFile, { cacheControl: "31536000", upsert: true });

    if (error) throw error;

    await supabase.from("storage_objects").insert({
      bucket: AVATAR_BUCKET,
      path,
      uploaded_by: userId,
    });

    return path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^[a-z0-9_]+$/.test(username)) {
      setError(
        "Username can only contain lowercase letters, numbers, and underscores.",
      );
      return;
    }

    try {
      setLoading(true);

      const uploadedPath = await uploadAvatarIfNeeded();

      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        username,
        display_name: displayName,
        bio,
        avatar_url: uploadedPath ?? null,
      });

      if (error) throw error;

      if (uploadedPath) {
        await supabase
          .from("storage_objects")
          .update({ referenced: true })
          .eq("bucket", AVATAR_BUCKET)
          .eq("path", uploadedPath);
      }

      await refreshProfile();
      onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onMouseDown={handleBackdrop}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h1>Complete Your Profile</h1>
          <p>Let's set up your chef profile!</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* AVATAR ROW */}
          <div className={styles.avatarRow}>
            <div className={styles.avatarCircle}>
              {avatarPreviewUrl ? (
                <img
                  src={avatarPreviewUrl}
                  alt="Avatar preview"
                  className={styles.avatarImg}
                />
              ) : (
                <div className={styles.avatarPlaceholder} />
              )}
            </div>

            <div className={styles.avatarActions}>
              <label className={styles.uploadBtn}>
                Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className={styles.fileInput}
                  ref={fileInputRef}
                />
              </label>

              {avatarFile && (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={() => {
                    setAvatarFile(null);
                    setAvatarPath(null);
                    setAvatarEditorOpen(false);
                    setError(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {avatarEditorOpen && avatarFile && (
            <PhotoEditor
              key={fileKey}
              onClose={() => {
                if (!compressing) setAvatarEditorOpen(false);
              }}
              onSave={async (canvas) => {
                if (!canvas) return;

                const blob = await new Promise<Blob | null>((resolve) =>
                  canvas.toBlob(resolve, "image/png", 0.9),
                );

                if (!blob) return;
                setCompressing(true);
                const raw = new File([blob], "avatar.png", {
                  type: "image/png",
                });
                const compressed = await compressImage(raw, "profile");
                setCompressing(false);

                setAvatarFile(compressed);
                setAvatarEditorOpen(false);
              }}
              onChangePhoto={() => {
                if (!compressing) fileInputRef.current?.click();
              }}
              imageFile={avatarFile}
            />
          )}

          <label>
            Username <span>*</span>
          </label>

          <div className={styles.usernameWrapper}>
            <span className={styles.usernamePrefix}>@</span>
            <input
              type="text"
              value={username}
              placeholder="chef_username"
              onChange={(e) =>
                setUsername(
                  e.target.value
                    .toLowerCase()
                    .replace(/\s/g, "")
                    .replace(/@/g, ""),
                )
              }
              className={styles.usernameInput}
              required
            />
          </div>

          <small>
            Only lowercase letters, numbers, and underscores are allowed.
          </small>

          <label>
            Display Name <span>*</span>
          </label>
          <input
            type="text"
            value={displayName}
            placeholder="Your Full Name"
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <small>
            This is the name that will be displayed when viewing your profile.
          </small>

          <label>Bio</label>
          <textarea
            maxLength={150}
            value={bio}
            placeholder="Tell us about yourself..."
            onChange={(e) => setBio(e.target.value)}
          />
          <small>{bio.length}/150 characters</small>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.submit}>
            <Button
              backgroundColor="linear-gradient(135deg, #ff6a00, #ff2e2e)"
              textColor="#fff"
              isActive={!loading}
              outline="0px"
              type="submit"
            >
              {loading ? "Saving..." : "Complete Setup & Start Cooking 🍳"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
