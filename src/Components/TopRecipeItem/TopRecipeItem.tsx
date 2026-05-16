import styles from "./TopRecipeItem.module.css";
import { useNavigate } from "react-router";

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

type TopRecipeItemProps = {
  recipe: Recipe;
};

export default function TopRecipeItem({ recipe }: TopRecipeItemProps) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_RECIPE_BUCKET_URL as string;
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/recipes/${recipe.id}`);
  };

  return (
    <div className={styles.container} onClick={handleClick}>
      <img
        src={supabaseUrl + recipe.image_url}
        alt={recipe.title}
        className={styles.image}
      />
      <div className={styles.info}>
        <span className={styles.title}>{recipe.title}</span>
        <span className={styles.likes}>{recipe.like_count} likes</span>
      </div>
    </div>
  );
}
