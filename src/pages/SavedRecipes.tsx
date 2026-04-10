import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabase";
import RecipeCompactCard from "../Components/RecipeCompactCard/RecipeCompactCard";
import styles from "./Explore.module.css";
import { useFeedCache } from "../Context/FeedCacheContext";

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
  const { state, setFeed, isStale } = useFeedCache();
  const cached = state.savedRecipes;

  const [recipes, setRecipes] = useState<Recipe[]>(cached.recipes);
  const [page, setPage] = useState(cached.page);
  const [hasMore, setHasMore] = useState(cached.hasMore);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(
    cached.totalCount,
  );

  const sentinelRef = useRef<HTMLDivElement>(null);

  // 🔥 runtime guards
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(cached.hasMore);
  const lastRequestedPageRef = useRef<number | null>(null);

  const fetchRecipes = async (pageToFetch: number) => {
    if (loadingRef.current) return;

    // 🔥 prevents duplicate fetch for same page
    if (lastRequestedPageRef.current === pageToFetch) return;
    lastRequestedPageRef.current = pageToFetch;

    loadingRef.current = true;
    setLoading(true);

    const from = pageToFetch * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    if (from < 0 || to < from) {
      loadingRef.current = false;
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      loadingRef.current = false;
      setLoading(false);
      return;
    }

    const { data, error, count } = await supabase
      .from("recipes")
      .select(SHARED_SELECT, { count: "exact" })
      .eq("recipe_saves.saved_by", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    loadingRef.current = false;
    setLoading(false);

    if (error) {
      console.error(error.message);
      return;
    }

    const transformed = (data ?? []).map((recipe: any) => ({
      ...recipe,
      current_user_reaction: recipe.recipe_reactions?.[0]?.reaction ?? null,
      is_saved: recipe.recipe_saves?.length > 0,
    }));

    const newHasMore = transformed.length === PAGE_SIZE;

    setHasMore(newHasMore);
    hasMoreRef.current = newHasMore;

    if (pageToFetch === 0) {
      setRecipes(transformed);
      setTotalCount(count);

      setFeed("savedRecipes", {
        recipes: transformed,
        page: 0,
        hasMore: newHasMore,
        totalCount: count,
        lastFetched: Date.now(),
      });
    } else {
      setRecipes((prev) => {
        const updated = [...prev, ...transformed];

        setFeed("savedRecipes", {
          recipes: updated,
          page: pageToFetch,
          hasMore: newHasMore,
          lastFetched: Date.now(),
        });

        return updated;
      });
    }
  };

  // initial load / cache hydration
  useEffect(() => {
    if (cached.recipes.length > 0 && !isStale("savedRecipes")) {
      setRecipes(cached.recipes);
      setPage(cached.page);
      setHasMore(cached.hasMore);
      setTotalCount(cached.totalCount);

      hasMoreRef.current = cached.hasMore;
      lastRequestedPageRef.current = cached.page;

      return;
    }

    setRecipes([]);
    setPage(0);
    setHasMore(true);
    setTotalCount(null);

    hasMoreRef.current = true;
    lastRequestedPageRef.current = null;

    fetchRecipes(0);
  }, []);

  // page trigger
  useEffect(() => {
    if (page === 0) return;
    fetchRecipes(page);
  }, [page]);

  // intersection observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (!entry.isIntersecting) return;
        if (!hasMoreRef.current) return;
        if (loadingRef.current) return;

        setPage((p) => p + 1);
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0rem 1rem" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Saved Recipes</h1>

      <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
        Recipes you've saved for later
      </p>

      {totalCount !== null && !loading && (
        <p style={{ marginBottom: "1rem", color: "var(--text-muted)" }}>
          {totalCount} saved recipe{totalCount !== 1 ? "s" : ""}
        </p>
      )}

      {!loading && recipes.length === 0 && (
        <p>You haven't saved any recipes yet.</p>
      )}

      <div className={styles.grid}>
        {recipes.map((recipe) => (
          <RecipeCompactCard key={recipe.id} recipe={recipe} />
        ))}
      </div>

      <div ref={sentinelRef} style={{ height: 1 }} />

      {loading && (
        <p style={{ textAlign: "center", padding: "1rem", color: "#888" }}>
          Loading recipes...
        </p>
      )}

      {!hasMore && recipes.length > 0 && (
        <p style={{ textAlign: "center", padding: "1rem", color: "#aaa" }}>
          You've seen all your saved recipes
        </p>
      )}
    </div>
  );
}

export default SavedRecipes;
