import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../Context/AuthProvider";
import PhotoEditor from "../Components/PhotoEditor/PhotoEditor";
import Button from "../Components/Button/Button";
import Loader from "../Components/Loader/Loader";
import ErrorModal from "../Components/ErrorModal/ErrorModal";

import styles from "./EditProfilePage.module.css";
import { Settings, Camera } from "lucide-react";
import { compressImage } from "../utils/compressImage";

const AVATAR_BUCKET = "avatars";
const MAX_FILE_MB = 20;
const SUPABASE_AVATAR_URL = import.meta.env
  .VITE_SUPABASE_PROFILE_BUCKET_URL as string;

type ProfileFields = {
  username: string;
  display_name: string;
  bio: string;
  email: string;
  username_changed_at: string | null;
};

const USERNAME_PATTERN = /^[a-z0-9_]+$/;

type AppError = {
  title: string;
  detail?: string;
};

export default function EditProfilePage() {
  const { session, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fields, setFields] = useState<ProfileFields>({
    username: "",
    display_name: "",
    bio: "",
    email: "",
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
  const [error, setError] = useState<AppError | null>(null);
  const [success, setSuccess] = useState(false);
  const [compressing, setCompressing] = useState(false);

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
        setError({
          title: "We couldn't load your profile.",
          detail: "Refresh the page and try again.",
        });
        setFetching(false);
        return;
      }

      setFields({
        username: data.username ?? "",
        display_name: data.display_name ?? "",
        bio: data.bio ?? "",
        email: session.user.email ?? "",
        username_changed_at: data.username_changed_at ?? null,
      });
      setOriginalUsername(data.username ?? "");
      setCurrentAvatarPath(data.avatar_url ?? null);
      setFetching(false);
    };

    fetchProfile();
  }, [session?.user.id]);

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
      setError({
        title: "That file isn't an image.",
        detail: "Choose a JPG, PNG, WebP, or another image file.",
      });
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError({
        title: "That avatar is too large.",
        detail: `Choose an image under ${MAX_FILE_MB}MB.`,
      });
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
      .upload(path, avatarFile, { cacheControl: "31536000", upsert: true });

    if (error) throw error;
    return path;
  };

  const getSaveError = (err: any): AppError => {
    const message = String(err?.message ?? "").toLowerCase();
    const details = String(err?.details ?? "").toLowerCase();
    const code = String(err?.code ?? "");

    if (
      code === "23505" ||
      message.includes("duplicate") ||
      details.includes("already exists")
    ) {
      return {
        title: "That username is already taken.",
        detail: "Try adding a word, number, or underscore to make it yours.",
      };
    }

    if (message.includes("storage") || message.includes("upload")) {
      return {
        title: "The avatar upload failed.",
        detail: "Try a smaller image or upload it again in a moment.",
      };
    }

    return {
      title: "We couldn't save your profile.",
      detail: "Check your connection and try again.",
    };
  };

  const validateProfile = () => {
    const username = fields.username.trim();

    if (!username) {
      setError({
        title: "Choose a username.",
        detail: "Your username is how people find your profile.",
      });
      return null;
    }

    if (!USERNAME_PATTERN.test(username)) {
      setError({
        title: "Use only lowercase letters, numbers, and underscores.",
        detail: "For example: chef_maria or baker42.",
      });
      return null;
    }

    if (!fields.display_name.trim()) {
      setError({
        title: "Add a display name.",
        detail: "This is the name people see on your recipes and profile.",
      });
      return null;
    }

    return {
      username,
      displayName: fields.display_name.trim(),
      bio: fields.bio.trim(),
    };
  };

  const usernameIsTaken = async (username: string) => {
    if (!session?.user.id || username === originalUsername) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", session.user.id)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data);
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    const profile = validateProfile();
    if (!profile) return;

    try {
      setLoading(true);
      const taken = await usernameIsTaken(profile.username);

      if (taken) {
        setError({
          title: "That username is already taken.",
          detail: "Try adding a word, number, or underscore to make it yours.",
        });
        return;
      }

      const uploadedPath = await uploadAvatar();

      const { error } = await supabase
        .from("profiles")
        .update({
          username: profile.username,
          display_name: profile.displayName,
          bio: profile.bio,
          avatar_url: uploadedPath,
        })
        .eq("id", session!.user.id);

      if (error) throw error;

      await refreshProfile();
      setOriginalUsername(profile.username);
      setSuccess(true);
      location.href = `/profiles/${profile.username}`;
    } catch (err: any) {
      setError(getSaveError(err));
    } finally {
      setLoading(false);
    }
  };

  const avatarDisplayUrl =
    avatarPreviewUrl ??
    (currentAvatarPath ? `${SUPABASE_AVATAR_URL}/${currentAvatarPath}` : null);

  if (fetching) return <Loader fullPage />;

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderIcon}>
          <Settings size={22} />
        </div>
        <div>
          <h1 className={styles.pageTitle}>Account Settings</h1>
          <p className={styles.pageSubtitle}>
            Manage your account preferences and settings
          </p>
        </div>
      </div>

      {/* Profile Information Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardHeaderIcon}>👤</span>
          <h2 className={styles.cardTitle}>Profile Information</h2>
        </div>

        <div className={styles.cardBody}>
          {/* Avatar column */}
          <div className={styles.avatarColumn}>
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
                aria-label="Change avatar"
              >
                <Camera size={12} />
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

            <p className={styles.avatarName}>{fields.display_name || "—"}</p>
            <p className={styles.avatarHandle}>@{fields.username || "—"}</p>
          </div>

          {/* Form column */}
          <div className={styles.formColumn}>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Display Name</label>
                <input
                  type="text"
                  className={styles.input}
                  value={fields.display_name}
                  onChange={(e) =>
                    setFields((p) => ({ ...p, display_name: e.target.value }))
                  }
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Username
                  {usernameIsLocked && (
                    <span className={styles.lockedBadge}>
                      Locked until {usernameUnlockDate!.toLocaleDateString()}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  className={styles.input}
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
                {!usernameIsLocked && originalUsername !== fields.username && (
                  <small className={styles.hint}>
                    You won't be able to change this again for 14 days.
                  </small>
                )}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input
                type="email"
                className={styles.input}
                value={fields.email}
                disabled
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Bio</label>
              <textarea
                className={styles.textarea}
                maxLength={150}
                value={fields.bio}
                onChange={(e) =>
                  setFields((p) => ({ ...p, bio: e.target.value }))
                }
              />
              <small className={styles.charCount}>
                {fields.bio.length}/150
              </small>
            </div>

            {success && <p className={styles.success}>Profile updated!</p>}
            {error && (
              <ErrorModal
                isOpen={!!error}
                onClose={() => setError(null)}
                title={error.title}
                message={error.detail || ""}
              />
            )}



            <div className={styles.actions}>
              <Button
                text={loading ? "Saving..." : "Save Changes"}
                backgroundColor="linear-gradient(135deg, #ff6a00, #ff2e2e)"
                textColor="#fff"
                outline="0px"
                isActive={!loading}
                onButtonClick={handleSave}
              />
            </div>
          </div>
        </div>
      </div>

      {avatarEditorOpen && avatarFile && (
        <div className={styles.photoEditor}>
          <PhotoEditor
            key={fileKey}
            mode="profile"
            onClose={() => {
              if (!compressing) setAvatarEditorOpen(false);
            }}
            onSave={async (canvas) => {
              if (!canvas) return;
              const blob = await new Promise<Blob | null>((r) =>
                canvas.toBlob(r, "image/png", 0.9),
              );
              if (!blob) return;

              setCompressing(true);
              const raw = new File([blob], "avatar.png", { type: "image/png" });
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
        </div>
      )}
    </div>
  );
}
