import styles from "./RecipeCompactCard.module.css";
const supabaseUrl = import.meta.env.VITE_SUPABASE_RECIPE_BUCKET_URL as string;
const supabaseAvatarUrl = import.meta.env
  .VITE_SUPABASE_PROFILE_BUCKET_URL as string;
import { supabase } from "../../supabase";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useFeedCache } from "../../Context/FeedCacheContext";
import type { ReactNode } from "react";
import { useClickOutside } from "../../Hooks/useClickOutside";
import ReportModal from "../ReportModal/ReportModal";
import { useAuth } from "../../Context/AuthProvider";



import {
  Heart,
  Clock,
  ChefHat,
  EllipsisVertical,
  Bookmark,
  BookmarkCheck,
  Forward,
  MessageSquareWarning,
  MessageCircle,
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
  comment_count: number;
  is_saved: boolean;
  save_count: number;
  profiles: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
    follower_count: number;
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
  const { invalidate, patchRecipe } = useFeedCache();
  const { setIsAuthOpen, showError } = useAuth();
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
  const menuRef = useClickOutside(() => setMenuOpen(false));
  const [reportModalOpen, setReportModalOpen] = useState(false);



  const title = r?.title ?? "Creamy Carbonara";
  const cover = r?.image_url ?? r?.image_url ?? "/assets/pasta.jpg";
  const difficulty = r?.difficulty ?? "Medium";
  const [likes] = useState<number>(r?.like_count ?? 0);
  const [dislikes] = useState<number>(r?.dislike_count ?? 0);
  const authorName =
    r?.profiles?.display_name ?? r?.profiles?.username ?? "chef_marco";
  const authorUsername = r?.profiles?.username;
  const followerCount = r?.profiles?.follower_count ?? 0;

  const authorAvatar = r?.profiles?.avatar_url
    ? r.profiles.avatar_url
    : "/assets/avatar.jpg";
  const description = r?.description ?? "";
  const [rating, setRating] = useState<number>(100);
  const [isSaved, setIsSaved] = useState<boolean>(r?.is_saved ?? false);
  const [saveCount, setSaveCount] = useState<number>(r?.save_count ?? 0);
  const preparation_time = r?.preparation_time ?? 0;
  const cooking_time = r?.cooking_time ?? 0;
  const preparation_unit = r?.preparation_unit ?? "Min";
  const cooking_unit = r?.cooking_unit ?? "Min";
  const comment_count = r?.comment_count ?? 0;
  const [isSaving, setIsSaving] = useState(false);

  const hasTimes = preparation_time > 0 || cooking_time > 0;
  const timeLabel = hasTimes
    ? convertTimeToMinutes(
        preparation_time,
        cooking_time,
        preparation_unit,
        cooking_unit,
      )
    : "25 Min";

  const handleSave = async () => {
    if (isSaving || !recipe) return;
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
      patchRecipe(recipe?.id, { is_saved: false, save_count: newSaveCount });
      const res = await supabase
        .from("recipe_saves")
        .delete()
        .match({ recipe_id: recipe?.id, saved_by: user.id });
      invalidate("savedRecipes");
      error = res.error;
      if (error) {
        setSaveCount(prevSaveCount);
        setIsSaved(prevSaved);
        patchRecipe(recipe.id, {
          is_saved: prevSaved,
          save_count: prevSaveCount,
        });
        showError(error.message);
        setIsSaving(false);
        return;
      }
    } else {
      const newSaveCount = saveCount + 1;
      setSaveCount(newSaveCount);
      setIsSaved(true);
      patchRecipe(recipe.id, { is_saved: true, save_count: newSaveCount });
      const res = await supabase
        .from("recipe_saves")
        .upsert({ recipe_id: recipe.id, saved_by: user.id });
      invalidate("savedRecipes");
      error = res.error;
      if (error) {
        setSaveCount(prevSaveCount);
        setIsSaved(prevSaved);
        patchRecipe(recipe.id, {
          is_saved: prevSaved,
          save_count: prevSaveCount,
        });
        showError(error.message);
        setIsSaving(false);
        return;
      }
    }
    setIsSaving(false);
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
    <>
      {reportModalOpen && (
        <ReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          targetType="recipe"
          targetId={recipe?.id || ""}
        />
      )}

      <article

      onClick={() => navigate(`/recipes/${recipe?.id}`)}
      className={styles.container}
    >
      <header className={styles.header}>
        <img
          src={`${supabaseUrl}${cover}`}
          alt={title}
          className={styles.cover}
        />
        <div className={styles.topRightMenu} ref={menuRef}>

          <button
            className={styles.menuButton}
            aria-label="More options"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
          >
            <EllipsisVertical color="white" size={24} />
          </button>
          {menuOpen && (
            <div className={styles.menuDropdown}>
              <button
                className={styles.menuItem}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave();
                  setMenuOpen(false);
                }}
                disabled={isSaving}
              >
                {isSaved ? <BookmarkCheck color="#f59e0b" /> : <Bookmark />}
                {isSaved ? "Unsave" : "Save"}
              </button>
              <button
                className={styles.menuItem}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("share");
                  setMenuOpen(false);
                }}
              >
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
                Report
              </button>

            </div>
          )}
        </div>
        <div className={styles.headerOverlay}>
          <h3 className={styles.title}>{title}</h3>
          <div className={styles.badges}>
            <span className={styles.badge}>
              <Clock size={20} /> {timeLabel}
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
              <ChefHat size={20} /> {difficulty}
            </span>
            <span className={styles.badge}>
              <Heart size={20} /> {rating}%
            </span>
          </div>
        </div>
      </header>

      <section className={styles.content}>
        <div className={styles.description}>{description}</div>
        <div className={styles.authorRow}>
          <img
            className={styles.avatar}
            src={`${supabaseAvatarUrl}${authorAvatar}`}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = "/defaultAvatar.png";
            }}
            alt={authorName}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/profiles/${authorUsername}`);
            }}
            style={{ cursor: "pointer" }}
          />
          <div className={styles.authorInfo}>
            <div className={styles.authorName}>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/profiles/${authorUsername}`);
                }}
                style={{ cursor: "pointer" }}
              >
                {authorName}
              </span>
            </div>
            <div className={styles.authorMeta}>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/profiles/${authorUsername}`);
                }}
                style={{ cursor: "pointer" }}
              >
                {followerCount === 1
                  ? "1 follower"
                  : `${followerCount} followers`}
              </span>
            </div>
          </div>
          <div className={styles.metaCounts}>
            <div>
              <MessageCircle size={20} /> {comment_count}
            </div>
            <div>
              {isSaved ? (
                <BookmarkCheck size={20} color="#f59e0b" />
              ) : (
                <Bookmark size={20} />
              )}{" "}
              {saveCount}
            </div>
          </div>
        </div>
      </section>
    </article>
    </>
  );
}

