import { useParams } from "react-router";
import ProfileCard from "../Components/ProfileCard/ProfileCard";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import RecipeCompactCard from "../Components/RecipeCompactCard/RecipeCompactCard";
import Loader from "../Components/Loader/Loader";

import styles from "./ProfilePage.module.css";
import { useFeedCache } from "../Context/FeedCacheContext";

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
  recipe_saves!left (recipe_id, saved_by)
`;

export default function Profile() {
  const { invalidate } = useFeedCache();
  const { username } = useParams<{ username: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<profileType | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [canFollow, setCanFollow] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [, setTotalCount] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  // pageRef is the source of truth for offset — always in sync before fetch fires
  const pageRef = useRef(0);

  const fetchRecipes = async (pageToFetch: number, retries = 3) => {
    if (!profile) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const from = pageToFetch * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let data, error, count;

    for (let attempt = 0; attempt < retries; attempt++) {
      ({ data, error, count } = await supabase
        .from("recipes")
        .select(SHARED_SELECT, { count: "exact" })
        .eq("author_id", profile.id)
        .order("created_at", { ascending: false })
        .range(from, to));

      if (!error) break;

      // Wait longer on each retry: 1s, 2s, 3s
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
      alert("User not authenticated");
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

  useEffect(() => {
    if (!username) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
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
      }

      setProfile(data);
      setLoading(false);
    };

    fetchProfile();
  }, [username]);

  // When filter or search changes — full reset then fetch page 0
  useEffect(() => {
    pageRef.current = 0;
    setPage(0);
    setRecipes([]);
    setHasMore(true);
    setTotalCount(null);
    hasMoreRef.current = true;
    loadingRef.current = false;
    fetchRecipes(0);
  }, [profile?.id]);

  // When page increments (from sentinel) — append fetch
  useEffect(() => {
    if (page === 0) return; // page 0 is handled by the reset effect above
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
    <>
      <ProfileCard
        profile={profile}
        isFollowing={isFollowing}
        followFunction={handleFollow}
        followActive={canFollow}
        isOwnProfile={isOwnProfile}
      />
      {/* Recipe grid */}
      <div className={styles.grid}>
        {recipes.map((recipe) => (
          <RecipeCompactCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
      {/* Sentinel — IntersectionObserver target */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {/* Loading indicator */}
      {loading && <Loader />}


      {/* End of results */}
      {!hasMore && recipes.length > 0 && (
        <p style={{ textAlign: "center", padding: "1rem", color: "#aaa" }}>
          You've seen all the recipes
        </p>
      )}
    </>
  );
}
