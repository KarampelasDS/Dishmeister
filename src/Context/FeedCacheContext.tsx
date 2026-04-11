import { createContext, useContext, useReducer, ReactNode } from "react";

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

type FeedCacheState = {
  forYou: CachedFeed;
  following: CachedFeed;
  savedRecipes: CachedFeed;
  ownProfile: CachedFeed;
};

type FeedCacheAction =
  | { type: "SET_FEED"; key: keyof FeedCacheState; feed: Partial<CachedFeed> }
  | { type: "PATCH_RECIPE"; recipeId: string; patch: Record<string, any> }
  | { type: "INVALIDATE"; key: keyof FeedCacheState }
  | { type: "INVALIDATE_ALL" };

const initialState: FeedCacheState = {
  forYou: emptyFeed(),
  following: emptyFeed(),
  savedRecipes: emptyFeed(),
  ownProfile: emptyFeed(),
};

const STALE_MS = 5 * 60 * 1000; // 5 minutes

function feedCacheReducer(
  state: FeedCacheState,
  action: FeedCacheAction,
): FeedCacheState {
  switch (action.type) {
    case "SET_FEED":
      return {
        ...state,
        [action.key]: {
          ...state[action.key],
          ...action.feed,
        },
      };
    case "INVALIDATE":
      return {
        ...state,
        [action.key]: emptyFeed(),
      };
    case "INVALIDATE_ALL":
      return initialState;
    case "PATCH_RECIPE": {
      const keys = [
        "forYou",
        "following",
        "savedRecipes",
        "ownProfile",
      ] as const;
      const updated = { ...state };
      for (const key of keys) {
        if (!state[key].recipes.some((r) => r.id === action.recipeId)) continue;
        updated[key] = {
          ...state[key],
          recipes: state[key].recipes.map((r) =>
            r.id === action.recipeId ? { ...r, ...action.patch } : r,
          ),
        };
      }
      return updated;
    }
    default:
      return state;
  }
}

type FeedCacheContextType = {
  state: FeedCacheState;
  setFeed: (key: keyof FeedCacheState, feed: Partial<CachedFeed>) => void;
  invalidate: (key: keyof FeedCacheState) => void;
  invalidateAll: () => void;
  isStale: (key: keyof FeedCacheState) => boolean;
  patchRecipe: (recipeId: string, patch: Record<string, any>) => void;
};

const FeedCacheContext = createContext<FeedCacheContextType | null>(null);

export function FeedCacheProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(feedCacheReducer, initialState);

  const setFeed = (key: keyof FeedCacheState, feed: Partial<CachedFeed>) =>
    dispatch({ type: "SET_FEED", key, feed });

  const invalidate = (key: keyof FeedCacheState) =>
    dispatch({ type: "INVALIDATE", key });

  const invalidateAll = () => dispatch({ type: "INVALIDATE_ALL" });

  const isStale = (key: keyof FeedCacheState) => {
    const { lastFetched } = state[key];
    if (!lastFetched) return true;
    return Date.now() - lastFetched > STALE_MS;
  };

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
        patchRecipe,
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

export type { CachedFeed, FeedCacheState };
export { STALE_MS };
