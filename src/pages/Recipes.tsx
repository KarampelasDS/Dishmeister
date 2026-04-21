import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import RecipeCard from "../Components/RecipeCard/RecipeCard";

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

const PAGE_SIZE = 10;

function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchRecipes = async () => {
    setLoading(true);

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("recipes")
      .select(
        `
        id,
        title,
        description,
        preparation_time,
        cooking_time,
        servings,
        country_of_origin,
        image_url,
        difficulty,
        preparation_unit,
        cooking_unit,
        created_at,
        like_count,
        dislike_count,
        save_count,
        comment_count,
        profiles!recipes_author_id_fkey(*),
        categories(*),
        recipe_reactions!left (
          reaction,
          user_id
        ),
        recipe_saves!left (
        recipe_id,
        saved_by)
      `,
      )
      .eq("recipe_reactions.user_id", user?.id ?? "")
      .order("created_at", { ascending: false })
      .range(from, to);

    setLoading(false);

    if (error) {
      console.error(error.message);
      return;
    }

    const transformed = data.map((recipe: any) => ({
      ...recipe,
      current_user_reaction: recipe.recipe_reactions?.[0]?.reaction ?? null,
      is_saved: recipe.recipe_saves?.[0]?.recipe_id !== undefined,
    }));

    setRecipes(transformed);
    setHasMore(data.length === PAGE_SIZE);
  };

  useEffect(() => {
    fetchRecipes();
  }, [page]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "1rem" }}>
      <h1>Recipes</h1>

      {loading && <p>Loading...</p>}

      {!loading && recipes.length === 0 && <p>No recipes yet.</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </ul>

      <div style={{ display: "flex", gap: 8 }}>
        <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>

        <button disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

export default Recipes;
