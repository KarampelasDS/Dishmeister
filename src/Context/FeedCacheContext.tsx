// FeedCacheContext.tsx
import { createContext, useContext, useReducer } from "react";
import type { ReactNode } from "react";
import { normalizeSearchQuery } from "../utils/searchUtils";

// ─── Shared types ────────────────────────────────────────────────────────────

type CachedFeed = {
  recipes: any[];
  page: number;
  hasMore: boolean;
  totalCount: number | null;
  lastFetched: number | null;
  scrollPosition?: number;
};

const emptyFeed = (): CachedFeed => ({
  recipes: [],
  page: 0,
  hasMore: true,
  totalCount: null,
  lastFetched: null,
  scrollPosition: 0,
});

// ─── Explore tab feeds ───────────────────────────────────────────────────────
// Each tab can have multiple filter combos cached simultaneously.
// The key is a canonical query string, e.g. "" | "category=abc&difficulty=Easy"

type ExploreTabCache = Record<string, CachedFeed>; // filterKey → feed

const emptyExploreTab = (): ExploreTabCache => ({});

/** Serialise the three explore filters into a stable cache key. */
export function makeExploreFilterKey(
  category: string,
  difficulty: string,
  country: string,
): string {
  const parts: string[] = [];
  if (category) parts.push(`category=${category}`);
  if (difficulty) parts.push(`difficulty=${difficulty}`);
  if (country) parts.push(`country=${country}`);
  return parts.join("&"); // "" when no filters
}

// ─── Per-tab filter state ─────────────────────────────────────────────────────
// Remembers which filters were active the last time the user was on a tab.

export type ExploreFilterState = {
  category: string;
  difficulty: string;
  country: string;
};

const emptyFilterState = (): ExploreFilterState => ({
  category: "",
  difficulty: "",
  country: "",
});

type ExploreTabFilters = Record<string, ExploreFilterState>; // ExploreTabKey → filters

// ─── Search cache ─────────────────────────────────────────────────────────────
// We keep the last MAX_SEARCH_ENTRIES distinct queries.

const MAX_SEARCH_ENTRIES = 10;

type CachedSearchEntry = {
  query: string; // the search string (trimmed, lowercased for key)
  recipes: any[];
  recipesPage: number;
  recipesHasMore: boolean;
  recipesTotalCount: number | null;
  people: any[];
  peoplePage: number;
  peopleHasMore: boolean;
  peopleTotalCount: number | null;
  peopleLoaded: boolean; // true once the People tab has been fetched
  lastFetched: number;
};

type SearchCache = {
  entries: CachedSearchEntry[]; // ordered newest-first
};

const emptySearchCache = (): SearchCache => ({ entries: [] });

/** Canonical cache key for a search query. */
export function makeSearchKey(query: string): string {
  return normalizeSearchQuery(query).toLowerCase();
}

// ─── Top-level state ─────────────────────────────────────────────────────────

type HomeFeedKey = "forYou" | "following" | "savedRecipes" | "likedRecipes" | "ownProfile";

type FeedCacheState = {
  // Home feeds (unchanged)
  forYou: CachedFeed;
  following: CachedFeed;
  savedRecipes: CachedFeed;
  likedRecipes: CachedFeed;
  ownProfile: CachedFeed;

  // Explore tab feeds
  exploreAll: ExploreTabCache;
  exploreTrending: ExploreTabCache;
  exploreTopRated: ExploreTabCache;

  // Per-tab filter state (persisted across navigation)
  exploreTabFilters: ExploreTabFilters;

  // Active top-level tab (persisted across navigation)
  activeExploreTab: string;

  // Search
  searchCache: SearchCache;
 
  // Sidebar
  sidebarChefs: any[];
  sidebarRecipes: any[];
  sidebarLastFetched: number | null;
};

const initialState: FeedCacheState = {
  forYou: emptyFeed(),
  following: emptyFeed(),
  savedRecipes: emptyFeed(),
  likedRecipes: emptyFeed(),
  ownProfile: emptyFeed(),
  exploreAll: emptyExploreTab(),
  exploreTrending: emptyExploreTab(),
  exploreTopRated: emptyExploreTab(),
  exploreTabFilters: {},
  activeExploreTab: "all",
  searchCache: emptySearchCache(),
  sidebarChefs: [],
  sidebarRecipes: [],
  sidebarLastFetched: null,
};

