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
  current_user_reaction: "like" | "dislike" | null;
  profiles: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
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

      {comments.length === 0 ? (
        <p className={styles.empty}>No comments yet. Be the first!</p>
      ) : (
        <div className={styles.list}>
          {comments.map((comment) => (
            <CommentView
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onCommentDeleted={onCommentDeleted}
              onUserClick={onUserClick}
            />
          ))}
        </div>
      )}
    </section>
  );
}
