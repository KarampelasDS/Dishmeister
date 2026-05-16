import styles from "./TopRecipes.module.css";
import { TrendingUp } from "lucide-react";
import TopRecipeItem from "../TopRecipeItem/TopRecipeItem";

type TopRecipe = {
  id: string;
  title: string;
  image_url: string;
  like_count: number;
};

type TopRecipeProps = {
  recipes: TopRecipe[];
};

export default function TopRecipes({ recipes }: TopRecipeProps) {
  console.log(recipes);
  if (recipes.length == 0) return;
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
