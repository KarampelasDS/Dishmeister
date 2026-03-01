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
      const { data, error } = await supabase
        .from("recipes")
        .select("*, profiles(*), categories(*)")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching recipe:", error);
        setLoading(false);
        return;
      }

      setRecipe(data);
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
