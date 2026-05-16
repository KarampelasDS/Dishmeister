import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../supabase";
import { useSearchParams } from "react-router";
import RecipeCompactCard from "../Components/RecipeCompactCard/RecipeCompactCard";
import ProfileCompactCard from "../Components/ProfileCompactCard/ProfileCompactCard";
import Loader from "../Components/Loader/Loader";

import styles from "./Explore.module.css";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Utensils,
  ChefHat,
  Globe,
  Search,
} from "lucide-react";
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import {
  useFeedCache,
  makeExploreFilterKey,
  makeSearchKey,
} from "../Context/FeedCacheContext";
import { useAuth } from "../Context/AuthProvider";
import type { ExploreTabKey } from "../Context/FeedCacheContext";

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
  created_at: string | null;
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

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  follower_count: number;
};

type Category = {
  id: string;
  name: string;
};

type TopFilter = "all" | "trending" | "top-rated";
// Search sort: "recent" = order by created_at desc, "top-rated" = order by save_count desc
type SearchSort = "recent" | "top-rated";
type Difficulty = "Easy" | "Medium" | "Hard";
type SearchTab = "recipes" | "people";

const PAGE_SIZE = 12;
const PEOPLE_PAGE_SIZE = 12;

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

/** Maps TopFilter to the ExploreTabKey used in FeedCacheContext */
function topFilterToTabKey(top: TopFilter): ExploreTabKey {
  if (top === "trending") return "exploreTrending";
  if (top === "top-rated") return "exploreTopRated";
  return "exploreAll";
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** 
 * Prevents SQL wildcard injection by removing % and _ which cause 
 * "%%%" to return everything in ILIKE queries.
 */
function sanitizeSearch(term: string): string {
  return term.replace(/[%_]/g, "").trim();
}

function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const cache = useFeedCache();
  const { showError } = useAuth();

  // ─── Restore persisted tab + filters on mount ────────────────────────────
  const cachedActiveTab = cache.state.activeExploreTab as TopFilter;
  const initialTopFilter: TopFilter =
    cachedActiveTab === "trending" || cachedActiveTab === "top-rated"
      ? cachedActiveTab
      : "all";

  const initialTabKey = topFilterToTabKey(initialTopFilter);
  const cachedFilters = cache.getExploreTabFilters(initialTabKey);

  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");
  const [activeSearchTab, setActiveSearchTab] = useState<SearchTab>("recipes");
  // Search sort — separate from explore top filter
  const [searchSort, setSearchSort] = useState<SearchSort>("recent");
  const [topFilter, setTopFilter] = useState<TopFilter>(initialTopFilter);
  const [searchFiltersOpen, setSearchFiltersOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(
    !!(
      cachedFilters.category ||
      cachedFilters.difficulty ||
      cachedFilters.country
    ),
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    cachedFilters.category,
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | "">(
    cachedFilters.difficulty as Difficulty | "",
  );
  const [selectedCountry, setSelectedCountry] = useState<string>(
    cachedFilters.country,
  );
  // Search-specific filters — fully independent from explore filters
  const [searchCategory, setSearchCategory] = useState<string>("");
  const [searchDifficulty, setSearchDifficulty] = useState<Difficulty | "">("");
  const [searchCountry, setSearchCountry] = useState<string>("");

  const [categories, setCategories] = useState<Category[]>([]);

  // ─── Local display state (populated from cache or fresh fetch) ───────────
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [peoplePage, setPeoplePage] = useState(0);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleHasMore, setPeopleHasMore] = useState(true);
  const [peopleTotalCount, setPeopleTotalCount] = useState<number | null>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const pageRef = useRef(0);
  const peopleLoadingRef = useRef(false);
  const peopleHasMoreRef = useRef(true);
  const peoplePageRef = useRef(0);
  const restoredFromCache = useRef(false);
  const lastFetchKey = useRef<string>("");

  const debouncedSearch = useDebounce(searchInput, 300);
  const pillsRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const peopleSentinelRef = useRef<HTMLDivElement>(null);

  const hasAdvancedFilters = !!(
    selectedCategory ||
    selectedDifficulty ||
    selectedCountry
  );
  const hasSearchFilters = !!(
    searchCategory ||
    searchDifficulty ||
    searchCountry
  );
  const isSearching = sanitizeSearch(debouncedSearch).length >= 3;

  // Derived: which explore tab + filter key we're currently on
  const currentTabKey = topFilterToTabKey(topFilter);
  const currentFilterKey = makeExploreFilterKey(
    selectedCategory,
    selectedDifficulty,
    selectedCountry,
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

  const searchActiveBadges = [
    searchCategory && {
      label: `Category: ${categories.find((c) => c.id === searchCategory)?.name}`,
      clear: () => setSearchCategory(""),
    },
    searchDifficulty && {
      label: searchDifficulty,
      clear: () => setSearchDifficulty(""),
    },
    searchCountry && {
      label: countries.getName(searchCountry, "en") ?? searchCountry,
      clear: () => setSearchCountry(""),
    },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  // ─── Persist active tab to cache whenever it changes ─────────────────────
  useEffect(() => {
    cache.setActiveExploreTab(topFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topFilter]);

  // ─── Persist filters to cache whenever they change ───────────────────────
  useEffect(() => {
    cache.setExploreTabFilters(currentTabKey, {
      category: selectedCategory,
      difficulty: selectedDifficulty,
      country: selectedCountry,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedDifficulty, selectedCountry, currentTabKey]);

  // ─── In search mode, bust cache + re-fetch when search filters change ───────
  useEffect(() => {
    if (!isSearching) return;
    cache.invalidateSearch(debouncedSearch);
    resetAndFetchSearch(debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchCategory, searchDifficulty, searchCountry]);

  // ─── Restore filters when switching tabs ─────────────────────────────────
  const prevTopFilter = useRef<TopFilter>(initialTopFilter);
  useEffect(() => {
    if (topFilter === prevTopFilter.current) return;
    prevTopFilter.current = topFilter;

    const tabKey = topFilterToTabKey(topFilter);
    const saved = cache.getExploreTabFilters(tabKey);
    setSelectedCategory(saved.category);
    setSelectedDifficulty(saved.difficulty as Difficulty | "");
    setSelectedCountry(saved.country);
    if (saved.category || saved.difficulty || saved.country) {
      setFiltersOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topFilter]);

  // ─── Fetch categories ────────────────────────────────────────────────────
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

  // ─── Overflow detection ──────────────────────────────────────────────────
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

  // ─── Sync search ↔ URL ───────────────────────────────────────────────────
  useEffect(() => {
    if (debouncedSearch) {
      setSearchParams({ q: debouncedSearch });
    } else {
      setSearchParams({});
    }
  }, [debouncedSearch]);

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setSearchInput(q);
  }, [searchParams]);

  // Reset search tab and lastFetchKey when search is cleared
  useEffect(() => {
    if (!isSearching) {
      setActiveSearchTab("recipes");
      lastFetchKey.current = "";
      setSearchFiltersOpen(false);
      setSearchCategory("");
      setSearchDifficulty("");
      setSearchCountry("");
    }
  }, [isSearching]);

  // ─────────────────────────────────────────────────────────────────────────
  // EXPLORE RECIPES (non-search)
  // ─────────────────────────────────────────────────────────────────────────

  const fetchRecipes = useCallback(
    async (
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

      const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

      for (let attempt = 0; attempt < retries; attempt++) {

        let query = supabase
          .from("recipes")
          .select(SHARED_SELECT, { count: "exact" })
          .range(from, to);

        const cleanSearch = sanitizeSearch(search);
        if (cleanSearch.length >= 3) {
          query = query.or(
            `title.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%`,
          );
        }

        if (category) query = query.eq("category_id", category);
        if (difficulty) query = query.eq("difficulty", difficulty);
        if (country) query = query.eq("country_of_origin", country);

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

      const transformed: Recipe[] = (data ?? []).map((recipe: any) => ({
        ...recipe,
        current_user_reaction:
          recipe.recipe_reactions?.find((r: any) => r.user_id === userId)
            ?.reaction ?? null,
        is_saved: recipe.recipe_saves?.some((s: any) => s.saved_by === userId),
      }));

      const newHasMore = (data ?? []).length === PAGE_SIZE;
      hasMoreRef.current = newHasMore;

      const tabKey = topFilterToTabKey(top);
      const filterKey = makeExploreFilterKey(category, difficulty, country);

      if (pageToFetch === 0) {
        setRecipes(transformed);
        cache.setExploreFeed(tabKey, filterKey, {
          recipes: transformed,
          page: 0,
          hasMore: newHasMore,
          totalCount: count,
          lastFetched: Date.now(),
        });
      } else {
        setRecipes((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const fresh = transformed.filter((r) => !existingIds.has(r.id));
          const merged = [...prev, ...fresh];
          cache.setExploreFeed(tabKey, filterKey, {
            recipes: merged,
            page: pageToFetch,
            hasMore: newHasMore,
            totalCount: count ?? totalCount,
            lastFetched: Date.now(),
          });
          return merged;
        });
      }

      setHasMore(newHasMore);
      if (count !== null) setTotalCount(count);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const resetAndFetch = useCallback(
    (
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      topFilter,
      selectedCategory,
      selectedDifficulty,
      selectedCountry,
      debouncedSearch,
    ],
  );

  useEffect(() => {
    if (isSearching) return;

    const tabKey = topFilterToTabKey(topFilter);
    const filterKey = makeExploreFilterKey(
      selectedCategory,
      selectedDifficulty,
      selectedCountry,
    );
    const fetchKey = `${tabKey}::${filterKey}`;

    const cachedFeed = cache.getExploreFeed(tabKey, filterKey);
    const stale = cache.isExploreFeedStale(tabKey, filterKey);

    if (!stale && cachedFeed.recipes.length > 0) {
      if (lastFetchKey.current !== fetchKey) {
        lastFetchKey.current = fetchKey;
        restoredFromCache.current = true;

        pageRef.current = cachedFeed.page;
        hasMoreRef.current = cachedFeed.hasMore;
        loadingRef.current = false;

        setPage(cachedFeed.page);
        setRecipes(cachedFeed.recipes as Recipe[]);
        setHasMore(cachedFeed.hasMore);
        setTotalCount(cachedFeed.totalCount);
      }
      return;
    }

    lastFetchKey.current = fetchKey;
    restoredFromCache.current = false;
    resetAndFetch(
      topFilter,
      selectedCategory,
      selectedDifficulty,
      selectedCountry,
      debouncedSearch,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    topFilter,
    selectedCategory,
    selectedDifficulty,
    selectedCountry,
    debouncedSearch,
    isSearching,
  ]);

  useEffect(() => {
    if (page === 0) return;
    if (isSearching) return;
    const cachedFeed = cache.getExploreFeed(currentTabKey, currentFilterKey);
    if (cachedFeed.page >= page && cachedFeed.recipes.length > 0) return;
    fetchRecipes(
      page,
      debouncedSearch,
      topFilter,
      selectedCategory,
      selectedDifficulty,
      selectedCountry,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // ─── Recipes sentinel ────────────────────────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreRef.current &&
          !loadingRef.current &&
          !isSearching
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
  }, [isSearching]);

  // ─────────────────────────────────────────────────────────────────────────
  // SEARCH — RECIPES
  // ─────────────────────────────────────────────────────────────────────────

  const fetchSearchRecipes = useCallback(
    async (
      pageToFetch: number,
      search: string,
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

      const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

      for (let attempt = 0; attempt < retries; attempt++) {
        const cleanSearch = sanitizeSearch(search);
        
        // Final guard: if sanitized search is too short, don't query
        if (cleanSearch.length < 3) {
          setRecipes([]);
          setLoading(false);
          loadingRef.current = false;
          return;
        }

        let query = supabase
          .from("recipes")
          .select(SHARED_SELECT, { count: "exact" })
          .range(from, to)
          .or(
            `title.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%`,
          );

        if (category) query = query.eq("category_id", category);
        if (difficulty) query = query.eq("difficulty", difficulty);
        if (country) query = query.eq("country_of_origin", country);

        query = query.order("created_at", { ascending: false });

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

      const transformed: Recipe[] = (data ?? []).map((recipe: any) => ({
        ...recipe,
        current_user_reaction:
          recipe.recipe_reactions?.find((r: any) => r.user_id === userId)
            ?.reaction ?? null,
        is_saved: recipe.recipe_saves?.some((s: any) => s.saved_by === userId),
      }));

      const newHasMore = (data ?? []).length === PAGE_SIZE;
      hasMoreRef.current = newHasMore;

      if (pageToFetch === 0) {
        setRecipes(transformed);
        cache.setSearchRecipes(search, transformed, 0, newHasMore, count);
      } else {
        setRecipes((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const fresh = transformed.filter((r) => !existingIds.has(r.id));
          const merged = [...prev, ...fresh];
          cache.setSearchRecipes(
            search,
            merged,
            pageToFetch,
            newHasMore,
            count ?? totalCount,
          );
          return merged;
        });
      }

      setHasMore(newHasMore);
      if (count !== null) setTotalCount(count);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const resetAndFetchSearch = useCallback(
    (
      search: string,
      category = searchCategory,
      difficulty = searchDifficulty,
      country = searchCountry,
    ) => {
      pageRef.current = 0;
      setPage(0);
      setRecipes([]);
      setHasMore(true);
      setTotalCount(null);
      hasMoreRef.current = true;
      loadingRef.current = false;
      fetchSearchRecipes(0, search, category, difficulty, country);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchCategory, searchDifficulty, searchCountry],
  );

  useEffect(() => {
    if (!isSearching) return;

    const key = makeSearchKey(debouncedSearch);
    const entry = cache.getSearchEntry(key);
    const stale = cache.isSearchStale(key);

    if (!stale && entry && entry.recipes.length > 0) {
      pageRef.current = entry.recipesPage;
      hasMoreRef.current = entry.recipesHasMore;
      loadingRef.current = false;

      setPage(entry.recipesPage);
      setRecipes(entry.recipes as Recipe[]);
      setHasMore(entry.recipesHasMore);
      setTotalCount(entry.recipesTotalCount);
      return;
    }

    resetAndFetchSearch(debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, isSearching]);

  useEffect(() => {
    if (page === 0) return;
    if (!isSearching) return;
    const entry = cache.getSearchEntry(makeSearchKey(debouncedSearch));
    if (entry && entry.recipesPage >= page) return;

    fetchSearchRecipes(
      page,
      debouncedSearch,
      searchCategory,
      searchDifficulty,
      searchCountry,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, isSearching]);

  // ─── Search recipe sentinel ───────────────────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreRef.current &&
          !loadingRef.current &&
          isSearching
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
  }, [isSearching]);

  // ─────────────────────────────────────────────────────────────────────────
  // SEARCH — PEOPLE
  // ─────────────────────────────────────────────────────────────────────────

  const fetchPeople = useCallback(
    async (pageToFetch: number, search: string, retries = 3) => {
      if (peopleLoadingRef.current) return;
      peopleLoadingRef.current = true;
      setPeopleLoading(true);

      const from = pageToFetch * PEOPLE_PAGE_SIZE;
      const to = from + PEOPLE_PAGE_SIZE - 1;

      let data: any,
        error: any,
        count: number | null = null;

      for (let attempt = 0; attempt < retries; attempt++) {
        let query = supabase
          .from("profiles")
          .select(
            "id, username, display_name, avatar_url, bio, follower_count",
            { count: "exact" },
          )
          .range(from, to);

        if (search.trim().length >= 3) {
          query = query.or(
            `username.ilike.%${search.trim()}%,display_name.ilike.%${search.trim()}%`,
          );
        }

        query = query.order("follower_count", { ascending: false });

        ({ data, error, count } = await query);
        if (!error) break;
        if (attempt < retries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (attempt + 1)),
          );
        }
      }

      peopleLoadingRef.current = false;
      setPeopleLoading(false);

      if (error) {
        console.error(error.message);
        return;
      }

      const newHasMore = (data ?? []).length === PEOPLE_PAGE_SIZE;
      peopleHasMoreRef.current = newHasMore;

      if (pageToFetch === 0) {
        setProfiles(data ?? []);
        cache.setSearchPeople(search, data ?? [], 0, newHasMore, count);
      } else {
        setProfiles((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const fresh = (data ?? []).filter(
            (p: Profile) => !existingIds.has(p.id),
          );
          const merged = [...prev, ...fresh];
          cache.setSearchPeople(
            search,
            merged,
            pageToFetch,
            newHasMore,
            count ?? peopleTotalCount,
          );
          return merged;
        });
      }

      setPeopleHasMore(newHasMore);
      if (count !== null) setPeopleTotalCount(count);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const resetAndFetchPeople = useCallback(
    (search = debouncedSearch) => {
      peoplePageRef.current = 0;
      setPeoplePage(0);
      setProfiles([]);
      setPeopleHasMore(true);
      setPeopleTotalCount(null);
      peopleHasMoreRef.current = true;
      peopleLoadingRef.current = false;
      fetchPeople(0, search);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debouncedSearch],
  );

  useEffect(() => {
    if (activeSearchTab !== "people") return;
    if (!isSearching) return;

    const key = makeSearchKey(debouncedSearch);
    const entry = cache.getSearchEntry(key);
    const stale = cache.isSearchStale(key);

    if (!stale && entry?.peopleLoaded && entry.people.length > 0) {
      peoplePageRef.current = entry.peoplePage;
      peopleHasMoreRef.current = entry.peopleHasMore;
      peopleLoadingRef.current = false;

      setPeoplePage(entry.peoplePage);
      setProfiles(entry.people as Profile[]);
      setPeopleHasMore(entry.peopleHasMore);
      setPeopleTotalCount(entry.peopleTotalCount);
      return;
    }

    resetAndFetchPeople(debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSearchTab, debouncedSearch, isSearching]);

  useEffect(() => {
    if (peoplePage === 0) return;
    const entry = cache.getSearchEntry(makeSearchKey(debouncedSearch));
    if (entry && entry.peoplePage >= peoplePage) return;

    fetchPeople(peoplePage, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peoplePage]);

  // ─── People sentinel ─────────────────────────────────────────────────────
  useEffect(() => {
    const sentinel = peopleSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          peopleHasMoreRef.current &&
          !peopleLoadingRef.current
        ) {
          setPeoplePage((p) => {
            const next = p + 1;
            peoplePageRef.current = next;
            return next;
          });
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeSearchTab]);

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

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

  const handleMobileSearchKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key !== "Enter") return;
    if (searchInput.trim().length >= 3) {
      setSearchParams({ q: searchInput.trim() });
    } else if (searchInput.trim().length >= 1) {
      showError("Please enter at least 3 characters.");
    } else {
      setSearchParams({});
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const displayRecipes = isSearching
    ? [...recipes].sort((a, b) =>
        searchSort === "top-rated"
          ? b.save_count - a.save_count
          : new Date(b.created_at ?? 0).getTime() -
            new Date(a.created_at ?? 0).getTime(),
      )
    : recipes;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0rem 1rem" }}>
      {/* Header */}
      <h1
        style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.25rem" }}
      >
        Explore Recipes
      </h1>
      <p style={{ color: "var(--text)", marginBottom: "1.5rem" }}>
        {isSearching ? (
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

      {/* ── Mobile-only search bar ── */}
      <div className={styles.mobileSearch}>
        <div className={styles.mobileSearchWrapper}>
          <Search className={styles.mobileSearchIcon} />
          <input
            type="text"
            placeholder="Search recipes..."
            className={styles.mobileSearchInput}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleMobileSearchKeyDown}
          />
        </div>
      </div>

      {/* ── Explore mode: top pills + filters ── */}
      {!isSearching && (
        <>
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
              Recipe Filters
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
                  <button
                    className={styles.clearAllBtn}
                    onClick={clearAllFilters}
                  >
                    <X size={14} /> Clear All
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Search mode: tabs + sort pills ── */}
      {isSearching && (
        <>
          {/* Search result tabs (Recipes / People) */}
          <div
            style={{
              display: "flex",
              gap: 0,
              borderBottom: "1px solid var(--border)",
              marginBottom: "0.75rem",
            }}
          >
            {(
              [
                { id: "recipes", label: "Recipes", count: totalCount },
                { id: "people", label: "People", count: peopleTotalCount },
              ] as { id: SearchTab; label: string; count: number | null }[]
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSearchTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0.6rem 1.2rem",
                  background: "none",
                  border: "none",
                  borderBottom:
                    activeSearchTab === tab.id
                      ? "2px solid #f97316"
                      : "2px solid transparent",
                  cursor: "pointer",
                  fontWeight: activeSearchTab === tab.id ? 600 : 400,
                  color: activeSearchTab === tab.id ? "#f97316" : "var(--text)",
                  fontSize: "0.95rem",
                  marginBottom: "-1px",
                }}
              >
                {tab.label}
                {tab.count !== null && (
                  <span
                    style={{
                      background:
                        activeSearchTab === tab.id
                          ? "#f97316"
                          : "var(--border)",
                      color:
                        activeSearchTab === tab.id ? "#fff" : "var(--text)",
                      borderRadius: 999,
                      padding: "0.1rem 0.5rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sort pills + filter button — only shown on the Recipes search tab */}
          {activeSearchTab === "recipes" && (
            <>
              <div
                className={styles.pillsWrapper}
                style={{ marginBottom: searchFiltersOpen ? "0.5rem" : "1rem" }}
              >
                <div className={styles.pillsScroller}>
                  {(
                    [
                      { id: "recent", label: "Recent" },
                      { id: "top-rated", label: "Top Rated" },
                    ] as { id: SearchSort; label: string }[]
                  ).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSearchSort(s.id)}
                      className={`${styles.topPill} ${searchSort === s.id ? styles.topPillActive : ""}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setSearchFiltersOpen((o) => !o)}
                  className={`${styles.advancedBtn} ${searchFiltersOpen || hasSearchFilters ? styles.advancedBtnActive : ""}`}
                >
                  <Filter size={14} />
                  Recipe Filters
                </button>
              </div>

              {/* Search filter panel */}
              {searchFiltersOpen && (
                <div
                  className={styles.filtersPanel}
                  style={{ marginBottom: "1rem" }}
                >
                  <div className={styles.filtersGrid}>
                    <div>
                      <div className={styles.filterLabel}>
                        <Utensils size={16} /> Category
                      </div>
                      <select
                        className={styles.filterSelect}
                        value={searchCategory}
                        onChange={(e) => setSearchCategory(e.target.value)}
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
                        value={searchDifficulty}
                        onChange={(e) =>
                          setSearchDifficulty(e.target.value as Difficulty | "")
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
                        value={searchCountry}
                        onChange={(e) => setSearchCountry(e.target.value)}
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

                  {hasSearchFilters && (
                    <div className={styles.badgesRow}>
                      <div className={styles.badges}>
                        {searchActiveBadges.map((badge) => (
                          <span
                            key={badge.label}
                            className={styles.badge}
                            onClick={badge.clear}
                          >
                            {badge.label} ×
                          </span>
                        ))}
                      </div>
                      <button
                        className={styles.clearAllBtn}
                        onClick={() => {
                          setSearchCategory("");
                          setSearchDifficulty("");
                          setSearchCountry("");
                        }}
                      >
                        <X size={14} /> Clear All
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* RECIPES TAB */}
      {activeSearchTab === "recipes" && (
        <>
          {totalCount !== null && !loading && (
            <p style={{ marginBottom: "1rem", color: "var(--text)" }}>
              {totalCount} recipe{totalCount !== 1 ? "s" : ""} found
            </p>
          )}

          {!loading && recipes.length === 0 && (
            <p>
              No recipes found
              {debouncedSearch ? ` for "${debouncedSearch}"` : ""}.
            </p>
          )}

          <div className={styles.grid}>
            {displayRecipes.map((recipe) => (
              <RecipeCompactCard key={recipe.id} recipe={recipe} />
            ))}
          </div>

          <div ref={sentinelRef} style={{ height: 1 }} />

          {loading && <Loader />}


          {!hasMore && recipes.length > 0 && (
            <p style={{ textAlign: "center", padding: "1rem", color: "#aaa" }}>
              You've seen all the recipes
            </p>
          )}
        </>
      )}

      {/* PEOPLE TAB */}
      {activeSearchTab === "people" && (
        <>
          {peopleTotalCount !== null && !peopleLoading && (
            <p style={{ marginBottom: "1rem", color: "var(--text)" }}>
              {peopleTotalCount} user{peopleTotalCount !== 1 ? "s" : ""} found
            </p>
          )}

          {!peopleLoading && profiles.length === 0 && (
            <p>No users found for "{debouncedSearch}".</p>
          )}

          <div className={styles.grid}>
            {profiles.map((profile) => (
              <ProfileCompactCard
                key={profile.id}
                displayName={profile.display_name ?? profile.username ?? ""}
                username={profile.username ?? ""}
                followers={profile.follower_count}
                bio={profile.bio ?? ""}
                profilePictureUrl={profile.avatar_url ?? "/defaultAvatar.png"}
              />
            ))}
          </div>

          <div ref={peopleSentinelRef} style={{ height: 1 }} />

          {peopleLoading && <Loader />}


          {!peopleHasMore && profiles.length > 0 && (
            <p style={{ textAlign: "center", padding: "1rem", color: "#aaa" }}>
              You've seen all the users
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default Explore;
