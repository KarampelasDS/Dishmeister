import Button from "../Button/Button";
import styles from "./ProfileCompactCard.module.css";
import { useNavigate } from "react-router";

type ProfileCompactCardProps = {
  displayName: string;
  username: string;
  bio: string;
  followers: number;
  profilePictureUrl: string;
};

export default function ProfileCompactCard({
  displayName,
  username,
  bio,
  followers,
  profilePictureUrl,
}: ProfileCompactCardProps) {
  const supabaseUrl = import.meta.env
    .VITE_SUPABASE_PROFILE_BUCKET_URL as string;

  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.cardHeader} />
      <div className={styles.profileContent}>
        <img
          src={`${supabaseUrl}${profilePictureUrl}`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = "/defaultAvatar.png";
          }}
          alt="Profile Picture"
          className={styles.profilePicture}
        />
        <div className={styles.profileInfo}>
          <h3 className={styles.profileName}>{displayName}</h3>
          <p className={styles.profileUsername}>@{username}</p>
          <div className={styles.followerCount}>
            {followers.toLocaleString()} followers
          </div>
          <p className={styles.profileBio}>{bio || "No bio yet."}</p>
        </div>
        <div className={styles.buttonWrapper}>
          <Button
            text={"View Profile"}
            backgroundColor={"linear-gradient(90deg,#ff7a18,#ef4444)"}
            textColor="#fff"
            fontSize="0.95rem"
            onButtonClick={() => navigate(`/profiles/${username}`)}
            type="button"
            outline={"0px"}
          />
        </div>
      </div>
    </div>
  );
}
