import styles from "./ProfileCard.module.css";
import ProfileStat from "../ProfileStat/ProfileStat";
import Button from "../Button/Button";
import { Mail, ArrowLeft, Pencil, EllipsisVertical, Forward, MessageSquareWarning } from "lucide-react";
import { useNavigate } from "react-router";
import { useState } from "react";
import { useClickOutside } from "../../Hooks/useClickOutside";


type profileType = {
  id: string;
  username: string;
  avatar_url: string;
  display_name: string;
  bio: string;
  recipe_count: number;
  follower_count: number;
  following_count: number;
  total_likes: number;
};

export default function ProfileCard({
  profile,
  isFollowing,
  followFunction,
  followActive,
  isOwnProfile,
}: {
  profile: profileType | null;
  isFollowing: boolean;
  followFunction: () => void;
  followActive: boolean;
  isOwnProfile: boolean;
}) {
  const supabaseAvatarUrl = import.meta.env
    .VITE_SUPABASE_PROFILE_BUCKET_URL as string;

  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useClickOutside(() => setMenuOpen(false));


  return (
    <>
      <div className={styles.backRow}>
        <span onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </span>
      </div>
      <div className={styles.profileWindow}>
        <div className={styles.banner}>
          <div className={styles.topRightMenu} ref={menuRef}>
            <button
              className={styles.menuButton}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="More options"
            >
              <EllipsisVertical color="white" size={24} />
            </button>
            {menuOpen && (
              <div className={styles.menuDropdown}>
                <button
                  className={styles.menuItem}
                  onClick={() => {
                    console.log("Share");
                    setMenuOpen(false);
                  }}
                >
                  <Forward />
                  Share
                </button>
                <button
                  className={styles.menuItem}
                  onClick={() => {
                    console.log("Report");
                    setMenuOpen(false);
                  }}
                >
                  <MessageSquareWarning color="#cd3131" />
                  <span style={{ color: "#cd3131" }}>Report</span>
                </button>
              </div>
            )}
          </div>
          <div className={styles.profilePicContainer}>

            <img
              className={styles.profilePic}
              src={`${supabaseAvatarUrl}/${profile?.avatar_url}`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/defaultAvatar.png";
              }}
              alt={profile?.display_name}
            />
            <span className={styles.chefBadge}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className={styles.icon}
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
                <line x1="6" y1="17" x2="18" y2="17" />
              </svg>
            </span>
          </div>
        </div>
        <div className={styles.profileInfo}>
          <h1 className={styles.displayName}>{profile?.display_name}</h1>
          <p className={styles.username}>@{profile?.username}</p>
          <p className={styles.bio}>{profile?.bio}</p>
        </div>
        <div className={styles.profileStats}>
          <div className={styles.statsBox}>
            <ProfileStat
              stat="Followers"
              statAmount={profile?.follower_count.toString() || "0"}
              border="1px solid var(--stat1-border)"
              background="var(--stat1-bg)"
              iconColor="var(--stat1-icon)"
            />
            <ProfileStat
              stat="Following"
              statAmount={profile?.following_count.toString() || "0"}
              border="1px solid var(--stat2-border)"
              background="var(--stat2-bg)"
              iconColor="var(--stat2-icon)"
            />
            <ProfileStat
              stat="Recipes"
              statAmount={profile?.recipe_count.toString() || "0"}
              border="1px solid var(--stat3-border)"
              background="var(--stat3-bg)"
              iconColor="var(--stat3-icon)"
            />
            <ProfileStat
              stat="Likes"
              statAmount={profile?.total_likes.toString() || "0"}
              border="1px solid var(--stat4-border)"
              background="var(--stat4-bg)"
              iconColor="var(--stat4-icon)"
            />
          </div>

          <div className={styles.buttonsContainer}>
            <div className={styles.followButton}>
              {isOwnProfile ? (
                <Button
                  backgroundColor="#f3f4f6"
                  textColor="#374151"
                  outline="0px"
                  isActive={true}
                  onButtonClick={() => navigate("/settings")}
                >
                  <Pencil size={18} />
                  Edit Profile
                </Button>
              ) : (
                <Button
                  text={isFollowing ? "Following" : "Follow"}
                  backgroundColor={
                    isFollowing
                      ? "#e5e7eb"
                      : "linear-gradient(135deg, #ff6a00, #ff2e2e)"
                  }
                  textColor={isFollowing ? "#374151" : "#fff"}
                  outline="0px"
                  isActive={followActive}
                  onButtonClick={followFunction}
                />
              )}
            </div>

            <div className={styles.contactButton}>
              <Button
                backgroundColor="#f3f4f6"
                textColor="#374151"
                outline="0px "
                isActive={true}
              >
                <Mail size={18} /> Contact
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
