import { useParams, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import RecipeView from "../Components/RecipeView/RecipeView";
import { supabase } from "../supabase";

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
  ingredients: string | null;
  instructions: string | null;
};

export default function RecipePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchRecipe = async () => {
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
        like_count,
        dislike_count,
        ingredients,
        instructions,
        save_count,
        profiles!recipes_author_id_fkey(*),
        categories(*),
        recipe_reactions!left (
          reaction,
          user_id
        ),
        recipe_saves!left (
        recipe_id,
        saved_by
      )
          
      `,
        )
        .eq("id", id)
        .eq("recipe_reactions.user_id", user?.id ?? "")
        .single();

      if (error) {
        console.error("Error fetching recipe:", error);
        setLoading(false);
        return;
      }

      const transformed = {
        ...data,
        current_user_reaction: data.recipe_reactions?.[0]?.reaction ?? null,
        is_saved: data.recipe_saves?.[0]?.recipe_id !== undefined,
      };

      setRecipe(transformed);
      setLoading(false);
    };

    fetchRecipe();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!recipe) return <div>Recipe not found</div>;

  return (
    <RecipeView
      recipe={recipe}
      onBack={() => navigate("/recipes")}
      onUserClick={(username) => navigate(`/profile/${username}`)}
    />
  );
}
