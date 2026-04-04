import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabase";
import { useSearchParams } from "react-router";
import RecipeCompactCard from "../Components/RecipeCompactCard/RecipeCompactCard";
import styles from "./Explore.module.css";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Utensils,
  ChefHat,
  Globe,
} from "lucide-react";
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";

countries.registerLocale(en);

const countryOptions = Object.entries(
  countries.getNames("en", { select: "official" }),
)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

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

type TopFilter = "all" | "trending" | "top-rated";
type Difficulty = "Easy" | "Medium" | "Hard";

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
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");
  const [topFilter, setTopFilter] = useState<TopFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | "">(
    "",
  );
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const debouncedSearch = useDebounce(searchInput, 300);
  const pillsRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const pageRef = useRef(0);

  const hasAdvancedFilters = !!(
    selectedCategory ||
    selectedDifficulty ||
    selectedCountry
  );

  const activeBadges = [
    selectedCategory && {
      label: `Category: ${categories.find((c) => c.id === selectedCategory)?.name}`,
      clear: () => setSelectedCategory(""),
    },
    selectedDifficulty && {
      label: selectedDifficulty,
      clear: () => setSelectedDifficulty(""),
    },
    selectedCountry && {
      label: countries.getName(selectedCountry, "en") ?? selectedCountry,
      clear: () => setSelectedCountry(""),
    },
  ].filter(Boolean) as { label: string; clear: () => void }[];

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

  // Overflow detection
  useEffect(() => {
    const el = pillsRef.current;
    if (!el) return;

    const update = () => {
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };

    update();
    el.addEventListener("scroll", update);
    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [categories]);

  // Sync search to URL
  useEffect(() => {
    if (debouncedSearch) {
      setSearchParams({ q: debouncedSearch });
    } else {
      setSearchParams({});
    }
  }, [debouncedSearch]);

  // Sync URL param to input when navigating from navbar
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setSearchInput(q);
  }, [searchParams]);

  const fetchRecipes = async (
    pageToFetch: number,
    search: string,
    top: TopFilter,
    category: string,
    difficulty: Difficulty | "",
    country: string,
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

      // Search
      if (search.trim().length >= 3) {
        query = query.or(
          `title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%,category_name.ilike.%${search.trim()}%,ingredients_text.ilike.%${search.trim()}%`,
        );
      }

      // Advanced filters — always apply if set
      if (category) query = query.eq("category_id", category);
      if (difficulty) query = query.eq("difficulty", difficulty);
      if (country) query = query.eq("country_of_origin", country);

      // Top pills — always apply as sort
      if (top === "top-rated") {
        query = query.order("save_count", { ascending: false });
      } else if (top === "trending") {
        query = query
          .gte(
            "created_at",
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          )
          .order("save_count", { ascending: false });
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

  const resetAndFetch = (
    top = topFilter,
    category = selectedCategory,
    difficulty = selectedDifficulty,
    country = selectedCountry,
    search = debouncedSearch,
  ) => {
    pageRef.current = 0;
    setPage(0);
    setRecipes([]);
    setHasMore(true);
    setTotalCount(null);
    hasMoreRef.current = true;
    loadingRef.current = false;
    fetchRecipes(0, search, top, category, difficulty, country);
  };

  useEffect(() => {
    resetAndFetch();
  }, [
    debouncedSearch,
    topFilter,
    selectedCategory,
    selectedDifficulty,
    selectedCountry,
  ]);

  useEffect(() => {
    if (page === 0) return;
    fetchRecipes(
      page,
      debouncedSearch,
      topFilter,
      selectedCategory,
      selectedDifficulty,
      selectedCountry,
    );
  }, [page]);

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
    pillsRef.current?.scrollBy({
      left: direction === "right" ? 150 : -150,
      behavior: "smooth",
    });
  };

  const clearAllFilters = () => {
    setSelectedCategory("");
    setSelectedDifficulty("");
    setSelectedCountry("");
  };

  const handleTopFilter = (f: TopFilter) => {
    setTopFilter(f);
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0rem 1rem" }}>
      {/* Header */}
      <h1
        style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.25rem" }}
      >
        Explore Recipes
      </h1>
      <p style={{ color: "var(--text)", marginBottom: "1.5rem" }}>
        {searchInput.trim().length >= 3 ? (
          <span>
            Showing results for{" "}
            <span
              style={{
                padding: "0.25rem 0.75rem",
                background: "#ffedd5",
                color: "#c2410c",
                borderRadius: 999,
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              {`"${searchInput.trim()}"`}
            </span>
            <span
              onClick={() => setSearchInput("")}
              style={{
                marginLeft: "0.5rem",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Clear
            </span>
          </span>
        ) : (
          "Discover amazing recipes from our community"
        )}
      </p>

      {/* Top pills + Advanced Filters button */}
      <div className={styles.pillsWrapper}>
        <button
          onClick={() => scrollPills("left")}
          className={`${styles.scrollBtn} ${!canScrollLeft ? styles.scrollBtnHidden : ""}`}
        >
          <ChevronLeft size={16} />
        </button>

        <div ref={pillsRef} className={styles.pillsScroller}>
          {(
            [
              { id: "all", label: "All Recipes" },
              { id: "trending", label: "Trending" },
              { id: "top-rated", label: "Top Rated" },
            ] as { id: TopFilter; label: string }[]
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => handleTopFilter(f.id)}
              className={`${styles.topPill} ${topFilter === f.id ? styles.topPillActive : ""}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => scrollPills("right")}
          className={`${styles.scrollBtn} ${!canScrollRight ? styles.scrollBtnHidden : ""}`}
        >
          <ChevronRight size={16} />
        </button>

        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className={`${styles.advancedBtn} ${filtersOpen || hasAdvancedFilters ? styles.advancedBtnActive : ""}`}
        >
          <Filter size={14} />
          Advanced Filters
        </button>
      </div>

      {/* Advanced filters panel */}
      {filtersOpen && (
        <div className={styles.filtersPanel}>
          <div className={styles.filtersGrid}>
            <div>
              <div className={styles.filterLabel}>
                <Utensils size={16} /> Category
              </div>
              <select
                className={styles.filterSelect}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className={styles.filterLabel}>
                <ChefHat size={16} /> Difficulty
              </div>
              <select
                className={styles.filterSelect}
                value={selectedDifficulty}
                onChange={(e) =>
                  setSelectedDifficulty(e.target.value as Difficulty | "")
                }
              >
                <option value="">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <div className={styles.filterLabel}>
                <Globe size={16} /> Country of Origin
              </div>
              <select
                className={styles.filterSelect}
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
              >
                <option value="">All Countries</option>
                {countryOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasAdvancedFilters && (
            <div className={styles.badgesRow}>
              <div className={styles.badges}>
                {activeBadges.map((badge) => (
                  <span
                    key={badge.label}
                    className={styles.badge}
                    onClick={badge.clear}
                  >
                    {badge.label} ×
                  </span>
                ))}
              </div>
              <button className={styles.clearAllBtn} onClick={clearAllFilters}>
                <X size={14} /> Clear All
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results count */}
      {totalCount !== null && !loading && (
        <p style={{ marginBottom: "1rem", color: "var(--text)" }}>
          {totalCount} recipe{totalCount !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Empty state */}
      {!loading && recipes.length === 0 && (
        <p>
          No recipes found{debouncedSearch ? ` for "${debouncedSearch}"` : ""}.
        </p>
      )}

      {/* Recipe grid */}
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
          You've seen all the recipes
        </p>
      )}
    </div>
  );
}

export default Explore;
