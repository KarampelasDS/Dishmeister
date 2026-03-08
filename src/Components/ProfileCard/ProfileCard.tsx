import styles from "./ProfileCard.module.css";
import ProfileStat from "../ProfileStat/ProfileStat";
import Button from "../Button/Button";
import { Mail } from "lucide-react";

//finish profile card design

type profileCardProps = {
  id: string;
  username: string;
  avatar_url: string;
  display_name: string;
  bio: string;
};

export default function ProfileCard({
  profile,
}: {
  profile: profileType | null;
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
            statAmount="5000"
            outline="1px solid #dbeafe"
          />
          <ProfileStat
            stat="Following"
            statAmount="50"
            outline="1px solid #dbeafe"
          />
          <ProfileStat
            stat="Recipes"
            statAmount="50"
            outline="1px solid #dbeafe"
          />
          <ProfileStat
            stat="Likes"
            statAmount="50"
            outline="1px solid #dbeafe"
          />
        </div>

        <div className={styles.buttonsContainer}>
          <div className={styles.followButton}>
            <Button
              text="Follow"
              backgroundColor="linear-gradient(135deg, #ff6a00, #ff2e2e)"
              textColor="#fff"
              outline="0px "
              isActive={true}
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
