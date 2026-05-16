import styles from "./TopRecipeItem.module.css";
import { useNavigate } from "react-router";

type TopRecipe = {
  id: string;
  title: string;
  image_url: string;
  like_count: number;
};

type TopRecipeItemProps = {
  recipe: TopRecipe;
};

export default function TopRecipeItem({ recipe }: TopRecipeItemProps) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_RECIPE_BUCKET_URL as string;
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/recipes/${recipe.id}`);
  };

  if (!recipe) return;

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
