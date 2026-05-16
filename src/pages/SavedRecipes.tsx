import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../supabase";
import RecipeCompactCard from "../Components/RecipeCompactCard/RecipeCompactCard";
import Loader from "../Components/Loader/Loader";

import styles from "./Explore.module.css";
import { useFeedCache } from "../Context/FeedCacheContext";
import { ArrowLeft } from "lucide-react";
import { getFriendlyErrorMessage } from "../utils/errorUtils";


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
  created_at,
  recipes (
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
    save_count,
    comment_count,
    profiles!recipes_author_id_fkey(id, display_name, avatar_url, username, follower_count),
    categories(*),
    recipe_reactions!left (reaction, user_id)
  )
`;

type Tab = "saved" | "liked";

function SavedRecipes() {
  const { state, setFeed, isStale } = useFeedCache();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("saved");

  const cached = activeTab === "saved" ? state.savedRecipes : state.likedRecipes;

  const [recipes, setRecipes] = useState<Recipe[]>(cached?.recipes || []);
  const [page, setPage] = useState(cached?.page || 0);
  const [hasMore, setHasMore] = useState(cached?.hasMore ?? true);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(
    cached?.totalCount ?? null,
  );

  const sentinelRef = useRef<HTMLDivElement>(null);

  // runtime guards
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(cached?.hasMore ?? true);
  const lastRequestedPageRef = useRef<string | null>(null);

  const fetchRecipes = async (pageToFetch: number, tab: Tab) => {
    if (loadingRef.current) return;

    const requestKey = `${tab}-${pageToFetch}`;
    if (lastRequestedPageRef.current === requestKey) return;
    lastRequestedPageRef.current = requestKey;

    loadingRef.current = true;
    setLoading(true);

    const from = pageToFetch * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      loadingRef.current = false;
      setLoading(false);
      return;
    }

    let result;
    if (tab === "saved") {
      result = await supabase
        .from("recipe_saves")
        .select(SHARED_SELECT, { count: "exact" })
        .eq("saved_by", user.id)
        .order("created_at", { ascending: false })
        .range(from, to);
    } else {
      // Fetch liked recipes
      result = await supabase
        .from("recipe_reactions")
        .select(
          `
          created_at,
          recipes (
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
            save_count,
            comment_count,
            profiles!recipes_author_id_fkey(id, display_name, avatar_url, username, follower_count),
            categories(*),
            recipe_saves!left (recipe_id, saved_by)
          )
        `,
          { count: "exact" },
        )
        .eq("user_id", user.id)
        .eq("reaction", "like")
        .order("created_at", { ascending: false })
        .range(from, to);
    }

    const { data, error, count } = result;

    loadingRef.current = false;
    setLoading(false);

    if (error) {
      console.error(getFriendlyErrorMessage(error));
      return;
    }

    const transformed = (data ?? [])
      .map((row: any) => {
        if (!row.recipes) return null;
        return {
          ...row.recipes,
          current_user_reaction:
            tab === "liked"
              ? "like"
              : row.recipes.recipe_reactions?.find(
                  (r: any) => r.user_id === user.id,
                )?.reaction ?? null,
          is_saved:
            tab === "saved"
              ? true
              : row.recipes.recipe_saves?.some(
                  (s: any) => s.saved_by === user.id,
                ),
        };
      })
      .filter(Boolean);

    const newHasMore = (data ?? []).length === PAGE_SIZE;

    setHasMore(newHasMore);
    hasMoreRef.current = newHasMore;

    const cacheKey = tab === "saved" ? "savedRecipes" : "likedRecipes";

    if (pageToFetch === 0) {
      setRecipes(transformed);
      setTotalCount(count);

      setFeed(cacheKey, {
        recipes: transformed,
        page: 0,
        hasMore: newHasMore,
        totalCount: count,
        lastFetched: Date.now(),
      });
    } else {
      setRecipes((prev) => {
        const updated = [...prev, ...transformed];

        setFeed(cacheKey, {
          recipes: updated,
          page: pageToFetch,
          hasMore: newHasMore,
          lastFetched: Date.now(),
        });

        return updated;
      });
    }
  };

  // Switch tab effect
  useEffect(() => {
    const cacheKey = activeTab === "saved" ? "savedRecipes" : "likedRecipes";
    const cacheData = state[cacheKey];

    if (cacheData.recipes.length > 0 && !isStale(cacheKey)) {
      setRecipes(cacheData.recipes);
      setPage(cacheData.page);
      setHasMore(cacheData.hasMore);
      setTotalCount(cacheData.totalCount);
      hasMoreRef.current = cacheData.hasMore;
      lastRequestedPageRef.current = `${activeTab}-${cacheData.page}`;
    } else {
      setRecipes([]);
      setPage(0);
      setHasMore(true);
      setTotalCount(null);
      hasMoreRef.current = true;
      lastRequestedPageRef.current = null;
      fetchRecipes(0, activeTab);
    }
  }, [activeTab]);

  // initial load / cache hydration
  useEffect(() => {
    const cacheKey = activeTab === "saved" ? "savedRecipes" : "likedRecipes";
    const cacheData = state[cacheKey];
    if (cacheData.recipes.length > 0 && !isStale(cacheKey)) {
      // already handled by tab effect
      return;
    }
    fetchRecipes(0, activeTab);
  }, []);

  // page trigger
  useEffect(() => {
    if (page === 0) return;
    fetchRecipes(page, activeTab);
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
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1rem 1rem" }}>
      <div className={styles.backRow}>
        <span onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </span>
      </div>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        Library
      </h1>

      <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
        {activeTab === "saved"
          ? "Recipes you've saved for later"
          : "Recipes you've liked"}
      </p>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border)",
          marginBottom: "1.5rem",
        }}
      >
        {(
          [
            { id: "saved", label: "Saved" },
            { id: "liked", label: "Liked" },
          ] as { id: Tab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "0.8rem 1.5rem",
              background: "none",
              border: "none",
              borderBottom:
                activeTab === tab.id
                  ? "3px solid #f97316"
                  : "3px solid transparent",
              cursor: "pointer",
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? "#f97316" : "var(--text-muted)",
              fontSize: "1rem",
              transition: "all 0.2s ease",
              marginBottom: "-1px",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {totalCount !== null && !loading && (
        <p style={{ marginBottom: "1rem", color: "var(--text-muted)" }}>
          {totalCount} {activeTab === "saved" ? "saved" : "liked"} recipe
          {totalCount !== 1 ? "s" : ""}
        </p>
      )}

      {!loading && recipes.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            color: "var(--text-muted)",
          }}
        >
          <p style={{ fontSize: "1.2rem", fontWeight: 500 }}>
            {activeTab === "saved"
              ? "You haven't saved any recipes yet."
              : "You haven't liked any recipes yet."}
          </p>
          <p style={{ marginTop: "0.5rem" }}>
            Explore recipes and add them to your collection!
          </p>
        </div>
      )}

      <div className={styles.grid}>
        {recipes.map((recipe) => (
          <RecipeCompactCard key={recipe.id} recipe={recipe} />
        ))}
      </div>

      <div ref={sentinelRef} style={{ height: 1 }} />

      {loading && <Loader />}

      {!hasMore && recipes.length > 0 && (
        <p style={{ textAlign: "center", padding: "2rem", color: "#aaa" }}>
          You've seen all your {activeTab === "saved" ? "saved" : "liked"}{" "}
          recipes
        </p>
      )}
    </div>
  );
}

export default SavedRecipes;
