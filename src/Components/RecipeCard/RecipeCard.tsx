import styles from "./RecipeCard.module.css";
import Button from "../Button/Button";
const supabaseUrl = import.meta.env.VITE_SUPABASE_RECIPE_BUCKET_URL as string;
const supabaseAvatarUrl = import.meta.env
  .VITE_SUPABASE_PROFILE_BUCKET_URL as string;
import { supabase } from "../../supabase";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import ProfileStat from "../ProfileStat/ProfileStat";
import {
  ThumbsUp,
  ThumbsDown,
  Clock,
  ChefHat,
  EllipsisVertical,
  Bookmark,
  BookmarkCheck,
  Forward,
  MessageSquareWarning,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "../../Context/AuthProvider";
import { useFeedCache } from "../../Context/FeedCacheContext";
import type { ReactNode } from "react";

import { useClickOutside } from "../../Hooks/useClickOutside";
import ReportModal from "../ReportModal/ReportModal";
import { useToast } from "../../Context/ToastContext";
import { getFriendlyErrorMessage } from "../../utils/errorUtils";


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
  comment_count: number;
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

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const navigate = useNavigate();
  const r = recipe as Recipe;
  const { patchRecipe } = useFeedCache();
  const { setIsAuthOpen, showError } = useAuth();
  const { showToast } = useToast();

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/recipes/${r.id}`;
    navigator.clipboard.writeText(url);
    showToast("Recipe link copied to clipboard!");
    setMenuOpen(false);
  };

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

    if (totalSeconds < 60) return "<1 Min";

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours >= 10) {
      return `${hours} Hr`;
    }

    if (hours > 0) {
      return `${hours} Hr${minutes > 0 ? ` ${minutes} Min` : ""}`;
    }

    return `${minutes} Min`;
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useClickOutside(() => setMenuOpen(false));
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const title = r?.title ?? "Creamy Carbonara";
  const difficulty = r?.difficulty ?? "Medium";
  const [likes, setLikes] = useState<number>(r?.like_count ?? 0);
  const [dislikes, setDislikes] = useState<number>(r?.dislike_count ?? 0);
  const authorName =
    r?.profiles?.display_name ?? r?.profiles?.username ?? "chef_marco";
  const authorUsername = r?.profiles?.username;
  const description = r?.description ?? "";
  const [rating, setRating] = useState<number>(0);
  const [isSaved, setIsSaved] = useState<boolean>(r?.is_saved ?? false);
  const [saveCount, setSaveCount] = useState<number>(r?.save_count ?? 0);
  const preparation_time = r?.preparation_time ?? 0;
  const cooking_time = r?.cooking_time ?? 0;
  const preparation_unit = r?.preparation_unit ?? "Min";
  const cooking_unit = r?.cooking_unit ?? "Min";
  const comment_count = r?.comment_count ?? 0;
  const [isReacting, setIsReacting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
    if (isReacting) return;
    setIsReacting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIsAuthOpen(true);
      setIsReacting(false);
      return;
    }

    const prevLikes = likes;
    const prevDislikes = dislikes;
    const prevReaction = currentReaction;

    const isTogglingOff = currentReaction === reaction;
    const newReaction = isTogglingOff ? null : reaction;

    const newLikes =
      isTogglingOff && reaction === "like"
        ? Math.max(0, likes - 1)
        : !isTogglingOff && reaction === "like"
          ? likes + 1
          : currentReaction === "like" && reaction === "dislike"
            ? Math.max(0, likes - 1)
            : likes;

    const newDislikes =
      isTogglingOff && reaction === "dislike"
        ? Math.max(0, dislikes - 1)
        : !isTogglingOff && reaction === "dislike"
          ? dislikes + 1
          : currentReaction === "dislike" && reaction === "like"
            ? Math.max(0, dislikes - 1)
            : dislikes;

    setLikes(newLikes);
    setDislikes(newDislikes);
    setCurrentReaction(newReaction);
    patchRecipe(r.id, {
      like_count: newLikes,
      dislike_count: newDislikes,
      current_user_reaction: newReaction,
    });

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
          { onConflict: "user_id,recipe_id" },
        );
      error = res.error;
    }

    if (error) {
      setLikes(prevLikes);
      setDislikes(prevDislikes);
      setCurrentReaction(prevReaction);
      patchRecipe(r.id, {
        like_count: prevLikes,
        dislike_count: prevDislikes,
        current_user_reaction: prevReaction,
      });
      showError(getFriendlyErrorMessage(error));
    }

    setIsReacting(false);
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIsAuthOpen(true);
      setIsSaving(false);
      return;
    }

    const prevSaved = isSaved;
    const prevSaveCount = saveCount;
    let error: any = null;

    if (isSaved) {
      const newSaveCount = Math.max(0, saveCount - 1);
      setSaveCount(newSaveCount);
      setIsSaved(false);
      patchRecipe(r.id, { is_saved: false, save_count: newSaveCount });

      const res = await supabase
        .from("recipe_saves")
        .delete()
        .match({ recipe_id: recipe?.id, saved_by: user.id });
      error = res.error;

      if (error) {
        setSaveCount(prevSaveCount);
        setIsSaved(prevSaved);
        patchRecipe(r.id, { is_saved: prevSaved, save_count: prevSaveCount });
        showError(getFriendlyErrorMessage(error));
        setIsSaving(false);
        return;
      }
    } else {
      const newSaveCount = saveCount + 1;
      setSaveCount(newSaveCount);
      setIsSaved(true);
      patchRecipe(r.id, { is_saved: true, save_count: newSaveCount });

      const res = await supabase
        .from("recipe_saves")
        .upsert({ recipe_id: recipe?.id, saved_by: user.id });
      error = res.error;

      if (error) {
        setSaveCount(prevSaveCount);
        setIsSaved(prevSaved);
        patchRecipe(r.id, { is_saved: prevSaved, save_count: prevSaveCount });
        showError(getFriendlyErrorMessage(error));
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(false);
  };

  const CalculateRating = () => {
    if (likes + dislikes > 0) {
      setRating(Math.round((likes / (likes + dislikes)) * 100));
    } else {
      setRating(0);
    }
  };

  useEffect(() => {
    CalculateRating();
  }, [likes, dislikes]);

  return (
    <>
      {reportModalOpen && (
        <ReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          targetType="recipe"
          targetId={r.id}
        />
      )}

      <article className={styles.container}>
        <header className={styles.header}>
          <img
            src={
              r?.image_url
                ? `${supabaseUrl}${r.image_url}`
                : "/assets/pasta.jpg"
            }
            alt={title}
            className={styles.cover}
            onClick={() => navigate(`/recipes/${r.id}`)}
          />
          <div className={styles.topRightMenu} ref={menuRef}>
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
                  disabled={isSaving}
                >
                  {isSaved ? <BookmarkCheck color="#f59e0b" /> : <Bookmark />}
                  {isSaved ? "Unsave" : "Save"}
                </button>
                <button className={styles.menuItem} onClick={handleShare}>
                  <Forward />
                  Share
                </button>
                <button
                  className={styles.menuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    setReportModalOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  <MessageSquareWarning color="#cd3131" />
                  <span style={{ color: "#cd3131" }}>Report</span>
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
              src={
                r?.profiles?.avatar_url
                  ? `${supabaseAvatarUrl}${r.profiles.avatar_url}`
                  : "/defaultAvatar.png"
              }
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = "/defaultAvatar.png";
              }}
              alt={authorName}
              onClick={() => navigate(`/profiles/${authorUsername}`)}
              style={{ cursor: "pointer" }}
            />
            <div className={styles.authorInfo}>
              <div className={styles.authorName}>
                <span
                  onClick={() => navigate(`/profiles/${authorUsername}`)}
                  style={{ cursor: "pointer" }}
                >
                  {authorName}
                </span>
              </div>
              <div className={styles.authorMeta}>
                <span
                  onClick={() => navigate(`/profiles/${authorUsername}`)}
                  style={{ cursor: "pointer" }}
                >
                  {"@" + authorUsername}
                </span>
              </div>
            </div>
            <div className={styles.metaCounts}>
              <div
                onClick={() => navigate(`/recipes/${r.id}#comments`)}
                style={{ cursor: "pointer" }}
              >
                <MessageCircle /> {comment_count}
              </div>
              <div>
                <Bookmark /> {saveCount}
              </div>
            </div>
          </div>

          <p className={styles.description}>{description}</p>

          <div className={styles.statsRow}>
            <ProfileStat
              stat="Servings"
              statAmount={recipe?.servings.toString()}
              border="2px solid var(--stat1-border)"
              background="var(--stat1-bg)"
              iconColor="var(--stat1-icon)"
            />
            <ProfileStat
              stat="Rating"
              statAmount={rating.toString() + "%"}
              border="2px solid var(--stat2-border)"
              background="var(--stat2-bg)"
              iconColor="var(--stat2-icon)"
            />
            <ProfileStat
              stat="Category"
              statAmount={recipe?.categories.name}
              border="2px solid var(--stat3-border)"
              background="var(--stat3-bg)"
              iconColor="var(--stat3-icon)"
              onClick={() => navigate(`/explore?category=${recipe?.categories.id}`)}
            />
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
              onButtonClick={() => handleSave()}
              type="button"
              isActive={!isSaving}
            >
              {isSaved ? <BookmarkCheck color="#f59e0b" /> : <Bookmark />}
              {isSaved ? "Unsave" : "Save"}
            </Button>
          </div>
        </section>
      </article>
    </>
  );
}
