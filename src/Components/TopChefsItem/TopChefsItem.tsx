import styles from "./TopChefsItem.module.css";
import { useNavigate } from "react-router";

type TopChef = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  follower_count: number;
  recipe_count: number;
};

type TopChefsItemProps = {
  chef: TopChef;
};

export default function TopChefsItem({ chef }: TopChefsItemProps) {
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
    </div>
  );
}
