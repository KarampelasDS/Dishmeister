import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router";
import RecipeCard from "../Components/RecipeCard/RecipeCard";
import styles from "./HomePage.module.css";
import { Sparkles, Users } from "lucide-react";
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
  const { state, setFeed, isStale } = useFeedCache();

  const [activeTab, setActiveTab] = useState<FeedTab>("for-you");
  const [recipes, setRecipes] = useState<Recipe[]>(state.forYou.recipes);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(state.forYou.hasMore);
  const [notFollowingAnyone, setNotFollowingAnyone] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(state.forYou.hasMore);
  const pageRef = useRef(state.forYou.page);
  const activeTabRef = useRef<FeedTab>("for-you");

  const pendingScrollRef = useRef<number | null>(null);

  const transformRecipes = (data: any[]): Recipe[] =>
    data.map((recipe) => ({
      ...recipe,
      current_user_reaction: recipe.recipe_reactions?.[0]?.reaction ?? null,
      is_saved: recipe.recipe_saves?.[0]?.recipe_id !== undefined,
    }));

  const fetchRecipes = async (
    pageToFetch: number,
    tab: FeedTab,
    retries = 3,
  ) => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);

    const from = pageToFetch * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      loadingRef.current = false;
      setLoading(false);
      return;
    }

    let data: any, error: any;

    if (tab === "following") {
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const followedIds = follows?.map((f) => f.following_id) ?? [];

      if (followedIds.length === 0) {
        setNotFollowingAnyone(true);
        setRecipes([]);
        hasMoreRef.current = false;
        setHasMore(false);
        loadingRef.current = false;
        setLoading(false);
        return;
      }

      ({ data, error } = await supabase
        .from("recipes")
        .select(SHARED_SELECT)
        .in("author_id", followedIds)
        .eq("recipe_reactions.user_id", user.id)
        .order("created_at", { ascending: false })
        .range(from, to));
    } else {
      ({ data, error } = await supabase
        .from("recipes")
        .select(SHARED_SELECT)
        .eq("recipe_reactions.user_id", user.id)
        .order("save_count", { ascending: false })
        .range(from, to));
    }

    loadingRef.current = false;
    setLoading(false);

    if (error) {
      console.error(error.message);
      return;
    }

    if (activeTabRef.current !== tab) return;

    const transformed = transformRecipes(data ?? []);
    const newHasMore = (data ?? []).length === PAGE_SIZE;

    hasMoreRef.current = newHasMore;
    setHasMore(newHasMore);

    const feedKey = tab === "for-you" ? "forYou" : "following";

    if (pageToFetch === 0) {
      setRecipes(transformed);
      setFeed(feedKey, {
        recipes: transformed,
        page: 0,
        hasMore: newHasMore,
        lastFetched: Date.now(),
      });
    } else {
      setRecipes((prev) => {
        const updated = [...prev, ...transformed];

        setFeed(feedKey, {
          recipes: updated,
          page: pageToFetch,
          hasMore: newHasMore,
          lastFetched: Date.now(),
        });

        return updated;
      });
    }
  };

  // SCROLL RESTORE (correct timing)
  useEffect(() => {
    if (pendingScrollRef.current !== null && recipes.length > 0) {
      const pos = pendingScrollRef.current;
      pendingScrollRef.current = null;

      requestAnimationFrame(() => {
        window.scrollTo(0, pos);
      });
    }
  }, [recipes]);

  // TAB SWITCH
  useEffect(() => {
    const leavingKey =
      activeTabRef.current === "for-you" ? "forYou" : "following";

    setFeed(leavingKey, {
      scrollPosition: window.scrollY,
    });

    activeTabRef.current = activeTab;

    const newKey = activeTab === "for-you" ? "forYou" : "following";
    const cached = state[newKey];

    loadingRef.current = false;
    setLoading(false);
    setNotFollowingAnyone(false);

    if (cached.recipes.length > 0 && !isStale(newKey)) {
      setRecipes(cached.recipes);
      setHasMore(cached.hasMore);
      hasMoreRef.current = cached.hasMore;
      pageRef.current = cached.page;

      pendingScrollRef.current = cached.scrollPosition ?? 0;
      return;
    }

    pageRef.current = 0;
    hasMoreRef.current = true;
    setRecipes([]);
    setHasMore(true);

    window.scrollTo(0, 0);
    fetchRecipes(0, activeTab);
  }, [activeTab]);

  // INFINITE SCROLL
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
          const nextPage = pageRef.current + 1;
          pageRef.current = nextPage;
          fetchRecipes(nextPage, activeTabRef.current);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 1rem 5rem" }}>
      <div className={styles.feedToggle}>
        {(["following", "for-you"] as FeedTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`${styles.feedToggleBtn} ${
              activeTab === tab ? styles.active : ""
            }`}
          >
            {tab === "for-you" ? (
              <span>
                <Sparkles /> For You
              </span>
            ) : (
              <span>
                <Users /> Following
              </span>
            )}
          </button>
        ))}
      </div>

      {!loading && notFollowingAnyone && (
        <p>You're not following anyone yet.</p>
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

      <div ref={sentinelRef} style={{ height: 1 }} />

      {loading && <p style={{ textAlign: "center" }}>Loading...</p>}

      {!hasMore && recipes.length > 0 && (
        <p style={{ textAlign: "center" }}>You're all caught up</p>
      )}
    </div>
  );
}

export default HomePage;
