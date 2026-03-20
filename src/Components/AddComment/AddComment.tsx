import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { supabase } from "../../supabase";
import styles from "./AddComment.module.css";

const supabaseAvatarUrl = import.meta.env
  .VITE_SUPABASE_PROFILE_BUCKET_URL as string;

interface AddCommentProps {
  recipeId: string;
  currentUserAvatar: string | null;
  onCommentAdded: () => void;
}

export default function AddComment({
  recipeId,
  currentUserAvatar,
  onCommentAdded,
}: AddCommentProps) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    autoResize();
  }, [content]);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed || submitting) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert("You must be logged in to comment.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      recipe_id: recipeId,
      author_id: user.id,
      content: trimmed,
    });
    setSubmitting(false);

    if (error) {
      alert(error.message);
      return;
    }

    setContent("");
    onCommentAdded();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={styles.wrapper}>
      <img
        src={
          currentUserAvatar
            ? `${supabaseAvatarUrl}${currentUserAvatar}`
            : "/default-avatar.png"
        }
        alt="Your avatar"
        className={styles.avatar}
      />
      <div className={styles.inputWrapper}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          placeholder="Add a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          className={`${styles.sendBtn} ${content.trim() ? styles.active : ""}`}
          onClick={handleSubmit}
          disabled={!content.trim() || submitting}
          aria-label="Send comment"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
