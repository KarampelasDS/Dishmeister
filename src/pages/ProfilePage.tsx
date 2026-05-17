import { useParams } from "react-router";
import ProfileCard from "../Components/ProfileCard/ProfileCard";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import RecipeCompactCard from "../Components/RecipeCompactCard/RecipeCompactCard";
import Loader from "../Components/Loader/Loader";

import styles from "./ProfilePage.module.css";
import { useFeedCache } from "../Context/FeedCacheContext";
import { useAuth } from "../Context/AuthProvider";
import { getFriendlyErrorMessage } from "../utils/errorUtils";

type SocialLink = {
  platform: string;
  url: string;
};

type profileType = {
  id: string;
  username: string;
  avatar_url: string;
  display_name: string;
  bio: string;
  recipe_count: number;
  follower_count: number;
  following_count: number;
  total_likes: number;
  social_links: SocialLink[];
  hide_followers_list: boolean;
  hide_following_list: boolean;
};

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
  recipe_saves!left (recipe_id, saved_by)
`;

export default function Profile() {
  const { invalidate, invalidateSidebar } = useFeedCache();
  const { setIsAuthOpen, showError } = useAuth();
  const { username } = useParams<{ username: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<profileType | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [canFollow, setCanFollow] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isBlockedByThem, setIsBlockedByThem] = useState(false);
  const [hasBlockedThem, setHasBlockedThem] = useState(false);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [, setTotalCount] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const pageRef = useRef(0);

  const fetchRecipes = async (pageToFetch: number, retries = 3) => {
    if (!profile) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const from = pageToFetch * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let data, error, count;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

    for (let attempt = 0; attempt < retries; attempt++) {
      ({ data, error, count } = await supabase
        .from("recipes")
        .select(SHARED_SELECT, { count: "exact" })
        .eq("author_id", profile.id)
        .eq("recipe_reactions.user_id", userId)
        .eq("recipe_saves.saved_by", userId)
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
      console.error(getFriendlyErrorMessage(error));
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
    if (count !== null && count !== undefined) setTotalCount(count);
  };

  const handleFollow = async () => {
    if (!profile) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    const oldProfile = profile;
    setCanFollow(false);

    if (isFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", profile.id);
      invalidate("following");
      invalidateSidebar();
      setProfile((prevProfile) => {
        if (!prevProfile) return null;
        return {
          ...prevProfile,
          follower_count: prevProfile.follower_count - 1,
        };
      });

      if (error) {
        console.error(error);
        setProfile(oldProfile);
        return;
      }
      setIsFollowing(false);
    } else {
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: user.id, following_id: profile.id });
      invalidate("following");
      invalidateSidebar();
      setProfile((prevProfile) => {
        if (!prevProfile) return null;
        return {
          ...prevProfile,
          follower_count: prevProfile.follower_count + 1,
        };
      });

      if (error) {
        console.error(error);
        setProfile(oldProfile);
        return;
      }
      setIsFollowing(true);
    }
    setCanFollow(true);
  };

  const handleBlock = async () => {
    if (!profile) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("blocks")
      .insert({ blocker_id: user.id, blocked_id: profile.id });

    if (error) {
      showError(getFriendlyErrorMessage(error));
      return;
    }

    setIsFollowing(false);
    setHasBlockedThem(true);
    setRecipes([]);
    invalidate("following");
    invalidateSidebar();
  };

  const handleUnblock = async () => {
    if (!profile) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("blocks")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", profile.id);

    if (error) {
      showError(getFriendlyErrorMessage(error));
      return;
    }

    setHasBlockedThem(false);
  };

  useEffect(() => {
    if (!username) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (error) {
        showError(getFriendlyErrorMessage(error));
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setIsOwnProfile(user.id === data.id);

        const { data: followRow } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("following_id", data.id)
          .maybeSingle();

        setIsFollowing(!!followRow);

        // fetch all block rows between these two users
        const { data: blockRows } = await supabase
          .from("blocks")
          .select("blocker_id, blocked_id")
          .or(
            `and(blocker_id.eq.${user.id},blocked_id.eq.${data.id}),and(blocker_id.eq.${data.id},blocked_id.eq.${user.id})`,
          );

        if (blockRows && blockRows.length > 0) {
          setIsBlockedByThem(blockRows.some((b) => b.blocker_id === data.id));
          setHasBlockedThem(blockRows.some((b) => b.blocker_id === user.id));
        }
      }

      setProfile(data);
      setLoading(false);
    };

    fetchProfile();
  }, [username]);

  useEffect(() => {
    // don't fetch recipes if blocked in either direction
    if (isBlockedByThem || hasBlockedThem) return;
    pageRef.current = 0;
    setPage(0);
    setRecipes([]);
    setHasMore(true);
    setTotalCount(null);
    hasMoreRef.current = true;
    loadingRef.current = false;
    fetchRecipes(0);
  }, [profile?.id]);

  useEffect(() => {
    if (page === 0) return;
    fetchRecipes(page);
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

  return (
    <>
      <ProfileCard
        profile={profile}
        isFollowing={isFollowing}
        followFunction={handleFollow}
        followActive={canFollow}
        isOwnProfile={isOwnProfile}
        isBlockedByThem={isBlockedByThem}
        hasBlockedThem={hasBlockedThem}
        onBlock={handleBlock}
        onUnblock={handleUnblock}
      />

      {!isBlockedByThem && !hasBlockedThem && (
        <>
          <div className={styles.grid}>
            {recipes.map((recipe) => (
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
    </>
  );
}
