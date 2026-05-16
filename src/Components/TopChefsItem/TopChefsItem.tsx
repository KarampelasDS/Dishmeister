import styles from "./TopChefsItem.module.css";
import { useNavigate } from "react-router";
import Button from "../Button/Button";

type TopChef = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  follower_count: number;
  recipe_count: number;
  is_following: boolean;
};

type TopChefsItemProps = {
  chef: TopChef;
  onFollow: (id: string) => void;
  isFollowingLoading: boolean;
};

export default function TopChefsItem({
  chef,
  onFollow,
  isFollowingLoading,
}: TopChefsItemProps) {
  const supabaseUrl = import.meta.env
    .VITE_SUPABASE_PROFILE_BUCKET_URL as string;
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/profiles/${chef.username}`);
  };

  if (!chef) return;

  return (
    <div className={styles.container} onClick={handleClick}>
      <img
        src={
          chef.avatar_url
            ? `${supabaseUrl}${chef.avatar_url}`
            : "/defaultAvatar.png"
        }
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.onerror = null;
          target.src = "/defaultAvatar.png";
        }}
        alt={chef.display_name}
        className={styles.image}
      />
      <div className={styles.info}>
        <span className={styles.title}>{chef.display_name}</span>
        <span className={styles.likes}>{`@${chef.username}`}</span>
      </div>
      <div
        className={styles.followButtonContainer}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          text={chef.is_following ? "Following" : "Follow"}
          backgroundColor={
            chef.is_following
              ? "#e5e7eb"
              : "linear-gradient(135deg, #ff6a00, #ff2e2e)"
          }
          textColor={chef.is_following ? "#374151" : "#fff"}
          outline="0px"
          isActive={!isFollowingLoading}
          onButtonClick={() => onFollow(chef.id)}
        />
      </div>
    </div>
  );
}
