import styles from "./TopRecipes.module.css";
import { TrendingUp } from "lucide-react";
import TopRecipeItem from "../TopRecipeItem/TopRecipeItem";

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

type TopRecipeProps = {
  recipes: Recipe[];
};

export default function TopRecipes({ recipes }: TopRecipeProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <TrendingUp color="#ff6900" size={30} />
        <span>Top Rated</span>
      </div>
      <div className={styles.recipeList}>
        {recipes.map((recipe) => (
          <TopRecipeItem key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </div>
  );
}
