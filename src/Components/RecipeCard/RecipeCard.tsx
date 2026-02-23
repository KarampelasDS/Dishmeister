import styles from "./RecipeCard.module.css";
import Button from "../Button/Button";
const supabaseUrl = import.meta.env.VITE_SUPABASE_RECIPE_BUCKET_URL as string;
const supabaseAvatarUrl = import.meta.env
  .VITE_SUPABASE_PROFILE_BUCKET_URL as string;
import { supabase } from "../../supabase";

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
  const convertTimeToMinutes = (
    preparationTime: number,
    cookingTime: number,
    preparationUnit: string,
    cookingUnit: string,
  ) => {
    let prepTime = preparationTime;
    let cookTime = cookingTime;
    if (preparationUnit === "Hrs") {
      prepTime = prepTime * 60;
    } else if (preparationUnit === "Sec") {
      prepTime = prepTime / 60;
    }
    if (cookingUnit === "Hrs") {
      cookTime = cookTime * 60;
    } else if (cookingUnit === "Sec") {
      cookTime = cookTime / 60;
    }
    const totalTimeMinutes = prepTime + cookTime;
    if (totalTimeMinutes < 1) {
      return "<1 Min";
    } else if (totalTimeMinutes > 60) {
      return `${(totalTimeMinutes / 60).toFixed()} Hr ${totalTimeMinutes % 60 > 0 ? `${totalTimeMinutes % 60} Min` : ""}`;
    }
    return `${totalTimeMinutes.toFixed()} Min`;
  };
  const r = recipe as Recipe;

  const title = r?.title ?? "Creamy Carbonara";
  const cover = r?.image_url ?? r?.image_url ?? "/assets/pasta.jpg";
  const difficulty = r?.difficulty ?? "Medium";
  const likes = r?.like_count ?? "1,243 Likes";
  const dislikes = r?.dislike_count ?? "56 Dislikes";
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
  const rating = r?.rating ?? 4.8;
  const category = r?.categories?.name ?? "Pasta";

  const preparation_time = r?.preparation_time ?? 0;
  const cooking_time = r?.cooking_time ?? 0;
  const preparation_unit = r?.preparation_unit ?? "Min";
  const cooking_unit = r?.cooking_unit ?? "Min";

  const hasTimes = preparation_time > 0 || cooking_time > 0;
  const timeLabel = hasTimes
    ? convertTimeToMinutes(
        preparation_time,
        cooking_time,
        preparation_unit,
        cooking_unit,
      )
    : "25 Min";

  const reactToRecipe = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert("You must be logged in to react to a recipe.");
      return;
    }
  };

  return (
    <article className={styles.container}>
      <header className={styles.header}>
        <img
          src={`${supabaseUrl}${cover}`}
          alt={title}
          className={styles.cover}
        />
        <div className={styles.headerOverlay}>
          <h3 className={styles.title}>{title}</h3>
          <div className={styles.badges}>
            <span className={styles.badge}>⏱ {timeLabel}</span>
            <span className={styles.badge}>🔥 {difficulty}</span>
            <span className={styles.badge}>👍 {likes}</span>
            <span className={styles.badge}>👎 {dislikes}</span>
          </div>
        </div>
      </header>

      <section className={styles.content}>
        <div className={styles.authorRow}>
          <img
            className={styles.avatar}
            src={`${supabaseAvatarUrl}${authorAvatar}`}
            alt={authorName}
          />
          <div className={styles.authorInfo}>
            <div className={styles.authorName}>{authorName}</div>
            <div className={styles.authorMeta}>{"@" + authorUsername}</div>
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
            <div className={styles.statValue}>{rating}</div>
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
            onButtonClick={() => console.log("View recipe")}
            type="button"
            outline={"0px"}
          />

          <Button
            text={"Save"}
            backgroundColor="#fff"
            textColor="#374151"
            outline={`1px solid var(--border)`}
            onButtonClick={() => console.log("Save recipe")}
            type="button"
          />
        </div>
      </section>
    </article>
  );
}
