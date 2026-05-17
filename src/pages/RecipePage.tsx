import { useParams, useNavigate } from "react-router";
import { useState, useEffect, useCallback } from "react";
import RecipeView from "../Components/RecipeView/RecipeView";
import { supabase } from "../supabase";
import Loader from "../Components/Loader/Loader";
import { useAuth } from "../Context/AuthProvider";
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
  ingredients: string[];
  instructions: string[];
};

interface Comment {
  id: string;
  content: string;
  created_at: string;
  like_count: number;
  dislike_count: number;
  parent_id: string | null;
  current_user_reaction: "like" | "dislike" | null;
  profiles: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  replies: Comment[];
}

export default function RecipePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError } = useAuth();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchAll = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const userId = user?.id ?? null;
      setCurrentUserId(userId);
      const effectiveUserId = userId ?? "00000000-0000-0000-0000-000000000000";

      const { data, error } = await supabase
        .from("recipes")
        .select(
          `
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
          ingredients,
          instructions,
          save_count,
          profiles!recipes_author_id_fkey(*),
          categories(*),
          recipe_reactions!left(reaction, user_id),
          recipe_saves!left(recipe_id, saved_by)
        `,
        )
        .eq("id", id)
        .eq("recipe_reactions.user_id", effectiveUserId)
        .eq("recipe_saves.saved_by", effectiveUserId)
        .single();

      if (error) {
        showError(getFriendlyErrorMessage(error));
        setLoading(false);
        return;
      }

      setRecipe({
        ...data,
        current_user_reaction: data.recipe_reactions?.[0]?.reaction ?? null,
        is_saved: data.recipe_saves?.[0]?.recipe_id !== undefined,
      } as unknown as Recipe);

      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", userId)
          .single();
        setCurrentUserAvatar(profile?.avatar_url ?? null);
      }

      await fetchComments(userId, id);

      setLoading(false);
    };

    fetchAll();
  }, [id]);

  const fetchComments = useCallback(
    async (
      userId: string | null = currentUserId,
      recipeId: string | undefined = id,
    ) => {
      if (!recipeId) return;

      const { data, error } = await supabase
        .from("comments")
        .select(
          `
          id,
          content,
          created_at,
          like_count,
          dislike_count,
          parent_id,
          profiles!comments_author_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `,
        )
        .eq("recipe_id", recipeId)
        .order("created_at", { ascending: false });

      if (error) {
        showError(getFriendlyErrorMessage(error));
        return;
      }

      let blockedIds = new Set<string>();
      if (userId) {
        const { data: blocks } = await supabase
          .from("blocks")
          .select("blocker_id, blocked_id")
          .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
        blocks?.forEach((b: any) => {
          if (b.blocker_id === userId) blockedIds.add(b.blocked_id);
          if (b.blocked_id === userId) blockedIds.add(b.blocker_id);
        });
      }

      const filteredData = (data ?? []).filter(
        (c: any) => !blockedIds.has(c.profiles.id)
      );

      let reactionsMap: Record<string, "like" | "dislike"> = {};
      if (userId && filteredData.length > 0) {
        const commentIds = filteredData.map((c: any) => c.id);
        const { data: reactions } = await supabase
          .from("comment_reactions")
          .select("comment_id, reaction")
          .eq("user_id", userId)
          .in("comment_id", commentIds);

        reactions?.forEach((r: any) => {
          reactionsMap[r.comment_id] = r.reaction;
        });
      }

      setComments(
        filteredData.map((c: any) => ({
          ...c,
          current_user_reaction: reactionsMap[c.id] ?? null,
        })),
      );
    },
    [currentUserId, id],
  );

  if (loading) return <Loader fullPage />;
  if (!recipe) return <div>Recipe not found</div>;

  const handleCommentDeleted = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    const { error } = await supabase
      .from("comments")
      .delete()
      .match({ id: commentId });
    if (error) {
      await fetchComments();
      showError(getFriendlyErrorMessage(error));
    }
  };

  return (
    <RecipeView
      recipe={recipe}
      comments={comments}
      currentUserAvatar={currentUserAvatar}
      currentUserId={currentUserId}
      onBack={() => navigate(-1)}
      onUserClick={(username) => navigate(`/profiles/${username}`)}
      onCommentAdded={() => fetchComments()}
      onCommentDeleted={handleCommentDeleted}
    />
  );
}
