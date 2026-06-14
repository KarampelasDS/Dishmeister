import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router";
import { supabase } from "../supabase";
import { useAuth } from "../Context/AuthProvider";
import PhotoEditor from "../Components/PhotoEditor/PhotoEditor";
import Button from "../Components/Button/Button";
import Loader from "../Components/Loader/Loader";
import ErrorModal from "../Components/ErrorModal/ErrorModal";
import { useToast } from "../Context/ToastContext";
import {
  getFriendlyErrorMessage,
  getFriendlyProfileSettingsErrorMessage,
} from "../utils/errorUtils";
import {
  isSupportedImageFile,
  normalizeImageFileForEditor,
  SUPPORTED_IMAGE_ACCEPT,
} from "../utils/imageFileValidation";

import styles from "./EditProfilePage.module.css";
import {
  Settings,
  Camera,
  User,
  FileText,
  Lock,
  ShieldAlert,
  Shield,
  Share2,
  Plus,
  Trash2,
  Instagram,
  Twitter,
  Youtube,
  Globe,
  Link as LinkIcon,
  Facebook,
  ArrowLeft,
} from "lucide-react";
import { compressImage } from "../utils/compressImage";

const AVATAR_BUCKET = "avatars";
const MAX_FILE_MB = 20;
const SUPABASE_AVATAR_URL = import.meta.env
  .VITE_SUPABASE_PROFILE_BUCKET_URL as string;

type SocialLink = {
  platform: string;
  url: string;
};

type ProfileFields = {
  username: string;
  display_name: string;
  bio: string;
  email: string;
  username_changed_at: string | null;
  social_links: SocialLink[];
  hide_followers_list: boolean;
  hide_following_list: boolean;
};

const PLATFORMS = [
  { id: "Instagram", icon: Instagram },
  { id: "Twitter", icon: Twitter },
  { id: "TikTok", icon: Share2 },
  { id: "YouTube", icon: Youtube },
  { id: "Facebook", icon: Facebook },
  { id: "Website", icon: Globe },
  { id: "Other", icon: LinkIcon },
];

type AppError = {
  title: string;
  detail?: string;
};

