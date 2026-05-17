import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

import {
  ArrowLeft,
  ThumbsUp,
  Bookmark,
  BookmarkCheck,
  Share2,
  Clock,
  ChefHat,
  UtensilsCrossed,
  ThumbsDown,
  EllipsisVertical,
  Forward,
  MessageSquareWarning,
  Trash,
  Pencil,
} from "lucide-react";
import { supabase } from "../../supabase";
import ProfileStat from "../ProfileStat/ProfileStat";
import CommentsSection from "../CommentsSection/CommentsSection";
import styles from "./RecipeView.module.css";
import { hasFlag } from "country-flag-icons";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import ConfirmModal from "../ConfirmModal/ConfirmModal";
import { useFeedCache } from "../../Context/FeedCacheContext";
import EditRecipe from "../EditRecipe/EditRecipe";
import { useClickOutside } from "../../Hooks/useClickOutside";
import ReportModal from "../ReportModal/ReportModal";
import ErrorModal from "../ErrorModal/ErrorModal";
import { useAuth } from "../../Context/AuthProvider";
import { useToast } from "../../Context/ToastContext";
import { getFriendlyErrorMessage } from "../../utils/errorUtils";


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
  ingredients: string[];
  instructions: string[];
};

interface Comment {
  id: string;
  content: string;
  created_at: string;
  like_count: number;
  dislike_count: number;
  parent_id: string | null;
  current_user_reaction: "like" | "dislike" | null;
  profiles: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  replies: Comment[];
}

interface RecipeViewProps {
  recipe: Recipe;
  comments: Comment[];
  currentUserAvatar: string | null;
  currentUserId: string | null;
  onBack: () => void;
  onUserClick: (username: string) => void;
  onCommentAdded: () => void;
  onCommentDeleted: (commentId: string) => void;
}

