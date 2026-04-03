import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabase";
import { useNavigate, useSearchParams } from "react-router";
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

type Category = {
  id: string;
  name: string;
};

type FilterType = "all" | "trending" | "top-rated" | string;

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
  recipe_saves!left (recipe_id, saved_by)
`;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function Explore() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [categories, setCategories] = useState<Category[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const debouncedSearch = useDebounce(searchInput, 300);
  const pillsRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  // pageRef is the source of truth for offset — always in sync before fetch fires
  const pageRef = useRef(0);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");
      if (data) {
        const sorted = [
          ...data.filter((c) => c.name !== "Other"),
          ...data.filter((c) => c.name === "Other"),
        ];
        setCategories(sorted);
      }
    };
    fetchCategories();
  }, []);

  // Sync search to URL
  useEffect(() => {
    if (debouncedSearch) {
      setSearchParams({ q: debouncedSearch });
    } else {
      setSearchParams({});
    }
  }, [debouncedSearch]);

  const fetchRecipes = async (
    pageToFetch: number,
    search: string,
    filter: FilterType,
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

    let data: any,
      error: any,
      count: number | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      let query = supabase
        .from("recipes")
        .select(SHARED_SELECT, { count: "exact" })
        .eq("recipe_reactions.user_id", user?.id ?? "")
        .range(from, to);

      if (search.trim()) {
        query = query.textSearch("search_vector", search.trim(), {
          type: "websearch",
        });
      }

      if (filter === "top-rated") {
        query = query.order("save_count", { ascending: false });
      } else if (filter === "trending") {
        query = query
          .gte(
            "created_at",
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          )
          .order("save_count", { ascending: false });
      } else if (filter !== "all") {
        query = query
          .eq("category_id", filter)
          .order("created_at", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      ({ data, error, count } = await query);

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

  // When filter or search changes — full reset then fetch page 0
  useEffect(() => {
    pageRef.current = 0;
    setPage(0);
    setRecipes([]);
    setHasMore(true);
    setTotalCount(null);
    hasMoreRef.current = true;
    loadingRef.current = false;
    fetchRecipes(0, debouncedSearch, activeFilter);
  }, [debouncedSearch, activeFilter]);

  // When page increments (from sentinel) — append fetch
  useEffect(() => {
    if (page === 0) return; // page 0 is handled by the reset effect above
    fetchRecipes(page, debouncedSearch, activeFilter);
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

  const scrollPills = (direction: "left" | "right") => {
    if (pillsRef.current) {
      pillsRef.current.scrollBy({
        left: direction === "right" ? 150 : -150,
        behavior: "smooth",
      });
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Header */}
      <h1
        style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.25rem" }}
      >
        Explore Recipes
      </h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        Discover amazing recipes from our community
      </p>

      {/* Filter pills */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: "1.5rem",
        }}
      >
        <button
          onClick={() => scrollPills("left")}
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ‹
        </button>
        <div
          ref={pillsRef}
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            scrollbarWidth: "none",
            flex: 1,
          }}
        >
          {[
            { id: "all", label: "All" },
            { id: "trending", label: "Trending" },
            { id: "top-rated", label: "Top Rated" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id as FilterType)}
              style={{
                whiteSpace: "nowrap",
                padding: "0.4rem 1rem",
                borderRadius: 999,
                border: "1px solid var(--border)",
                cursor: "pointer",
                fontWeight: activeFilter === f.id ? 600 : 400,
                background: activeFilter === f.id ? "#f97316" : "var(--bg)",
                color: activeFilter === f.id ? "#fff" : "var(--text)",
              }}
            >
              {f.label}
            </button>
          ))}

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveFilter(cat.id)}
              style={{
                whiteSpace: "nowrap",
                padding: "0.4rem 1rem",
                borderRadius: 999,
                border: "1px solid var(--border)",
                cursor: "pointer",
                fontWeight: activeFilter === cat.id ? 600 : 400,
                background: activeFilter === cat.id ? "#f97316" : "var(--bg)",
                color: activeFilter === cat.id ? "#fff" : "var(--text)",
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <button
          onClick={() => scrollPills("right")}
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ›
        </button>
      </div>

      {/* Results count */}
      {totalCount !== null && !loading && (
        <p style={{ marginBottom: "1rem", color: "#555" }}>
          {totalCount} recipe{totalCount !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Empty state */}
      {!loading && recipes.length === 0 && (
        <p>
          No recipes found
          {debouncedSearch ? ` for "${debouncedSearch}"` : ""}.
        </p>
      )}

      {/* Recipe grid */}
      <div className={styles.grid}>
        {recipes.map((recipe) => (
          <RecipeCompactCard key={recipe.id} recipe={recipe} />
        ))}
      </div>

      {/* Sentinel — IntersectionObserver target */}
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
          You've seen all the recipes
        </p>
      )}
    </div>
  );
}

export default Explore;