export default function EditProfilePage() {
  const { session, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const [fields, setFields] = useState<ProfileFields>({
    username: "",
    display_name: "",
    bio: "",
    email: "",
    username_changed_at: null,
    social_links: [],
    hide_followers_list: false,
    hide_following_list: false,
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [currentAvatarPath, setCurrentAvatarPath] = useState<string | null>(
    null,
  );
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [avatarFileKey, setAvatarFileKey] = useState(0);
  const [compressingAvatar, setCompressingAvatar] = useState(false);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  // Security states
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Social Links state
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLinkPlatform, setNewLinkPlatform] = useState(PLATFORMS[0].id);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "true") {
      showToast("Ready to update your password!", "info");
      passwordInputRef.current?.focus();
    }
  }, []);

  const handlePasswordUpdate = async () => {
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess(true);
      setNewPassword("");
      showToast("Password updated successfully!", "success");
    }
    setPasswordLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (!session?.user.id) return;
    setLoading(true);
    try {
      const { error: rpcError } = await supabase.rpc("delete_user");
      if (rpcError) throw rpcError;

      await supabase.auth.signOut();
      showToast("Account deleted successfully.", "info");
      window.location.href = "/";
    } catch (err: any) {
      setError({
        title: "Account deletion failed.",
        detail: getFriendlyErrorMessage(
          err,
          "Make sure you've run the SQL script in your dashboard.",
        ),
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session?.user.id) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "username, display_name, bio, avatar_url, username_changed_at, social_links, hide_followers_list, hide_following_list",
        )
        .eq("id", session.user.id)
        .single();

      if (error || !data) {
        setError({
          title: "We couldn't load your profile.",
          detail: getFriendlyProfileSettingsErrorMessage(
            error,
            "Refresh the page and try again.",
          ),
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
        social_links: (data.social_links as SocialLink[]) || [],
        hide_followers_list: data.hide_followers_list ?? false,
        hide_following_list: data.hide_following_list ?? false,
      });
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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!isSupportedImageFile(file)) {
      setError({
        title: "That image format isn't supported.",
        detail: "Choose a JPG, PNG, or WebP image.",
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

    let editorFile: File;
    try {
      editorFile = await normalizeImageFileForEditor(file);
    } catch (err: any) {
      setError({
        title: "We couldn't prepare that image.",
        detail: err.message || "Try a different JPG, PNG, or WebP image.",
      });
      return;
    }

    setAvatarFileKey((key) => key + 1);
    setAvatarFile(editorFile);
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

    await supabase.from("storage_objects").insert({
      bucket: AVATAR_BUCKET,
      path,
      uploaded_by: session.user.id,
    });

    return path;
  };

  const handleSave = async () => {
    setError(null);

    if (!fields.username.trim() || !fields.display_name.trim()) {
      setError({
        title: "Missing required fields.",
        detail: "Username and Display Name are required.",
      });
      return;
    }

    try {
      setLoading(true);
      const uploadedPath = await uploadAvatar();

      const { error } = await supabase
        .from("profiles")
        .update({
          username: fields.username.toLowerCase(),
          display_name: fields.display_name,
          bio: fields.bio,
          avatar_url: uploadedPath,
          social_links: fields.social_links,
          hide_followers_list: fields.hide_followers_list,
          hide_following_list: fields.hide_following_list,
        })
        .eq("id", session!.user.id);

      if (error) throw error;

      if (uploadedPath) {
        await supabase
          .from("storage_objects")
          .update({ referenced: true })
          .eq("bucket", AVATAR_BUCKET)
          .eq("path", uploadedPath);
      }

      if (
        uploadedPath &&
        currentAvatarPath &&
        currentAvatarPath !== uploadedPath
      ) {
        await supabase
          .from("storage_objects")
          .update({ referenced: false })
          .eq("bucket", AVATAR_BUCKET)
          .eq("path", currentAvatarPath);
      }

      await refreshProfile();
      showToast("Profile updated successfully!", "success");
      location.href = `/profiles/${fields.username}`;
    } catch (err: any) {
      setError({
        title: "Save failed.",
        detail: getFriendlyProfileSettingsErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  };

  const addSocialLink = () => {
    setLinkError(null);
    if (!newLinkUrl.trim()) {
      setLinkError("Please enter a URL.");
      return;
    }

    let formattedUrl = newLinkUrl.trim();
    if (!formattedUrl.startsWith("http")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Basic URL validation
    const urlPattern =
      /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    if (!urlPattern.test(formattedUrl)) {
      setLinkError("Please enter a valid URL (e.g., instagram.com/chef)");
      return;
    }

    // Platform-specific validation (Soft warnings)
    const platformLower = newLinkPlatform.toLowerCase();
    if (platformLower !== "other" && platformLower !== "website") {
      const pId = platformLower === "twitter" ? "twitter|x.com" : platformLower;
      const platformRegex = new RegExp(pId, "i");
      if (!platformRegex.test(formattedUrl)) {
        setLinkError(`This doesn't look like a ${newLinkPlatform} link.`);
        return;
      }
    }

    const newLink = { platform: newLinkPlatform, url: formattedUrl };
    setFields((p) => ({ ...p, social_links: [...p.social_links, newLink] }));
    setNewLinkUrl("");
    setIsAddingLink(false);
  };

  const removeSocialLink = (index: number) => {
    setFields((p) => ({
      ...p,
      social_links: p.social_links.filter((_, i) => i !== index),
    }));
  };

  const avatarDisplayUrl =
    avatarPreviewUrl ??
    (currentAvatarPath ? `${SUPABASE_AVATAR_URL}${currentAvatarPath}` : null);

  const timeSinceChange = fields.username_changed_at
    ? new Date().getTime() - new Date(fields.username_changed_at).getTime()
    : null;
  const isUsernameLocked =
    timeSinceChange !== null && timeSinceChange < 14 * 24 * 60 * 60 * 1000;
  const daysUntilUnlock =
    timeSinceChange !== null
      ? Math.ceil(
          (14 * 24 * 60 * 60 * 1000 - timeSinceChange) / (24 * 60 * 60 * 1000),
        )
      : 0;

  if (fetching) return <Loader fullPage />;

  return (
    <div className={styles.page}>
      <div className={styles.backRow}>
        <span onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderIcon}>
          <Settings size={22} />
        </div>
        <div>
          <h1 className={styles.pageTitle}>Account Settings</h1>
          <p className={styles.pageSubtitle}>
            Manage your profile, security, and social links
          </p>
        </div>
      </div>

      {/* Profile Section */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardHeaderIcon}>
            <User size={18} />
          </span>
          <h2 className={styles.cardTitle}>Basic Profile</h2>
        </div>

        <div className={styles.cardBody}>
          <div className={styles.avatarColumn}>
            <div className={styles.avatarWrap}>
              <img
                src={avatarDisplayUrl ?? "/defaultAvatar.png"}
                alt="Avatar"
                className={styles.avatar}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = "/defaultAvatar.png";
                }}
              />
              <button
                className={styles.avatarEditBtn}
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <Camera size={14} />
              </button>
            </div>
            <p className={styles.avatarName}>{fields.display_name || "Chef"}</p>
            <p className={styles.avatarHandle}>
              @{fields.username || "username"}
            </p>
          </div>

          <div className={styles.formColumn}>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Display Name</label>
                <input
                  type="text"
                  className={styles.input}
                  value={fields.display_name}
                  maxLength={30}
                  onChange={(e) =>
                    setFields((p) => ({ ...p, display_name: e.target.value }))
                  }
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Username</label>
                <input
                  type="text"
                  className={styles.input}
                  value={fields.username}
                  disabled={isUsernameLocked}
                  maxLength={20}
                  style={
                    isUsernameLocked
                      ? { opacity: 0.7, cursor: "not-allowed" }
                      : {}
                  }
                  onChange={(e) =>
                    setFields((p) => ({
                      ...p,
                      username: e.target.value.toLowerCase(),
                    }))
                  }
                />
                {isUsernameLocked && (
                  <small
                    style={{
                      color: "#ef4444",
                      marginTop: "4px",
                      display: "block",
                    }}
                  >
                    You can change your username again in {daysUntilUnlock} day
                    {daysUntilUnlock !== 1 ? "s" : ""}.
                  </small>
                )}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                <FileText size={14} style={{ marginRight: 6 }} /> Bio
              </label>
              <textarea
                className={styles.textarea}
                maxLength={150}
                value={fields.bio}
                onChange={(e) =>
                  setFields((p) => ({ ...p, bio: e.target.value }))
                }
                placeholder="Tell the world about your cooking style..."
              />
              <small className={styles.charCount}>
                {fields.bio.length}/150
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Social Presence Section */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardHeaderIcon}>
            <Share2 size={18} />
          </span>
          <h2 className={styles.cardTitle}>Social Presence</h2>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.socialManager}>
            {fields.social_links.length > 0 ? (
              <div className={styles.linksList}>
                {fields.social_links.map((link, idx) => {
                  const PlatformIcon =
                    PLATFORMS.find((p) => p.id === link.platform)?.icon ||
                    LinkIcon;
                  return (
                    <div key={idx} className={styles.linkItem}>
                      <div className={styles.linkInfo}>
                        <PlatformIcon
                          size={18}
                          className={styles.platformIcon}
                        />
                        <div className={styles.linkDetails}>
                          <span className={styles.platformName}>
                            {link.platform}
                          </span>
                          <span className={styles.platformUrl}>{link.url}</span>
                        </div>
                      </div>
                      <button
                        className={styles.removeLink}
                        onClick={() => removeSocialLink(idx)}
                        title="Remove link"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptySocials}>
                <p>
                  No contact links added yet. Add your socials to help people
                  connect with you!
                </p>
              </div>
            )}

            {!isAddingLink ? (
              <button
                className={styles.addLinkBtn}
                onClick={() => setIsAddingLink(true)}
              >
                <Plus size={16} /> Add Social Link
              </button>
            ) : (
              <div className={styles.linkForm}>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Platform</label>
                    <select
                      className={styles.input}
                      value={newLinkPlatform}
                      onChange={(e) => setNewLinkPlatform(e.target.value)}
                    >
                      {PLATFORMS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>URL</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="instagram.com/chef"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                    />
                  </div>
                </div>
                {linkError && <p className={styles.socialError}>{linkError}</p>}
                <div className={styles.formActions}>
                  <Button
                    text="Cancel"
                    onButtonClick={() => {
                      setIsAddingLink(false);
                      setLinkError(null);
                    }}
                    backgroundColor="var(--header-bg)"
                    textColor="var(--text)"
                    outline="1px solid var(--border)"
                  />
                  <Button
                    text="Add Link"
                    onButtonClick={addSocialLink}
                    backgroundColor="var(--primary)"
                    textColor="#fff"
                    outline="1px solid var(--border)"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Privacy Section */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardHeaderIcon}>
            <Shield size={18} />
          </span>
          <h2 className={styles.cardTitle}>Privacy Settings</h2>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.privacyList}>
            <label className={styles.toggleRow}>
              <div>
                <span className={styles.toggleTitle}>Hide followers list</span>
                <span className={styles.toggleDescription}>
                  Other users can see your follower count, but not open the list.
                </span>
              </div>
              <input
                type="checkbox"
                checked={fields.hide_followers_list}
                onChange={(e) =>
                  setFields((p) => ({
                    ...p,
                    hide_followers_list: e.target.checked,
                  }))
                }
              />
              <span className={styles.toggleSwitch} aria-hidden="true" />
            </label>

            <label className={styles.toggleRow}>
              <div>
                <span className={styles.toggleTitle}>Hide following list</span>
                <span className={styles.toggleDescription}>
                  Other users can see your following count, but not open the list.
                </span>
              </div>
              <input
                type="checkbox"
                checked={fields.hide_following_list}
                onChange={(e) =>
                  setFields((p) => ({
                    ...p,
                    hide_following_list: e.target.checked,
                  }))
                }
              />
              <span className={styles.toggleSwitch} aria-hidden="true" />
            </label>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardHeaderIcon}>
            <Lock size={18} />
          </span>
          <h2 className={styles.cardTitle}>Security</h2>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.formColumn}>
            <div className={styles.field}>
              <label className={styles.label}>Update Password</label>
              <input
                ref={passwordInputRef}
                type="password"
                className={styles.input}
                placeholder="New password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            {passwordSuccess && (
              <p className={styles.success}>Password updated!</p>
            )}
            {passwordError && (
              <p className={styles.socialError}>{passwordError}</p>
            )}
            <div className={styles.actions}>
              <Button
                text={passwordLoading ? "Updating..." : "Update Password"}
                onButtonClick={handlePasswordUpdate}
                isActive={newPassword.length >= 6}
                backgroundColor={
                  newPassword.length >= 6
                    ? "linear-gradient(135deg, #ff6a00, #ff2e2e)"
                    : "var(--header-bg)"
                }
                textColor={newPassword.length >= 6 ? "#fff" : "var(--text)"}
                outline={
                  newPassword.length >= 6 ? "0px" : "1px solid var(--border)"
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div
        className={styles.card}
        style={{
          border: "1px solid rgba(239, 68, 68, 0.3)",
          background: "rgba(239, 68, 68, 0.02)",
        }}
      >
        <div
          className={styles.cardHeader}
          style={{
            background: "rgba(239, 68, 68, 0.05)",
            borderBottom: "1px solid rgba(239, 68, 68, 0.1)",
          }}
        >
          <span className={styles.cardHeaderIcon}>
            <ShieldAlert size={18} style={{ color: "#ef4444" }} />
          </span>
          <h2 className={styles.cardTitle} style={{ color: "#ef4444" }}>
            Danger Zone
          </h2>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.formColumn}>
            {!showDeleteConfirm ? (
              <Button
                text="Delete Account"
                backgroundColor="rgba(239, 68, 68, 0.08)"
                textColor="#ef4444"
                outline="1px solid rgba(239, 68, 68, 0.2)"
                onButtonClick={() => setShowDeleteConfirm(true)}
              />
            ) : (
              <div className={styles.deleteConfirm}>
                <p>
                  This is permanent. Your recipes and profile will be gone
                  forever.
                </p>
                <div className={styles.confirmButtons}>
                  <Button
                    text="Confirm Delete"
                    onButtonClick={handleDeleteAccount}
                    backgroundColor="#ef4444"
                    textColor="#fff"
                  />
                  <Button
                    text="Cancel"
                    onButtonClick={() => setShowDeleteConfirm(false)}
                    backgroundColor="transparent"
                    textColor="var(--text)"
                    outline="1px solid var(--border)"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.finalActions}>
        <Button
          text={loading ? "Saving Profile..." : "Save All Changes"}
          backgroundColor="linear-gradient(135deg, #ff6a00, #ff2e2e)"
          textColor="#fff"
          onButtonClick={handleSave}
          isActive={!loading}
          outline="0px"
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={SUPPORTED_IMAGE_ACCEPT}
        style={{ display: "none" }}
        onChange={handleAvatarChange}
      />

      {avatarEditorOpen && avatarFile && (
        <PhotoEditor
          key={avatarFileKey}
          mode="profile"
          onClose={() => {
            if (!compressingAvatar) setAvatarEditorOpen(false);
          }}
          onSave={async (canvas) => {
            if (!canvas) {
              setError({
                title: "Image processing failed.",
                detail: "Try a different image.",
              });
              return;
            }
            setCompressingAvatar(true);
            try {
              const blob = await new Promise<Blob | null>((r) =>
                canvas.toBlob(r, "image/png", 0.9),
              );
              if (!blob) {
                setError({
                  title: "Image processing failed.",
                  detail: "Try a different image.",
                });
                return;
              }
              const compressed = await compressImage(
                new File([blob], "avatar.png", { type: "image/png" }),
                "profile",
              );
              setAvatarFile(compressed);
              setAvatarEditorOpen(false);
            } catch (err: any) {
              setError({
                title: "Image processing failed.",
                detail: err.message || "Try a different image.",
              });
            } finally {
              setCompressingAvatar(false);
            }
          }}
          onChangePhoto={() => {
            if (!compressingAvatar) fileInputRef.current?.click();
          }}
          onError={(message) =>
            setError({ title: "Image editor failed.", detail: message })
          }
          imageFile={avatarFile}
        />
      )}

      {error && (
        <ErrorModal
          isOpen={!!error}
          onClose={() => setError(null)}
          title={error.title}
          message={error.detail || ""}
        />
      )}

      <div className={styles.footer}>
        <div className={styles.footerLinks}>
          <a
            href="https://app.termly.io/policy-viewer/policy.html?policyUUID=360c148b-116d-45e4-9614-0464a4ccc0ff"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy
          </a>
          <span className={styles.footerDot}>•</span>
          <Link to="/terms-of-service">Terms</Link>
        </div>
        <div className={styles.copyright}>
          © {new Date().getFullYear()} Dishmeister
        </div>
      </div>
    </div>
  );
}