export default function RecipeView({
  recipe,
  comments,
  currentUserAvatar,
  currentUserId,
  onBack,
  onUserClick,
  onCommentAdded,
  onCommentDeleted,
}: RecipeViewProps) {
  const navigate = useNavigate();
  const { invalidate, patchRecipe } = useFeedCache();
  const { profile, setIsAuthOpen, showError } = useAuth();
  const { showToast } = useToast();

  const handleShare = () => {
    const url = `${window.location.origin}/recipes/${recipe.id}`;
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
  const menuRef = useClickOutside(() => setMenuOpen(false));
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [errorModal, setErrorModal] = useState({ open: false, message: "" });

  const [reacting, setReacting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isEditing, setIsEditing] = useState(false);

  const [localRecipe, setLocalRecipe] = useState(recipe);

  const totalVotes = likes + dislikes;
  const likePercentage =
    totalVotes === 0 ? 0 : Math.round((likes / totalVotes) * 100);

  const timeLabel = convertTimeToMinutes(
    recipe.preparation_time,
    recipe.cooking_time,
    recipe.preparation_unit,
    recipe.cooking_unit,
  );

  const location = useLocation();

  useEffect(() => {
    if (location.hash === "#comments") {
      const element = document.getElementById("comments");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [location.hash, comments]);

  const handleReaction = async (reaction: "like" | "dislike") => {
    if (reacting) return;
    setReacting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setReacting(false);
      setIsAuthOpen(true);
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
    patchRecipe(recipe.id, {
      like_count: newLikes,
      dislike_count: newDislikes,
      current_user_reaction: newReaction,
    });

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
          { onConflict: "user_id,recipe_id" },
        );
      error = res.error;
    }

    if (error) {
      setLikes(prevLikes);
      setDislikes(prevDislikes);
      setCurrentReaction(prevReaction);
      patchRecipe(recipe.id, {
        like_count: prevLikes,
        dislike_count: prevDislikes,
        current_user_reaction: prevReaction,
      });
      showError(getFriendlyErrorMessage(error));
    }

    setReacting(false);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIsAuthOpen(true);
      setSaving(false);
      return;
    }

    const prevSaved = isSaved;
    const prevSaveCount = saveCount;
    let error: any = null;

    if (isSaved) {
      const newSaveCount = Math.max(0, saveCount - 1);
      setSaveCount(newSaveCount);
      setIsSaved(false);
      patchRecipe(recipe.id, { is_saved: false, save_count: newSaveCount });

      const res = await supabase
        .from("recipe_saves")
        .delete()
        .match({ recipe_id: recipe.id, saved_by: user.id });
      error = res.error;

      if (error) {
        setSaveCount(prevSaveCount);
        setIsSaved(prevSaved);
        patchRecipe(recipe.id, {
          is_saved: prevSaved,
          save_count: prevSaveCount,
        });
        showError(getFriendlyErrorMessage(error));
        setSaving(false);
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
      error = res.error;

      if (error) {
        setSaveCount(prevSaveCount);
        setIsSaved(prevSaved);
        patchRecipe(recipe.id, {
          is_saved: prevSaved,
          save_count: prevSaveCount,
        });
        showError(getFriendlyErrorMessage(error));
        setSaving(false);
        return;
      }
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id !== recipe.profiles.id) {
      showError("You can only delete your own recipes.");
      setDeleteConfirmOpen(false);
      return;
    } else if (!user) {
      showError("You must be logged in to delete a recipe.");
      setDeleteConfirmOpen(false);
      return;
    }

    let error: any = null;

    setIsDeleting(true);

    const res = await supabase
      .from("recipes")
      .delete()
      .match({ id: recipe.id });
    error = res.error;
    if (error) {
      showError(getFriendlyErrorMessage(error));
      setDeleteConfirmOpen(false);
      setIsDeleting(false);
      return;
    }

    if (recipe.image_url) {
      const { error: storageObjectError } = await supabase
        .from("storage_objects")
        .update({ referenced: false })
        .eq("bucket", "recipe-images")
        .eq("path", recipe.image_url);

      if (storageObjectError) {
        showError(getFriendlyErrorMessage(storageObjectError));
      }
    }

    if (isSaved) invalidate("savedRecipes");
    setDeleteConfirmOpen(false);
    setIsDeleting(false);
    onBack();
  };

  if (isEditing) {
    return (
      <EditRecipe
        recipe={localRecipe}
        onBack={() => setIsEditing(false)}
        onSaved={(updatedFields) => {
          setLocalRecipe((prev) => ({ ...prev, ...updatedFields }));
          patchRecipe(recipe.id, updatedFields);
          setIsEditing(false);
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div className={styles.wrapper}>
      {deleteConfirmOpen && (
        <ConfirmModal
          modalType="delete"
          onConfirm={() => handleDelete()}
          onCancel={() => setDeleteConfirmOpen(false)}
        />
      )}
      {reportModalOpen && (
        <ReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          targetType="recipe"
          targetId={recipe.id}
        />
      )}
      {errorModal.open && (
        <ErrorModal
          isOpen={errorModal.open}
          onClose={() => setErrorModal({ ...errorModal, open: false })}
          message={errorModal.message}
        />
      )}

      <div className={styles.backRow}>
        <span onClick={onBack}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </span>
      </div>

      <div className={styles.card}>
        {/* HERO */}
        <div className={styles.hero}>
          <img
            src={
              recipe.image_url
                ? `${supabaseUrl}${recipe.image_url}`
                : "/assets/pasta.jpg"
            }
            alt={recipe.title}
            className={styles.heroImage}
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
                {currentUserId === recipe.profiles.id && (
                  <button
                    className={styles.menuItem}
                    onClick={() => {
                      setIsEditing(true);
                      setMenuOpen(false);
                    }}
                  >
                    <Pencil />
                    Edit
                  </button>
                )}
                <button
                  className={styles.menuItem}
                  onClick={() => {
                    handleSave();
                    setMenuOpen(false);
                  }}
                >
                  {isSaved ? <BookmarkCheck /> : <Bookmark />}
                  {isSaved ? "Unsave" : "Save"}
                </button>
                <button className={styles.menuItem} onClick={handleShare}>
                  <Forward />
                  Share
                </button>
                {currentUserId !== recipe.profiles.id && (
                  <button
                    className={styles.menuItem}
                    onClick={() => {
                      setReportModalOpen(true);
                      setMenuOpen(false);
                    }}
                  >
                    <MessageSquareWarning color="#cd3131" />
                    Report
                  </button>
                )}
                {profile?.username === recipe.profiles.username && (
                  <button
                    className={styles.menuItem}
                    onClick={() => {
                      setDeleteConfirmOpen(true);
                      setMenuOpen(false);
                    }}
                  >
                    <Trash color="#cd3131" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
          <div className={styles.headerOverlay}>
            <div className={styles.badges}>
              <span className={styles.badge}>
                <Clock size={16} /> {timeLabel}
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
              {recipe.country_of_origin &&
                hasFlag(recipe.country_of_origin!) && (
                  <a
                    data-tooltip-id="my-tooltip"
                    data-tooltip-content={recipe.country_of_origin!.toString()}
                  >
                    <span
                      className={styles.badge}
                      style={{
                        background: `url(${hasFlag(recipe.country_of_origin!) ? `https://purecatamphetamine.github.io/country-flag-icons/3x2/${recipe.country_of_origin!}.svg` : undefined})`,
                        minHeight: "20px",
                        minWidth: "30px",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        color: "white",
                      }}
                    ></span>
                    <Tooltip id="my-tooltip" />
                  </a>
                )}
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
                src={
                  recipe.profiles.avatar_url
                    ? `${supabaseAvatarUrl}${recipe.profiles.avatar_url}`
                    : "/defaultAvatar.png"
                }
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = "/defaultAvatar.png";
                }}
                className={styles.avatar}
              />
              <div className={styles.profileInfo}>
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
                disabled={reacting}
              >
                <ThumbsUp size={18} />
              </button>

              <button
                className={`${styles.iconBtn} ${
                  currentReaction === "dislike" ? styles.activeDislike : ""
                }`}
                onClick={() => handleReaction("dislike")}
                disabled={reacting}
              >
                <ThumbsDown size={18} />
              </button>

              <button
                className={`${styles.iconBtn} ${
                  isSaved ? styles.activeSave : ""
                }`}
                onClick={handleSave}
                disabled={saving}
              >
                {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
              </button>

              <button className={styles.iconBtn}>
                <Share2 size={18} onClick={handleShare} />
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
              onClick={() => navigate(`/explore?category=${recipe.categories.id}`)}
            />
            <ProfileStat
              stat="Comments"
              statAmount={comments.length.toString()}
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
            <span>{dislikes.toLocaleString()} dislikes</span>
            <span>{comments.length} comments</span>
            <span>{saveCount} saves</span>
          </div>

          {/* COMMENTS */}
          <div id="comments">
            <CommentsSection
              comments={comments}
              currentUserAvatar={currentUserAvatar}
              currentUserId={currentUserId}
              recipeId={recipe.id}
              onCommentAdded={onCommentAdded}
              onCommentDeleted={onCommentDeleted}
              onUserClick={onUserClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