// ─── Actions ─────────────────────────────────────────────────────────────────

type ExploreTabKey = "exploreAll" | "exploreTrending" | "exploreTopRated";

type FeedCacheAction =
  // Home feeds
  | { type: "SET_FEED"; key: HomeFeedKey; feed: Partial<CachedFeed> }
  | { type: "INVALIDATE"; key: HomeFeedKey }
  | { type: "INVALIDATE_ALL" }

  // Explore feeds
  | {
      type: "SET_EXPLORE_FEED";
      tab: ExploreTabKey;
      filterKey: string;
      feed: Partial<CachedFeed>;
    }
  | { type: "INVALIDATE_EXPLORE_TAB"; tab: ExploreTabKey }
  | { type: "INVALIDATE_EXPLORE_ALL_TABS" }

  // Per-tab filter persistence
  | {
      type: "SET_EXPLORE_TAB_FILTERS";
      tab: ExploreTabKey;
      filters: ExploreFilterState;
    }
  | { type: "SET_ACTIVE_EXPLORE_TAB"; tab: string }

  // Search
  | {
      type: "SET_SEARCH_RECIPES";
      query: string;
      recipes: any[];
      recipesPage: number;
      recipesHasMore: boolean;
      recipesTotalCount: number | null;
    }
  | {
      type: "SET_SEARCH_PEOPLE";
      query: string;
      people: any[];
      peoplePage: number;
      peopleHasMore: boolean;
      peopleTotalCount: number | null;
    }
  | { type: "INVALIDATE_SEARCH"; query: string }

  // Cross-cutting recipe patch
  | { type: "PATCH_RECIPE"; recipeId: string; patch: Record<string, any> }
 
  // Sidebar
  | { type: "SET_SIDEBAR_DATA"; chefs: any[]; recipes: any[] }
  | { type: "INVALIDATE_SIDEBAR" };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const HOME_FEED_KEYS: HomeFeedKey[] = [
  "forYou",
  "following",
  "savedRecipes",
  "likedRecipes",
  "ownProfile",
];

const EXPLORE_TAB_KEYS: ExploreTabKey[] = [
  "exploreAll",
  "exploreTrending",
  "exploreTopRated",
];

