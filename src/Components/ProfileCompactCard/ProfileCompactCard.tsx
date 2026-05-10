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
        <p className={styles.profileUsername}>{followers} followers</p>
        <p className={styles.profileBio}>{bio}</p>
      </div>
      <Button
        text={"View Profile"}
        backgroundColor={"linear-gradient(90deg,#ff7a18,#ef4444)"}
        textColor="#fff"
        fontSize="1rem"
        onButtonClick={() => navigate(`/profiles/${username}`)}
        type="button"
        outline={"0px"}
      />
    </div>
  );
}
