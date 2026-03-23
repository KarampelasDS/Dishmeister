import styles from "./ProfileStat.module.css";
import {
  Heart,
  User,
  Users,
  Utensils,
  ThumbsUp,
  UtensilsCrossed,
  MessageCircle,
} from "lucide-react";
export default function ProfileStat(props: any) {
  return (
    <div
      className={styles.Container}
      style={{
        background: props.background,
        border: props.border,
      }}
    >
      <div className={styles.header}>
        <div className={styles.icon}>
          {props.stat === "Followers" && <User color={props.iconColor} />}
          {props.stat === "Following" && <Users color={props.iconColor} />}
          {props.stat === "Recipes" && <Utensils color={props.iconColor} />}
          {props.stat === "Likes" && <Heart color={props.iconColor} />}
          {props.stat === "Servings" && <Users color={props.iconColor} />}
          {props.stat === "Rating" && <ThumbsUp color={props.iconColor} />}
          {props.stat === "Category" && (
            <UtensilsCrossed color={props.iconColor} />
          )}
          {props.stat === "Comments" && (
            <MessageCircle color={props.iconColor} />
          )}
        </div>

        <h2>{props.statAmount}</h2>
      </div>
      <p>{props.stat}</p>
    </div>
  );
}
