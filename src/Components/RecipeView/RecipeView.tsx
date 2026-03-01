import { useState } from "react";
import {
  ArrowLeft,
  ThumbsUp,
  Bookmark,
  Share2,
  Clock,
  ChefHat,
  Users,
  UtensilsCrossed,
  MessageCircle,
  ThumbsDown,
  CookingPot,
} from "lucide-react";

import styles from "./RecipeView.module.css";
const supabaseUrl = import.meta.env.VITE_SUPABASE_RECIPE_BUCKET_URL as string;
const supabaseAvatarUrl = import.meta.env
  .VITE_SUPABASE_PROFILE_BUCKET_URL as string;

interface RecipeViewProps {
  recipe: any;
  onBack: () => void;
  onUserClick: (username: string) => void;
}

export default function RecipeView({
  recipe,
  onBack,
  onUserClick,
}: RecipeViewProps) {
  const convertTimeToMinutes = (time: number, unit: string) => {
    const toSeconds = (value: number, timeUnit: string) => {
      switch (timeUnit) {
        case "Hrs":
          return value * 3600;
        case "Min":
          return value * 60;
        case "Sec":
        default:
          return value;
      }
    };

    const totalSeconds = toSeconds(time, unit);

    if (totalSeconds < 60) {
      return "<1 Min";
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours} Hr${minutes > 0 ? ` ${minutes} Min` : ""}`;
    }

    return `${minutes} Min`;
  };

  const [likes, setLikes] = useState(recipe.like_count);
  const [dislikes, setDislikes] = useState(recipe.dislike_count);
  const [reaction, setReaction] = useState<"like" | "dislike" | null>(
    recipe.current_user_reaction,
  );
  const [isSaved, setIsSaved] = useState(false);

  const totalVotes = likes + dislikes;
  const likePercentage =
    totalVotes === 0 ? 0 : Math.round((likes / totalVotes) * 100);

  const prepTime = convertTimeToMinutes(
    recipe.preparation_time,
    recipe.preparation_unit,
  );
  const cookTime = convertTimeToMinutes(
    recipe.cooking_time,
    recipe.cooking_unit,
  );

  const handleLike = () => {
    if (reaction === "like") {
      setReaction(null);
      setLikes((prev: number) => prev - 1);
    } else {
      if (reaction === "dislike") {
        setDislikes((prev: number) => prev - 1);
      }
      setReaction("like");
      setLikes((prev: number) => prev + 1);
    }
  };

  const handleDislike = () => {
    if (reaction === "dislike") {
      setReaction(null);
      setDislikes((prev: number) => prev - 1);
    } else {
      if (reaction === "like") {
        setLikes((prev: number) => prev - 1);
      }
      setReaction("dislike");
      setDislikes((prev: number) => prev + 1);
    }
  };

  const handleSave = () => {
    setIsSaved((prev: boolean) => !prev);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.backRow} onClick={onBack}>
        <ArrowLeft size={18} />
        <span>Back to Feed</span>
      </div>

      <div className={styles.card}>
        {/* HERO */}
        <div className={styles.hero}>
          <img
            src={`${supabaseUrl}${recipe.image_url}`}
            alt={recipe.title}
            className={styles.heroImage}
          />

          <div className={styles.headerOverlay}>
            <div className={styles.badges}>
              <span className={styles.badge}>
                <ChefHat size={16} /> {prepTime}
              </span>
              <span className={styles.badge}>
                <CookingPot size={16} /> {cookTime}
              </span>
              <span
                className={`${styles.badge} ${
                  recipe.difficulty === "Easy"
                    ? styles.easy
                    : recipe.difficulty === "Medium"
                      ? styles.medium
                      : styles.hard
                }`}
              >
                <ChefHat size={16} /> {recipe.difficulty}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.body}>
          {/* USER */}
          <div className={styles.userRow}>
            <div
              className={styles.userInfo}
              onClick={() => onUserClick(recipe.profiles.username || "")}
            >
              <img
                src={`${supabaseAvatarUrl}${recipe.profiles.avatar_url}`}
                className={styles.avatar}
              />
              <div>
                <div className={styles.username}>
                  {recipe.profiles.display_name}
                </div>
                <div
                  className={styles.subText}
                >{`@${recipe.profiles.username}`}</div>
              </div>
            </div>

            <div className={styles.actions}>
              <button
                className={`${styles.iconBtn} ${
                  reaction === "like" ? styles.activeLike : ""
                }`}
                onClick={handleLike}
              >
                <ThumbsUp size={18} />
              </button>

              <button
                className={`${styles.iconBtn} ${
                  reaction === "dislike" ? styles.activeDislike : ""
                }`}
                onClick={handleDislike}
              >
                <ThumbsDown size={18} />
              </button>

              <button
                className={`${styles.iconBtn} ${
                  isSaved ? styles.activeSave : ""
                }`}
                onClick={handleSave}
              >
                <Bookmark size={18} />
              </button>

              <button className={styles.iconBtn}>
                <Share2 size={18} />
              </button>
            </div>
          </div>

          <h1 className={styles.title}>{recipe.title}</h1>
          <p className={styles.description}>{recipe.description}</p>

          {/* STAT CARDS */}
          <div className={styles.statsGrid}>
            <div className={`${styles.statCard} ${styles.blue}`}>
              <Users size={18} />
              <div className={styles.statValue}>{recipe.servings}</div>
              <span>Servings</span>
            </div>

            <div className={`${styles.statCard} ${styles.green}`}>
              <div className={styles.statValue}>{likePercentage}%</div>
              <span>Liked</span>
            </div>

            <div className={`${styles.statCard} ${styles.purple}`}>
              <UtensilsCrossed size={18} />
              <div className={styles.statValue}>{recipe.categories.name}</div>
              <span>Category</span>
            </div>

            <div className={`${styles.statCard} ${styles.red}`}>
              <MessageCircle size={18} />
              <div className={styles.statValue}>0</div>
              <span>Comments</span>
            </div>
          </div>

          {/* INGREDIENTS */}
          <section>
            <div className={styles.sectionTitle}>
              <ChefHat color="#f97316" size={26} />
              Ingredients
            </div>

            <div className={styles.ingredientsBox}>
              <ul>
                {recipe.ingredients
                  ?.split("\n")
                  .map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
              </ul>
            </div>
          </section>

          {/* INSTRUCTIONS */}
          <section>
            <div className={styles.sectionTitle}>
              <UtensilsCrossed color="#f97316" size={26} />
              Instructions
            </div>

            <div className={styles.instructions}>
              {recipe.instructions
                ?.split("\n")
                .map((step: string, i: number) => (
                  <div key={i} className={styles.step}>
                    <div className={styles.stepNumber}>{i + 1}</div>
                    <p>{step}</p>
                  </div>
                ))}
            </div>
          </section>

          {/* FOOTER */}
          <div className={styles.footer}>
            <span>{likes.toLocaleString()} likes</span>
            <span>0 comments</span>
            <span>432 saves</span>
          </div>
        </div>
      </div>
    </div>
  );
}