function patchRecipeInFeed(
  feed: CachedFeed,
  id: string,
  patch: Record<string, any>,
): CachedFeed {
  if (!feed.recipes.some((r) => r.id === id)) return feed;
  return {
    ...feed,
    recipes: feed.recipes.map((r) => (r.id === id ? { ...r, ...patch } : r)),
  };
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

export const STALE_MS = 5 * 60 * 1000;

function feedCacheReducer(
  state: FeedCacheState,
  action: FeedCacheAction,
): FeedCacheState {
  switch (action.type) {
    // ── Home feeds ──────────────────────────────────────────────────────────

    case "SET_FEED":
      return {
        ...state,
        [action.key]: { ...state[action.key], ...action.feed },
      };

    case "INVALIDATE":
      return { ...state, [action.key]: emptyFeed() };

    case "INVALIDATE_ALL":
      return initialState;

    // ── Explore feeds ───────────────────────────────────────────────────────

    case "SET_EXPLORE_FEED": {
      const tab = state[action.tab];
      const existing = tab[action.filterKey] ?? emptyFeed();
      return {
        ...state,
        [action.tab]: {
          ...tab,
          [action.filterKey]: { ...existing, ...action.feed },
        },
      };
    }

    case "INVALIDATE_EXPLORE_TAB":
      return { ...state, [action.tab]: emptyExploreTab() };

    case "INVALIDATE_EXPLORE_ALL_TABS":
      return {
        ...state,
        exploreAll: emptyExploreTab(),
        exploreTrending: emptyExploreTab(),
        exploreTopRated: emptyExploreTab(),
      };

    // ── Per-tab filter persistence ──────────────────────────────────────────

    case "SET_EXPLORE_TAB_FILTERS":
      return {
        ...state,
        exploreTabFilters: {
          ...state.exploreTabFilters,
          [action.tab]: action.filters,
        },
      };

    case "SET_ACTIVE_EXPLORE_TAB":
      return { ...state, activeExploreTab: action.tab };

    // ── Search ──────────────────────────────────────────────────────────────

    case "SET_SEARCH_RECIPES": {
      const key = makeSearchKey(action.query);
      const prev = state.searchCache.entries.find((e) => e.query === key);
      const updated: CachedSearchEntry = {
        query: key,
        recipes:
          action.recipesPage === 0
            ? action.recipes
            : [...(prev?.recipes ?? []), ...action.recipes],
        recipesPage: action.recipesPage,
        recipesHasMore: action.recipesHasMore,
        recipesTotalCount: action.recipesTotalCount,
        // Preserve any already-loaded people data
        people: prev?.people ?? [],
        peoplePage: prev?.peoplePage ?? 0,
        peopleHasMore: prev?.peopleHasMore ?? true,
        peopleTotalCount: prev?.peopleTotalCount ?? null,
        peopleLoaded: prev?.peopleLoaded ?? false,
        lastFetched: Date.now(),
      };
      const rest = state.searchCache.entries
        .filter((e) => e.query !== key)
        .slice(0, MAX_SEARCH_ENTRIES - 1);
      return {
        ...state,
        searchCache: { entries: [updated, ...rest] },
      };
    }

    case "SET_SEARCH_PEOPLE": {
      const key = makeSearchKey(action.query);
      const prev = state.searchCache.entries.find((e) => e.query === key);
      if (!prev) return state; // recipes must be fetched first
      const updated: CachedSearchEntry = {
        ...prev,
        people:
          action.peoplePage === 0
            ? action.people
            : [...prev.people, ...action.people],
        peoplePage: action.peoplePage,
        peopleHasMore: action.peopleHasMore,
        peopleTotalCount: action.peopleTotalCount,
        peopleLoaded: true,
      };
      return {
        ...state,
        searchCache: {
          entries: state.searchCache.entries.map((e) =>
            e.query === key ? updated : e,
          ),
        },
      };
    }

    case "INVALIDATE_SEARCH": {
      const key = makeSearchKey(action.query);
      return {
        ...state,
        searchCache: {
          entries: state.searchCache.entries.filter((e) => e.query !== key),
        },
      };
    }

    // ── Cross-cutting patch ─────────────────────────────────────────────────

    case "PATCH_RECIPE": {
      const { recipeId, patch } = action;

      // 1. Find the full recipe object first (needed if we're adding it to a feed)
      let fullRecipe: any = null;
      for (const key of HOME_FEED_KEYS) {
        const found = state[key].recipes.find((r) => r.id === recipeId);
        if (found) {
          fullRecipe = found;
          break;
        }
      }
      if (!fullRecipe) {
        for (const tab of EXPLORE_TAB_KEYS) {
          for (const feed of Object.values(state[tab])) {
            const found = feed.recipes.find((r) => r.id === recipeId);
            if (found) {
              fullRecipe = found;
              break;
            }
          }
          if (fullRecipe) break;
        }
      }
      if (!fullRecipe) {
        const foundInSearch = state.searchCache.entries
          .flatMap((e) => e.recipes)
          .find((r) => r.id === recipeId);
        if (foundInSearch) fullRecipe = foundInSearch;
      }

      // 2. Prepare the home feeds patch
      const homePatch: Partial<FeedCacheState> = {};
      for (const key of HOME_FEED_KEYS) {
        let feed = state[key];
        let changed = false;

        // Standard patch for existing recipes in this feed
        const patchedFeed = patchRecipeInFeed(feed, recipeId, patch);
        if (patchedFeed !== feed) {
          feed = patchedFeed;
          changed = true;
        }

        // Special handling for Library feeds (Adding/Removing)
        if (fullRecipe) {
          const updatedRecipe = { ...fullRecipe, ...patch };

          if (key === "likedRecipes" && "current_user_reaction" in patch) {
            const isLiked = patch.current_user_reaction === "like";
            const exists = feed.recipes.some((r) => r.id === recipeId);

            if (isLiked && !exists) {
              // Add to Liked
              feed = {
                ...feed,
                recipes: [updatedRecipe, ...feed.recipes],
                totalCount:
                  feed.totalCount !== null ? feed.totalCount + 1 : null,
              };
              changed = true;
            } else if (!isLiked && exists) {
              // Remove from Liked
              feed = {
                ...feed,
                recipes: feed.recipes.filter((r) => r.id !== recipeId),
                totalCount:
                  feed.totalCount !== null ? Math.max(0, feed.totalCount - 1) : null,
              };
              changed = true;
            }
          }

          if (key === "savedRecipes" && "is_saved" in patch) {
            const isSaved = patch.is_saved;
            const exists = feed.recipes.some((r) => r.id === recipeId);

            if (isSaved && !exists) {
              // Add to Saved
              feed = {
                ...feed,
                recipes: [updatedRecipe, ...feed.recipes],
                totalCount:
                  feed.totalCount !== null ? feed.totalCount + 1 : null,
              };
              changed = true;
            } else if (!isSaved && exists) {
              // Remove from Saved
              feed = {
                ...feed,
                recipes: feed.recipes.filter((r) => r.id !== recipeId),
                totalCount:
                  feed.totalCount !== null ? Math.max(0, feed.totalCount - 1) : null,
              };
              changed = true;
            }
          }
        }

        if (changed) homePatch[key] = feed;
      }

      // 3. Prepare Explore tabs patch
      const explorePatch: Partial<Pick<FeedCacheState, ExploreTabKey>> = {};
      for (const tab of EXPLORE_TAB_KEYS) {
        const tabCache = state[tab];
        const newTab: ExploreTabCache = {};
        let changed = false;
        for (const [fk, feed] of Object.entries(tabCache)) {
          const patched = patchRecipeInFeed(feed, recipeId, patch);
          newTab[fk] = patched;
          if (patched !== feed) changed = true;
        }
        if (changed) explorePatch[tab] = newTab;
      }

      // 4. Prepare Search cache patch
      let newSearchCache = state.searchCache;
      const patchedEntries = state.searchCache.entries.map((entry) => {
        if (!entry.recipes.some((r) => r.id === recipeId)) return entry;
        return {
          ...entry,
          recipes: entry.recipes.map((r) =>
            r.id === recipeId ? { ...r, ...patch } : r,
          ),
        };
      });
      if (patchedEntries.some((e, i) => e !== state.searchCache.entries[i])) {
        newSearchCache = { entries: patchedEntries };
      }

      return {
        ...state,
        ...homePatch,
        ...explorePatch,
        searchCache: newSearchCache,
      };
    }

    case "SET_SIDEBAR_DATA":
      return {
        ...state,
        sidebarChefs: action.chefs,
        sidebarRecipes: action.recipes,
        sidebarLastFetched: Date.now(),
      };

    case "INVALIDATE_SIDEBAR":
      return {
        ...state,
        sidebarChefs: [],
        sidebarRecipes: [],
        sidebarLastFetched: null,
      };

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

type FeedCacheContextType = {
  state: FeedCacheState;

  // Home
  setFeed: (key: HomeFeedKey, feed: Partial<CachedFeed>) => void;
  invalidate: (key: HomeFeedKey) => void;
  invalidateAll: () => void;
  isStale: (key: HomeFeedKey) => boolean;

  // Explore
  setExploreFeed: (
    tab: ExploreTabKey,
    filterKey: string,
    feed: Partial<CachedFeed>,
  ) => void;
  getExploreFeed: (tab: ExploreTabKey, filterKey: string) => CachedFeed;
  isExploreFeedStale: (tab: ExploreTabKey, filterKey: string) => boolean;
  invalidateExploreTab: (tab: ExploreTabKey) => void;
  invalidateAllExploreTabs: () => void;

  // Per-tab filter persistence
  setExploreTabFilters: (
    tab: ExploreTabKey,
    filters: ExploreFilterState,
  ) => void;
  getExploreTabFilters: (tab: ExploreTabKey) => ExploreFilterState;
  setActiveExploreTab: (tab: string) => void;

  // Search
  setSearchRecipes: (
    query: string,
    recipes: any[],
    page: number,
    hasMore: boolean,
    totalCount: number | null,
  ) => void;
  setSearchPeople: (
    query: string,
    people: any[],
    page: number,
    hasMore: boolean,
    totalCount: number | null,
  ) => void;
  getSearchEntry: (query: string) => CachedSearchEntry | undefined;
  isSearchStale: (query: string) => boolean;
  invalidateSearch: (query: string) => void;

  // Cross-cutting
  patchRecipe: (recipeId: string, patch: Record<string, any>) => void;
 
  // Sidebar
  setSidebarData: (chefs: any[], recipes: any[]) => void;
  invalidateSidebar: () => void;
};

const FeedCacheContext = createContext<FeedCacheContextType | null>(null);

export function FeedCacheProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(feedCacheReducer, initialState);

  // Home
  const setFeed = (key: HomeFeedKey, feed: Partial<CachedFeed>) =>
    dispatch({ type: "SET_FEED", key, feed });
  const invalidate = (key: HomeFeedKey) =>
    dispatch({ type: "INVALIDATE", key });
  const invalidateAll = () => dispatch({ type: "INVALIDATE_ALL" });
  const isStale = (key: HomeFeedKey) => {
    const { lastFetched } = state[key];
    return !lastFetched || Date.now() - lastFetched > STALE_MS;
  };

  // Explore
  const setExploreFeed = (
    tab: ExploreTabKey,
    filterKey: string,
    feed: Partial<CachedFeed>,
  ) => dispatch({ type: "SET_EXPLORE_FEED", tab, filterKey, feed });

  const getExploreFeed = (tab: ExploreTabKey, filterKey: string): CachedFeed =>
    state[tab][filterKey] ?? emptyFeed();

  const isExploreFeedStale = (tab: ExploreTabKey, filterKey: string) => {
    const feed = state[tab][filterKey];
    return !feed?.lastFetched || Date.now() - feed.lastFetched > STALE_MS;
  };

  const invalidateExploreTab = (tab: ExploreTabKey) =>
    dispatch({ type: "INVALIDATE_EXPLORE_TAB", tab });

  const invalidateAllExploreTabs = () =>
    dispatch({ type: "INVALIDATE_EXPLORE_ALL_TABS" });

  // Per-tab filter persistence
  const setExploreTabFilters = (
    tab: ExploreTabKey,
    filters: ExploreFilterState,
  ) => dispatch({ type: "SET_EXPLORE_TAB_FILTERS", tab, filters });

  const getExploreTabFilters = (tab: ExploreTabKey): ExploreFilterState =>
    state.exploreTabFilters[tab] ?? emptyFilterState();

  const setActiveExploreTab = (tab: string) =>
    dispatch({ type: "SET_ACTIVE_EXPLORE_TAB", tab });

  // Search
  const setSearchRecipes = (
    query: string,
    recipes: any[],
    page: number,
    hasMore: boolean,
    totalCount: number | null,
  ) =>
    dispatch({
      type: "SET_SEARCH_RECIPES",
      query,
      recipes,
      recipesPage: page,
      recipesHasMore: hasMore,
      recipesTotalCount: totalCount,
    });

  const setSearchPeople = (
    query: string,
    people: any[],
    page: number,
    hasMore: boolean,
    totalCount: number | null,
  ) =>
    dispatch({
      type: "SET_SEARCH_PEOPLE",
      query,
      people,
      peoplePage: page,
      peopleHasMore: hasMore,
      peopleTotalCount: totalCount,
    });

  const getSearchEntry = (query: string) => {
    const key = makeSearchKey(query);
    return state.searchCache.entries.find((e) => e.query === key);
  };

  const isSearchStale = (query: string) => {
    const entry = getSearchEntry(query);
    return !entry || Date.now() - entry.lastFetched > STALE_MS;
  };

  const invalidateSearch = (query: string) =>
    dispatch({ type: "INVALIDATE_SEARCH", query });

  // Cross-cutting
  const patchRecipe = (recipeId: string, patch: Record<string, any>) =>
    dispatch({ type: "PATCH_RECIPE", recipeId, patch });

  return (
    <FeedCacheContext.Provider
      value={{
        state,
        setFeed,
        invalidate,
        invalidateAll,
        isStale,
        setExploreFeed,
        getExploreFeed,
        isExploreFeedStale,
        invalidateExploreTab,
        invalidateAllExploreTabs,
        setExploreTabFilters,
        getExploreTabFilters,
        setActiveExploreTab,
        setSearchRecipes,
        setSearchPeople,
        getSearchEntry,
        isSearchStale,
        invalidateSearch,
        patchRecipe,
        setSidebarData: (chefs: any[], recipes: any[]) =>
          dispatch({ type: "SET_SIDEBAR_DATA", chefs, recipes }),
        invalidateSidebar: () => dispatch({ type: "INVALIDATE_SIDEBAR" }),
      }}
    >
      {children}
    </FeedCacheContext.Provider>
  );
}

export function useFeedCache() {
  const ctx = useContext(FeedCacheContext);
  if (!ctx)
    throw new Error("useFeedCache must be used within FeedCacheProvider");
  return ctx;
}

export type {
  CachedFeed,
  FeedCacheState,
  CachedSearchEntry,
  ExploreTabKey,
  HomeFeedKey,
};
