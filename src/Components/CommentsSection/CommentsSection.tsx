import { MessageCircle } from "lucide-react";
import AddComment from "../AddComment/AddComment";
import CommentView from "../CommentView/CommentView";
import styles from "./CommentsSection.module.css";

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

interface CommentsSectionProps {
  comments: Comment[];
  recipeId: string;
  currentUserAvatar: string | null;
  currentUserId: string | null;
  onCommentAdded: () => void;
  onCommentDeleted: (commentId: string) => void;
  onUserClick: (username: string) => void;
}

export default function CommentsSection({
  comments,
  recipeId,
  currentUserAvatar,
  currentUserId,
  onCommentAdded,
  onCommentDeleted,
  onUserClick,
}: CommentsSectionProps) {
  // Group replies under their parent
  const repliesMap: Record<string, Comment[]> = {};
  comments.forEach((c) => {
    if (c.parent_id) {
      if (!repliesMap[c.parent_id]) repliesMap[c.parent_id] = [];
      repliesMap[c.parent_id].push(c);
    }
  });

  const topLevel = comments
    .filter((c) => c.parent_id === null)
    .map((c) => ({ ...c, replies: repliesMap[c.id] ?? [] }));

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <MessageCircle color="#f97316" size={22} />
        <h2>Comments ({comments.length})</h2>
      </div>

      <AddComment
        recipeId={recipeId}
        currentUserAvatar={currentUserAvatar}
        onCommentAdded={onCommentAdded}
      />

      <div className={styles.divider} />

      {topLevel.length === 0 ? (
        <p className={styles.empty}>No comments yet. Be the first!</p>
      ) : (
        <div className={styles.list}>
          {topLevel.map((comment) => (
            <CommentView
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              currentUserAvatar={currentUserAvatar}
              recipeId={recipeId}
              onCommentDeleted={onCommentDeleted}
              onReplyAdded={onCommentAdded}
              onUserClick={onUserClick}
            />
          ))}
        </div>
      )}
    </section>
  );
}
