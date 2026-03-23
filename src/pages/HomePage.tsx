import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router";
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

type FeedTab = "for-you" | "following";

const PAGE_SIZE = 10;

const SHARED_SELECT = `
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
    saved_by
  )
`;

function HomePage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<FeedTab>("for-you");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [notFollowingAnyone, setNotFollowingAnyone] = useState(false);

  const transformRecipes = (data: any[]): Recipe[] =>
    data.map((recipe) => ({
      ...recipe,
      current_user_reaction: recipe.recipe_reactions?.[0]?.reaction ?? null,
      is_saved: recipe.recipe_saves?.[0]?.recipe_id !== undefined,
    }));

  const fetchForYou = async (userId: string, from: number, to: number) => {
    const { data, error } = await supabase
      .from("recipes")
      .select(SHARED_SELECT)
      .eq("recipe_reactions.user_id", userId)
      .order("save_count", { ascending: false })
      .range(from, to);

    return { data, error };
  };

  const fetchFollowing = async (userId: string, from: number, to: number) => {
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);

    const followedIds = follows?.map((f) => f.following_id) ?? [];

    if (followedIds.length === 0)
      return { data: null, error: null, empty: true };

    const { data, error } = await supabase
      .from("recipes")
      .select(SHARED_SELECT)
      .in("author_id", followedIds)
      .eq("recipe_reactions.user_id", userId)
      .order("created_at", { ascending: false })
      .range(from, to);

    return { data, error, empty: false };
  };

  const fetchRecipes = async () => {
    setLoading(true);
    setNotFollowingAnyone(false);

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (activeTab === "for-you") {
      const { data, error } = await fetchForYou(user.id, from, to);
      setLoading(false);
      if (error) {
        console.error(error.message);
        return;
      }
      setRecipes(transformRecipes(data ?? []));
      setHasMore((data ?? []).length === PAGE_SIZE);
    } else {
      const { data, error, empty } = await fetchFollowing(user.id, from, to);
      setLoading(false);
      if (empty) {
        setNotFollowingAnyone(true);
        setRecipes([]);
        setHasMore(false);
        return;
      }
      if (error) {
        console.error(error?.message);
        return;
      }
      setRecipes(transformRecipes(data ?? []));
      setHasMore((data ?? []).length === PAGE_SIZE);
    }
  };

  // Reset page when switching tabs
  useEffect(() => {
    setPage(0);
    setRecipes([]);
    setHasMore(true);
  }, [activeTab]);

  useEffect(() => {
    fetchRecipes();
  }, [page, activeTab]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "1rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>Home</h1>
        <button onClick={() => navigate("/recipes/new")}>Create recipe</button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: "1rem",
          borderBottom: "1px solid #ccc",
        }}
      >
        {(["for-you", "following"] as FeedTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: "none",
              border: "none",
              padding: "0.5rem 0",
              cursor: "pointer",
              fontWeight: activeTab === tab ? "bold" : "normal",
              borderBottom:
                activeTab === tab ? "2px solid black" : "2px solid transparent",
            }}
          >
            {tab === "for-you" ? "For You" : "Following"}
          </button>
        ))}
      </div>

      {loading && <p>Loading...</p>}

      {!loading && notFollowingAnyone && (
        <p>
          You're not following anyone yet. Discover chefs to see their recipes
          here.
        </p>
      )}

      {!loading && !notFollowingAnyone && recipes.length === 0 && (
        <p>No recipes yet.</p>
      )}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onClick={() => navigate(`/recipes/${recipe.id}`)}
          />
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

export default HomePage;
