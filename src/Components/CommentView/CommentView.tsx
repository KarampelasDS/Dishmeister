import { useState } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  EllipsisVertical,
  Trash2,
  MessageSquareWarning,
} from "lucide-react";
import { supabase } from "../../supabase";
import styles from "./CommentView.module.css";

const supabaseAvatarUrl = import.meta.env
  .VITE_SUPABASE_PROFILE_BUCKET_URL as string;

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

interface CommentViewProps {
  comment: Comment;
  currentUserId: string | null;
  onCommentDeleted: (commentId: string) => void;
  onUserClick: (username: string) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

export default function CommentView({
  comment,
  currentUserId,
  onCommentDeleted,
  onUserClick,
}: CommentViewProps) {
  const [likes, setLikes] = useState(comment.like_count);
  const [dislikes, setDislikes] = useState(comment.dislike_count);
  const [currentReaction, setCurrentReaction] = useState<
    "like" | "dislike" | null
  >(comment.current_user_reaction);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleReaction = async (reaction: "like" | "dislike") => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert("You must be logged in to react.");
      return;
    }

    const prevLikes = likes;
    const prevDislikes = dislikes;
    const prevReaction = currentReaction;
    const isTogglingOff = currentReaction === reaction;
    const newReaction = isTogglingOff ? null : reaction;

    // Optimistic update
    if (isTogglingOff) {
      setCurrentReaction(null);
      if (reaction === "like") setLikes((p) => Math.max(0, p - 1));
      else setDislikes((p) => Math.max(0, p - 1));
    } else {
      if (currentReaction === "like" && reaction === "dislike") {
        setLikes((p) => Math.max(0, p - 1));
        setDislikes((p) => p + 1);
      } else if (currentReaction === "dislike" && reaction === "like") {
        setDislikes((p) => Math.max(0, p - 1));
        setLikes((p) => p + 1);
      } else {
        if (reaction === "like") setLikes((p) => p + 1);
        else setDislikes((p) => p + 1);
      }
      setCurrentReaction(reaction);
    }

    let error: any = null;
    if (newReaction === null) {
      const res = await supabase
        .from("comment_reactions")
        .delete()
        .match({ user_id: user.id, comment_id: comment.id });
      error = res.error;
    } else {
      const res = await supabase
        .from("comment_reactions")
        .upsert(
          { user_id: user.id, comment_id: comment.id, reaction: newReaction },
          { onConflict: ["user_id", "comment_id"] },
        );
      error = res.error;
    }

    if (error) {
      setLikes(prevLikes);
      setDislikes(prevDislikes);
      setCurrentReaction(prevReaction);
      alert(error.message);
    }
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    // Optimistically remove
    onCommentDeleted(comment.id);

    const { error } = await supabase
      .from("comments")
      .delete()
      .match({ id: comment.id });

    if (error) {
      // Revert by re-adding — parent refetches via onCommentAdded reuse
      alert(error.message);
    }
  };

  const isOwnComment = currentUserId === comment.profiles.id;

  return (
    <div className={styles.wrapper}>
      <img
        src={
          comment.profiles.avatar_url
            ? `${supabaseAvatarUrl}${comment.profiles.avatar_url}`
            : "/default-avatar.png"
        }
        alt={comment.profiles.display_name ?? "User"}
        className={styles.avatar}
        onClick={() => onUserClick(comment.profiles.username ?? "")}
      />

      <div className={styles.body}>
        <div className={styles.header}>
          <div
            className={styles.userInfo}
            onClick={() => onUserClick(comment.profiles.username ?? "")}
          >
            <span className={styles.displayName}>
              {comment.profiles.display_name ?? comment.profiles.username}
            </span>
            <span className={styles.timestamp}>
              {timeAgo(comment.created_at)}
            </span>
          </div>

          <button
            className={styles.menuBtn}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Comment options"
          >
            <EllipsisVertical size={16} />
          </button>

          {menuOpen && (
            <div className={styles.menuDropdown}>
              {isOwnComment ? (
                <button className={styles.menuItem} onClick={handleDelete}>
                  <Trash2 size={15} color="#cd3131" />
                  <span style={{ color: "#cd3131" }}>Delete</span>
                </button>
              ) : (
                <button
                  className={styles.menuItem}
                  onClick={() => {
                    console.log("report", comment.id);
                    setMenuOpen(false);
                  }}
                >
                  <MessageSquareWarning size={15} color="#cd3131" />
                  <span style={{ color: "#cd3131" }}>Report</span>
                </button>
              )}
            </div>
          )}
        </div>

        <p className={styles.content}>{comment.content}</p>

        <div className={styles.reactions}>
          <button
            className={`${styles.reactionBtn} ${
              currentReaction === "like" ? styles.activeLike : ""
            }`}
            onClick={() => handleReaction("like")}
          >
            <ThumbsUp size={14} />
            <span>{likes}</span>
          </button>

          <button
            className={`${styles.reactionBtn} ${
              currentReaction === "dislike" ? styles.activeDislike : ""
            }`}
            onClick={() => handleReaction("dislike")}
          >
            <ThumbsDown size={14} />
            <span>{dislikes}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
