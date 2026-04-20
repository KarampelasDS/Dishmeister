import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../supabase";
import { useAuth } from "../Context/AuthProvider";
import PhotoEditor from "../Components/PhotoEditor/PhotoEditor";
import Button from "../Components/Button/Button";
import styles from "./EditProfilePage.module.css";

const AVATAR_BUCKET = "avatars";
const MAX_FILE_MB = 2;
const SUPABASE_AVATAR_URL = import.meta.env
  .VITE_SUPABASE_PROFILE_BUCKET_URL as string;

type ProfileFields = {
  username: string;
  display_name: string;
  bio: string;
  username_changed_at: string | null;
};

export default function EditProfilePage() {
  const { session, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fields, setFields] = useState<ProfileFields>({
    username: "",
    display_name: "",
    bio: "",
    username_changed_at: null,
  });
  const [originalUsername, setOriginalUsername] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [currentAvatarPath, setCurrentAvatarPath] = useState<string | null>(
    null,
  );
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [fileKey, setFileKey] = useState(0);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Derived: is the username field locked?
  const usernameChangedAt = fields.username_changed_at
    ? new Date(fields.username_changed_at)
    : null;
  const usernameUnlockDate = usernameChangedAt
    ? new Date(usernameChangedAt.getTime() + 14 * 24 * 60 * 60 * 1000)
    : null;
  const usernameIsLocked = usernameUnlockDate
    ? usernameUnlockDate > new Date()
    : false;

  useEffect(() => {
    if (!session?.user.id) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, display_name, bio, avatar_url, username_changed_at")
        .eq("id", session.user.id)
        .single();

      if (error || !data) {
        setError("Failed to load profile.");
        setFetching(false);
        return;
      }

      setFields({
        username: data.username ?? "",
        display_name: data.display_name ?? "",
        bio: data.bio ?? "",
        username_changed_at: data.username_changed_at ?? null,
      });
      setOriginalUsername(data.username ?? "");
      setCurrentAvatarPath(data.avatar_url ?? null);
      setFetching(false);
    };

    fetchProfile();
  }, [session?.user.id]);

  // Avatar preview URL
  useEffect(() => {
    if (!avatarFile) return;
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Avatar must be an image file.");
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`Avatar must be under ${MAX_FILE_MB}MB.`);
      return;
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    setFileKey((k) => k + 1);
    setAvatarFile(file);
    setAvatarEditorOpen(true);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !session?.user.id) return currentAvatarPath;

    const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, avatarFile, { upsert: true });

    if (error) throw error;
    return path;
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    if (!/^[a-z0-9_]+$/.test(fields.username)) {
      setError(
        "Username can only contain lowercase letters, numbers, and underscores.",
      );
      return;
    }

    if (!fields.display_name.trim()) {
      setError("Display name is required.");
      return;
    }

    try {
      setLoading(true);
      const uploadedPath = await uploadAvatar();

      const { error } = await supabase
        .from("profiles")
        .update({
          username: fields.username,
          display_name: fields.display_name.trim(),
          bio: fields.bio.trim(),
          avatar_url: uploadedPath,
        })
        .eq("id", session!.user.id);

      if (error) throw error;

      await refreshProfile();
      setOriginalUsername(fields.username);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
      location.reload();
      location.href = `/profiles/${fields.username}`;
    }
  };

  const avatarDisplayUrl =
    avatarPreviewUrl ??
    (currentAvatarPath ? `${SUPABASE_AVATAR_URL}/${currentAvatarPath}` : null);

  if (fetching) return <p style={{ padding: "2rem" }}>Loading...</p>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1>Edit Profile</h1>
      </div>

      <div className={styles.layout}>
        {/* SIDEBAR */}
        <div className={styles.sidebar}>
          <div className={styles.avatarWrap}>
            {avatarDisplayUrl ? (
              <img
                src={avatarDisplayUrl}
                alt="Avatar"
                className={styles.avatar}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "/public/defaultAvatar.png";
                }}
              />
            ) : (
              <div className={styles.avatarFallback}>
                {fields.display_name?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}

            <button
              className={styles.avatarEditBtn}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              {/* camera icon */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
          </div>

          <input
            ref={fileInputRef}
            key={fileKey}
            type="file"
            accept="image/*"
            className={styles.hiddenInput}
            onChange={handleAvatarChange}
          />

          <p className={styles.sidebarName}>{fields.display_name || "—"}</p>
          <p className={styles.sidebarHandle}>@{fields.username || "—"}</p>
        </div>

        {/* MAIN FORM */}
        <div className={styles.main}>
          <div className={styles.card}>
            <p className={styles.cardTitle}>Profile information</p>

            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label>
                  Display name <span className={styles.req}>*</span>
                </label>
                <input
                  type="text"
                  value={fields.display_name}
                  onChange={(e) =>
                    setFields((p) => ({ ...p, display_name: e.target.value }))
                  }
                />
              </div>

              <div className={styles.field}>
                <label>
                  Username <span className={styles.req}>*</span>
                  {usernameIsLocked && (
                    <span className={styles.lockedBadge}>
                      Locked until {usernameUnlockDate!.toLocaleDateString()}
                    </span>
                  )}
                </label>
                <div className={styles.usernameWrap}>
                  <span className={styles.at}>@</span>
                  <input
                    type="text"
                    value={fields.username}
                    disabled={usernameIsLocked}
                    onChange={(e) =>
                      setFields((p) => ({
                        ...p,
                        username: e.target.value
                          .toLowerCase()
                          .replace(/\s|@/g, ""),
                      }))
                    }
                  />
                </div>
                {!usernameIsLocked && originalUsername !== fields.username && (
                  <small>
                    You won't be able to change this again for 14 days.
                  </small>
                )}
              </div>

              <div className={`${styles.field} ${styles.full}`}>
                <label>Bio</label>
                <textarea
                  maxLength={150}
                  value={fields.bio}
                  onChange={(e) =>
                    setFields((p) => ({ ...p, bio: e.target.value }))
                  }
                />
                <small>{fields.bio.length}/150</small>
              </div>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>Profile updated!</p>}

          <div className={styles.actions}>
            <Button
              text="Cancel"
              backgroundColor="#f3f4f6"
              textColor="#374151"
              outline="0px"
              isActive={!loading}
              onButtonClick={() => navigate(-1)}
            />
            <Button
              text={loading ? "Saving..." : "Save changes"}
              backgroundColor="linear-gradient(135deg, #ff6a00, #ff2e2e)"
              textColor="#fff"
              outline="0px"
              isActive={!loading}
              onButtonClick={handleSave}
            />
          </div>
        </div>
      </div>

      {avatarEditorOpen && avatarFile && (
        <PhotoEditor
          key={fileKey}
          mode="avatar"
          onClose={() => setAvatarEditorOpen(false)}
          onSave={async (canvas) => {
            if (!canvas) return;
            const blob = await new Promise<Blob | null>((r) =>
              canvas.toBlob(r, "image/png", 0.9),
            );
            if (!blob) return;
            setAvatarFile(
              new File([blob], "avatar.png", { type: "image/png" }),
            );
            setAvatarEditorOpen(false);
          }}
          onChangePhoto={() => fileInputRef.current?.click()}
          imageFile={avatarFile}
        />
      )}
    </div>
  );
}
