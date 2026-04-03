import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabase";
import RecipeCompactCard from "../Components/RecipeCompactCard/RecipeCompactCard";
import styles from "./Explore.module.css";

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
    follower_count: number;
  };
  categories: {
    id: string;
    name: string;
  };
};

const PAGE_SIZE = 12;

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
  profiles!recipes_author_id_fkey(id, display_name, avatar_url, username, follower_count),
  categories(*),
  recipe_reactions!left (reaction, user_id),
  recipe_saves!inner (recipe_id, saved_by)
`;

function SavedRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const pageRef = useRef(0);

  const fetchRecipes = async (pageToFetch: number, retries = 3) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const from = pageToFetch * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let data: any,
      error: any,
      count: number | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      ({ data, error, count } = await supabase
        .from("recipes")
        .select(SHARED_SELECT, { count: "exact" })
        .eq("recipe_reactions.user_id", user?.id ?? "")
        .eq("recipe_saves.saved_by", user?.id ?? "")
        .order("created_at", { ascending: false })
        .range(from, to));

      if (!error) break;

      if (attempt < retries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1)),
        );
      }
    }

    loadingRef.current = false;
    setLoading(false);

    if (error) {
      console.error(error.message);
      return;
    }

    const transformed = (data ?? []).map((recipe: any) => ({
      ...recipe,
      current_user_reaction: recipe.recipe_reactions?.[0]?.reaction ?? null,
      is_saved: recipe.recipe_saves?.[0]?.recipe_id !== undefined,
    }));

    const newHasMore = (data ?? []).length === PAGE_SIZE;
    hasMoreRef.current = newHasMore;

    if (pageToFetch === 0) {
      setRecipes(transformed);
    } else {
      setRecipes((prev) => [...prev, ...transformed]);
    }

    setHasMore(newHasMore);
    if (count !== null) setTotalCount(count);
  };

  // Initial fetch
  useEffect(() => {
    pageRef.current = 0;
    setPage(0);
    setRecipes([]);
    setHasMore(true);
    setTotalCount(null);
    hasMoreRef.current = true;
    loadingRef.current = false;
    fetchRecipes(0);
  }, []);

  // Page increment
  useEffect(() => {
    if (page === 0) return;
    fetchRecipes(page);
  }, [page]);

  // IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreRef.current &&
          !loadingRef.current
        ) {
          setPage((p) => {
            const next = p + 1;
            pageRef.current = next;
            return next;
          });
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0rem 1rem" }}>
      {/* Header */}
      <h1
        style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.25rem" }}
      >
        Saved Recipes
      </h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
        Recipes you've saved for later
      </p>

      {/* Results count */}
      {totalCount !== null && !loading && (
        <p style={{ marginBottom: "1rem", color: "var(--text-muted)" }}>
          {totalCount} saved recipe{totalCount !== 1 ? "s" : ""}
        </p>
      )}

      {/* Empty state */}
      {!loading && recipes.length === 0 && (
        <p>You haven't saved any recipes yet.</p>
      )}

      {/* Recipe grid */}
      <div className={styles.grid}>
        {recipes.map((recipe) => (
          <RecipeCompactCard key={recipe.id} recipe={recipe} />
        ))}
      </div>

      {/* Sentinel */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {/* Loading indicator */}
      {loading && (
        <p style={{ textAlign: "center", padding: "1rem", color: "#888" }}>
          Loading recipes...
        </p>
      )}

      {/* End of results */}
      {!hasMore && recipes.length > 0 && (
        <p style={{ textAlign: "center", padding: "1rem", color: "#aaa" }}>
          You've seen all your saved recipes
        </p>
      )}
    </div>
  );
}

export default SavedRecipes;
