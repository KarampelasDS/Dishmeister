import { useState } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  EllipsisVertical,
  Trash2,
  MessageSquareWarning,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { supabase } from "../../supabase";
import AddComment from "../AddComment/AddComment";
import styles from "./CommentView.module.css";
import { useClickOutside } from "../../Hooks/useClickOutside";
import ReportModal from "../ReportModal/ReportModal";
import ErrorModal from "../ErrorModal/ErrorModal";
import { formatRelativeTime } from "../../utils/formatDate";

const supabaseAvatarUrl = import.meta.env
  .VITE_SUPABASE_PROFILE_BUCKET_URL as string;

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

interface CommentViewProps {
  comment: Comment;
  currentUserId: string | null;
  currentUserAvatar: string | null;
  recipeId: string;
  onCommentDeleted: (commentId: string) => void;
  onReplyAdded: () => void;
  onUserClick: (username: string) => void;
}

export default function CommentView({
  comment,
  currentUserId,
  currentUserAvatar,
  recipeId,
  onCommentDeleted,
  onReplyAdded,
  onUserClick,
}: CommentViewProps) {
  const [likes, setLikes] = useState(comment.like_count);
  const [dislikes, setDislikes] = useState(comment.dislike_count);
  const [currentReaction, setCurrentReaction] = useState<
    "like" | "dislike" | null
  >(comment.current_user_reaction);
  const [menuOpen, setMenuOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [replyMenuOpen, setReplyMenuOpen] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingId, setReportingId] = useState("");
  const [errorModal, setErrorModal] = useState({ open: false, message: "" });

  const commentMenuRef = useClickOutside(() => setMenuOpen(false));
  const replyMenuRef = useClickOutside(() => setReplyMenuOpen(null));

  const handleReaction = async (reaction: "like" | "dislike") => {
    if (reacting) return;
    setReacting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setReacting(false);
      setErrorModal({ open: true, message: "You must be logged in to react." });
      return;
    }

    const prevLikes = likes;
    const prevDislikes = dislikes;
    const prevReaction = currentReaction;
    const isTogglingOff = currentReaction === reaction;
    const newReaction = isTogglingOff ? null : reaction;

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
          { onConflict: "user_id,comment_id" },
        );
      error = res.error;
    }

    if (error) {
      setLikes(prevLikes);
      setDislikes(prevDislikes);
      setCurrentReaction(prevReaction);
      setErrorModal({ open: true, message: error.message });
    }

    setReacting(false);
  };

  const replyCount = comment.replies.length;

  return (
    <div className={styles.wrapper}>
      {reportModalOpen && (
        <ReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          targetType="comment"
          targetId={reportingId}
        />
      )}
      {errorModal.open && (
        <ErrorModal
          isOpen={errorModal.open}
          onClose={() => setErrorModal({ ...errorModal, open: false })}
          message={errorModal.message}
        />
      )}


      <img
        src={
          comment.profiles.avatar_url
            ? `${supabaseAvatarUrl}${comment.profiles.avatar_url}`
            : "/defaultAvatar.png"
        }
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.onerror = null;
          target.src = "/defaultAvatar.png";
        }}
        alt={comment.profiles.display_name ?? comment.profiles.username ?? ""}
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
              {formatRelativeTime(comment.created_at)}
            </span>
          </div>

          <div ref={commentMenuRef} style={{ position: "relative" }}>
            <button
              className={styles.menuBtn}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Comment options"
            >
              <EllipsisVertical size={16} />
            </button>
            {menuOpen && (
              <div className={styles.menuDropdown}>
                {currentUserId === comment.profiles.id ? (
                  <button
                    className={styles.menuItem}
                    onClick={() => {
                      setMenuOpen(false);
                      onCommentDeleted(comment.id);
                    }}
                  >
                    <Trash2 size={15} color="#cd3131" />
                    <span style={{ color: "#cd3131" }}>Delete</span>
                  </button>
                ) : (
                  <button
                    className={styles.menuItem}
                    onClick={() => {
                      setReportingId(comment.id);
                      setReportModalOpen(true);
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
        </div>

        <p className={styles.content}>{comment.content}</p>

        <div className={styles.reactions}>
          <button
            className={`${styles.reactionBtn} ${
              currentReaction === "like" ? styles.activeLike : ""
            }`}
            onClick={() => handleReaction("like")}
            disabled={reacting}
          >
            <ThumbsUp size={14} />
            <span>{likes}</span>
          </button>

          <button
            className={`${styles.reactionBtn} ${
              currentReaction === "dislike" ? styles.activeDislike : ""
            }`}
            onClick={() => handleReaction("dislike")}
            disabled={reacting}
          >
            <ThumbsDown size={14} />
            <span>{dislikes}</span>
          </button>

          <button
            className={`${styles.reactionBtn} ${replyOpen ? styles.activeReply : ""}`}
            onClick={() => setReplyOpen((o) => !o)}
          >
            <MessageCircle size={14} />
            <span>Reply</span>
          </button>
        </div>

        {replyOpen && (
          <div className={styles.replyInput}>
            <AddComment
              recipeId={recipeId}
              currentUserAvatar={currentUserAvatar}
              parentId={comment.id}
              placeholder={`Reply to ${comment.profiles.display_name ?? comment.profiles.username}...`}
              onCommentAdded={() => {
                setReplyOpen(false);
                setRepliesOpen(true);
                onReplyAdded();
              }}
            />
          </div>
        )}

        {replyCount > 0 && (
          <button
            className={styles.repliesToggle}
            onClick={() => setRepliesOpen((o) => !o)}
          >
            {repliesOpen ? (
              <>
                <ChevronUp size={14} />
                Hide replies
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                {replyCount} {replyCount === 1 ? "Reply" : "Replies"}
              </>
            )}
          </button>
        )}

        {repliesOpen && replyCount > 0 && (
          <div className={styles.repliesList}>
            {comment.replies.map((reply) => (
              <div key={reply.id} className={styles.replyWrapper}>
                <img
                  src={
                    reply.profiles.avatar_url
                      ? `${supabaseAvatarUrl}${reply.profiles.avatar_url}`
                      : "/defaultAvatar.png"
                  }
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = "/defaultAvatar.png";
                  }}
                  alt={reply.profiles.display_name ?? reply.profiles.username ?? ""}
                  className={styles.replyAvatar}
                  onClick={() => onUserClick(reply.profiles.username ?? "")}
                />
                <div className={styles.replyBody}>
                  <div className={styles.header}>
                    <div
                      className={styles.userInfo}
                      onClick={() => onUserClick(reply.profiles.username ?? "")}
                    >
                      <span className={styles.displayName}>
                        {reply.profiles.display_name ?? reply.profiles.username}
                      </span>
                      <span className={styles.timestamp}>
                        {formatRelativeTime(reply.created_at)}
                      </span>
                    </div>
                    <div ref={replyMenuRef} style={{ position: "relative" }}>
                      <button
                        className={styles.menuBtn}
                        onClick={() =>
                          setReplyMenuOpen(
                            replyMenuOpen === reply.id ? null : reply.id,
                          )
                        }
                        aria-label="Reply options"
                      >
                        <EllipsisVertical size={16} />
                      </button>
                      {replyMenuOpen === reply.id && (
                        <div className={styles.menuDropdown}>
                          {currentUserId === reply.profiles.id ? (
                            <button
                              className={styles.menuItem}
                              onClick={() => {
                                setReplyMenuOpen(null);
                                onCommentDeleted(reply.id);
                              }}
                            >
                              <Trash2 size={15} color="#cd3131" />
                              <span style={{ color: "#cd3131" }}>Delete</span>
                            </button>
                          ) : (
                            <button
                              className={styles.menuItem}
                              onClick={() => {
                                setReportingId(reply.id);
                                setReportModalOpen(true);
                                setReplyMenuOpen(null);
                              }}
                            >
                              <MessageSquareWarning size={15} color="#cd3131" />
                              <span style={{ color: "#cd3131" }}>Report</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className={styles.content}>{reply.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
