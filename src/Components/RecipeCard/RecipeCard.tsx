import styles from "./RecipeCard.module.css";
import Button from "../Button/Button";
const supabaseUrl = import.meta.env.VITE_SUPABASE_RECIPE_BUCKET_URL as string;
const supabaseAvatarUrl = import.meta.env
  .VITE_SUPABASE_PROFILE_BUCKET_URL as string;
import { supabase } from "../../supabase";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  ThumbsUp,
  ThumbsDown,
  Clock,
  ChefHat,
  EllipsisVertical,
  Bookmark,
  Forward,
  MessageSquareWarning,
} from "lucide-react";

type Recipe = {
  id: string;
  title: string;
  description: string | null;
  preparation_time: number;
  cooking_time: number;
  servings: number;
  country_of_origin: string | null;
  image_url: string;
  difficulty: "Easy" | "Medium" | "Hard";
  preparation_unit: "Min" | "Hrs" | "Sec";
  cooking_unit: "Min" | "Hrs" | "Sec";
  like_count: number;
  dislike_count: number;
  current_user_reaction: "like" | "dislike" | null;

  profiles: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };

  categories: {
    id: string;
    name: string;
  };
};

interface RecipeCardProps {
  recipe?: Recipe;
  children?: ReactNode;
}

export default function RecipeCard({ recipe = {} }: RecipeCardProps) {
  const navigate = useNavigate();
  const convertTimeToMinutes = (
    preparationTime: number,
    cookingTime: number,
    preparationUnit: string,
    cookingUnit: string,
  ) => {
    const toSeconds = (value: number, unit: string) => {
      switch (unit) {
        case "Hrs":
          return value * 3600;
        case "Min":
          return value * 60;
        case "Sec":
        default:
          return value;
      }
    };

    const totalSeconds =
      toSeconds(preparationTime, preparationUnit) +
      toSeconds(cookingTime, cookingUnit);

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
  const r = recipe as Recipe;
  const [menuOpen, setMenuOpen] = useState(false);

  const title = r?.title ?? "Creamy Carbonara";
  const cover = r?.image_url ?? r?.image_url ?? "/assets/pasta.jpg";
  const difficulty = r?.difficulty ?? "Medium";
  const [likes, setLikes] = useState<number>(r?.like_count ?? 0);
  const [dislikes, setDislikes] = useState<number>(r?.dislike_count ?? 0);
  const authorName =
    r?.profiles?.display_name ?? r?.profiles?.username ?? "chef_marco";
  const authorUsername = r?.profiles?.username;

  const authorAvatar = r?.profiles?.avatar_url
    ? r.profiles.avatar_url
    : "/assets/avatar.jpg";
  const comments = r?.comments ?? 0;
  const saves = r?.saves ?? 0;
  const description =
    r?.description ??
    "Classic Italian pasta with egg, Pecorino and crispy pancetta. A family favorite!";
  const servings = r?.servings ?? 4;
  const [rating, setRating] = useState<number>(r?.rating ?? 100);
  const category = r?.categories?.name ?? "Pasta";

  const preparation_time = r?.preparation_time ?? 0;
  const cooking_time = r?.cooking_time ?? 0;
  const preparation_unit = r?.preparation_unit ?? "Min";
  const cooking_unit = r?.cooking_unit ?? "Min";

  const [currentReaction, setCurrentReaction] = useState<
    "like" | "dislike" | null
  >(r.current_user_reaction);

  const hasTimes = preparation_time > 0 || cooking_time > 0;
  const timeLabel = hasTimes
    ? convertTimeToMinutes(
        preparation_time,
        cooking_time,
        preparation_unit,
        cooking_unit,
      )
    : "25 Min";

  const handleReaction = async (reaction: "like" | "dislike") => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert("You must be logged in to react to a recipe.");
      return;
    }
    // Save previous local state so we can revert on failure
    const prevLikes = likes;
    const prevDislikes = dislikes;
    const prevReaction = currentReaction;

    // Determine whether the user is toggling off their current reaction
    const isTogglingOff = currentReaction === reaction;
    const newReaction = isTogglingOff ? null : reaction;

    if (isTogglingOff) {
      // User is toggling off their reaction
      setCurrentReaction(null);
      if (reaction === "like") {
        setLikes((prev) => Math.max(0, prev - 1));
      } else {
        setDislikes((prev) => Math.max(0, prev - 1));
      }
    } else {
      // User is setting a new reaction. If they had the opposite reaction,
      // decrement that count and increment the new one. Use Math.max to avoid negatives.
      if (currentReaction === "like" && reaction === "dislike") {
        setLikes((prev) => Math.max(0, prev - 1));
        setDislikes((prev) => prev + 1);
      } else if (currentReaction === "dislike" && reaction === "like") {
        setDislikes((prev) => Math.max(0, prev - 1));
        setLikes((prev) => prev + 1);
      } else {
        // no previous reaction
        if (reaction === "like") {
          setLikes((prev) => prev + 1);
        } else {
          setDislikes((prev) => prev + 1);
        }
      }
      setCurrentReaction(reaction);
    }

    // Persist change: delete when toggling off, otherwise upsert
    let error: any = null;
    if (newReaction === null) {
      const res = await supabase
        .from("recipe_reactions")
        .delete()
        .match({ user_id: user.id, recipe_id: r.id });
      error = res.error;
    } else {
      const res = await supabase
        .from("recipe_reactions")
        .upsert(
          { user_id: user.id, recipe_id: r.id, reaction: newReaction },
          { onConflict: ["user_id", "recipe_id"] },
        );
      error = res.error;
    }
    if (error) {
      // Revert local optimistic updates
      setLikes(prevLikes);
      setDislikes(prevDislikes);
      setCurrentReaction(prevReaction);
      alert(error.message);
    }
  };

  const CalculateRating = () => {
    if (likes + dislikes > 0) {
      const calculated = Math.round((likes / (likes + dislikes)) * 100);
      setRating(calculated);
    } else {
      setRating(0);
    }
  };

  useEffect(() => {
    CalculateRating();
  }, [likes, dislikes]);

  return (
    <article className={styles.container}>
      <header className={styles.header}>
        <img
          src={`${supabaseUrl}${cover}`}
          alt={title}
          className={styles.cover}
        />
        <div className={styles.topRightMenu}>
          <button
            className={styles.menuButton}
            aria-label="More options"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <EllipsisVertical color="white" size={24} />
          </button>
          {menuOpen && (
            <div className={styles.menuDropdown}>
              <button
                className={styles.menuItem}
                onClick={() => {
                  console.log("save");
                  setMenuOpen(false);
                }}
              >
                <Bookmark />
                Save
              </button>
              <button
                className={styles.menuItem}
                onClick={() => {
                  console.log("share");
                  setMenuOpen(false);
                }}
              >
                <Forward />
                Share
              </button>
              <button
                className={styles.menuItem}
                onClick={() => {
                  console.log("report");
                  setMenuOpen(false);
                }}
              >
                <MessageSquareWarning color="#cd3131" />
                Report
              </button>
            </div>
          )}
        </div>
        <div className={styles.headerOverlay}>
          <h3 className={styles.title}>{title}</h3>
          <div className={styles.badges}>
            <span className={styles.badge}>
              <Clock /> {timeLabel}
            </span>
            <span
              className={`${styles.badge} ${
                difficulty === "Easy"
                  ? styles.easy
                  : difficulty === "Medium"
                    ? styles.medium
                    : styles.hard
              }`}
            >
              <ChefHat /> {difficulty}
            </span>
            <div className={styles.reactionButtons}>
              <span
                onClick={() => handleReaction("like")}
                className={`${styles.badge} ${styles.reactionBadge} ${currentReaction === "like" ? styles.activebadge : ""}`}
                style={{ cursor: "pointer" }}
              >
                <ThumbsUp className={styles.reactionButton} size={24} />
              </span>
              <span
                onClick={() => handleReaction("dislike")}
                className={`${styles.badge} ${styles.reactionBadge} ${currentReaction === "dislike" ? styles.activebadge : ""}`}
                style={{ cursor: "pointer" }}
              >
                <ThumbsDown className={styles.reactionButton} size={24} />
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className={styles.content}>
        <div className={styles.authorRow}>
          <img
            className={styles.avatar}
            src={`${supabaseAvatarUrl}${authorAvatar}`}
            alt={authorName}
            onClick={() => {
              navigate(`/profile/${authorUsername}`);
            }}
            style={{ cursor: "pointer" }}
          />
          <div className={styles.authorInfo}>
            <div className={styles.authorName}>
              <span
                onClick={() => {
                  navigate(`/profile/${authorUsername}`);
                }}
                style={{ cursor: "pointer" }}
              >
                {authorName}
              </span>
            </div>
            <div className={styles.authorMeta}>
              <span
                onClick={() => {
                  navigate(`/profile/${authorUsername}`);
                }}
                style={{ cursor: "pointer" }}
              >
                {"@" + authorUsername}
              </span>
            </div>
          </div>
          <div className={styles.metaCounts}>
            <div>💬 {comments}</div>
            <div>🔖 {saves}</div>
          </div>
        </div>

        <p className={styles.description}>{description}</p>

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{servings}</div>
            <div className={styles.statLabel}>Servings</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{`${rating}%`}</div>
            <div className={styles.statLabel}>Rating</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{category}</div>
            <div className={styles.statLabel}>Category</div>
          </div>
        </div>

        <div className={styles.footer}>
          <Button
            text={"View Recipe"}
            backgroundColor={"linear-gradient(90deg,#ff7a18,#ef4444)"}
            textColor="#fff"
            fontSize="1rem"
            onButtonClick={() => navigate(`/recipes/${r.id}`)}
            type="button"
            outline={"0px"}
          />

          <Button
            backgroundColor="#fff"
            textColor="#374151"
            outline={`1px solid var(--border)`}
            onButtonClick={() => console.log("Save recipe")}
            type="button"
          >
            <Bookmark />
            Save
          </Button>
        </div>
      </section>
    </article>
  );
}
