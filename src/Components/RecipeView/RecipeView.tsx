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
  EllipsisVertical,
  Forward,
  MessageSquareWarning,
} from "lucide-react";
import { supabase } from "../../supabase";
import ProfileStat from "../ProfileStat/ProfileStat";
import styles from "./RecipeView.module.css";
const supabaseUrl = import.meta.env.VITE_SUPABASE_RECIPE_BUCKET_URL as string;
const supabaseAvatarUrl = import.meta.env
  .VITE_SUPABASE_PROFILE_BUCKET_URL as string;

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
  is_saved: boolean;
  save_count: number;

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

interface RecipeViewProps {
  recipe: Recipe;
  onBack: () => void;
  onUserClick: (username: string) => void;
}

export default function RecipeView({
  recipe,
  onBack,
  onUserClick,
}: RecipeViewProps) {
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

  const [likes, setLikes] = useState(recipe.like_count);
  const [dislikes, setDislikes] = useState(recipe.dislike_count);
  const [currentReaction, setCurrentReaction] = useState<
    "like" | "dislike" | null
  >(recipe.current_user_reaction);
  const [isSaved, setIsSaved] = useState(recipe.is_saved);
  const [saveCount, setSaveCount] = useState<number>(recipe.save_count);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const timeLabel = convertTimeToMinutes(
    recipe.preparation_time,
    recipe.cooking_time,
    recipe.preparation_unit,
    recipe.cooking_unit,
  );

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
        .match({ user_id: user.id, recipe_id: recipe.id });
      error = res.error;
    } else {
      const res = await supabase
        .from("recipe_reactions")
        .upsert(
          { user_id: user.id, recipe_id: recipe.id, reaction: newReaction },
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

  const handleSave = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert("You must be logged in to react to a recipe.");
      return;
    }
    const prevSaved = isSaved;
    const prevSaveCount = saveCount;
    let error: any = null;

    // Optimistically update UI
    if (isSaved) {
      setSaveCount((prev) => Math.max(0, prev - 1));
      setIsSaved(false);
      const res = await supabase
        .from("recipe_saves")
        .delete()
        .match({ recipe_id: recipe.id, saved_by: user.id });
      error = res.error;
      if (error) {
        // Revert optimistic update on failure
        setSaveCount(prevSaveCount);
        setIsSaved(prevSaved);
        alert(error.message);
        return;
      }
    } else {
      setSaveCount((prev) => prev + 1);
      setIsSaved(true);
      const res = await supabase
        .from("recipe_saves")
        .upsert({ recipe_id: recipe.id, saved_by: user.id });
      error = res.error;
      if (error) {
        // Revert optimistic update on failure
        setSaveCount(prevSaveCount);
        setIsSaved(prevSaved);
        alert(error.message);
        return;
      }
    }
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
                    handleSave();
                    setMenuOpen(false);
                  }}
                >
                  <Bookmark />
                  {isSaved ? "Unsave" : "Save"}
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
            <div className={styles.badges}>
              <span className={styles.badge}>
                <Clock size={16} /> {timeLabel}
              </span>
              {/*<span className={styles.badge}>
                <CookingPot size={16} /> {cookTime}
              </span>*/}
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
                  currentReaction === "like" ? styles.activeLike : ""
                }`}
                onClick={() => handleReaction("like")}
              >
                <ThumbsUp size={18} />
              </button>

              <button
                className={`${styles.iconBtn} ${
                  currentReaction === "dislike" ? styles.activeDislike : ""
                }`}
                onClick={() => handleReaction("dislike")}
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
            <ProfileStat
              stat="Servings"
              statAmount={recipe.servings.toString()}
              border="2px solid var(--stat1-border)"
              background="var(--stat1-bg)"
              iconColor="var(--stat1-icon)"
            />

            <ProfileStat
              stat="Rating"
              statAmount={likePercentage.toString() + "%"}
              border="2px solid var(--stat2-border)"
              background="var(--stat2-bg)"
              iconColor="var(--stat2-icon)"
            />

            <ProfileStat
              stat="Category"
              statAmount={recipe.categories.name}
              border="2px solid var(--stat3-border)"
              background="var(--stat3-bg)"
              iconColor="var(--stat3-icon)"
            />

            <ProfileStat
              stat="Comments"
              statAmount={0}
              border="2px solid var(--stat4-border)"
              background="var(--stat4-bg)"
              iconColor="var(--stat4-icon)"
            />
          </div>

          {/* INGREDIENTS */}
          <section>
            <div className={styles.sectionTitle}>
              <ChefHat color="#f97316" size={26} />
              Ingredients
            </div>

            <div className={styles.ingredientsBox}>
              <ul>
                {recipe.ingredients?.map((item: string, i: number) => (
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
              {recipe.instructions?.map((step: string, i: number) => (
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
            <span>{saveCount} Saves</span>
          </div>
        </div>
      </div>
    </div>
  );
}
