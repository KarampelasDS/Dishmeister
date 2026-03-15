import styles from "./ProfileCard.module.css";
import ProfileStat from "../ProfileStat/ProfileStat";
import Button from "../Button/Button";
import { Mail } from "lucide-react";

//finish profile card design

export default function ProfileCard({
  profile,
  isFollowing,
  followFunction,
}: {
  profile: profileType | null;
  isFollowing: boolean;
  followFunction: () => void;
}) {
  const supabaseAvatarUrl = import.meta.env
    .VITE_SUPABASE_PROFILE_BUCKET_URL as string;

  return (
    <div className={styles.profileWindow}>
      <div className={styles.banner}>
        <img
          className={styles.profilePic}
          src={`${supabaseAvatarUrl}/${profile?.avatar_url}`}
          alt={profile?.display_name}
        ></img>
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
            <Button
              text={isFollowing ? "Following" : "Follow"}
              backgroundColor={
                isFollowing
                  ? "#e5e7eb"
                  : "linear-gradient(135deg, #ff6a00, #ff2e2e)"
              }
              textColor={isFollowing ? "#374151" : "#fff"}
              outline="0px"
              isActive={true}
              onButtonClick={followFunction}
            />
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
  );
}
