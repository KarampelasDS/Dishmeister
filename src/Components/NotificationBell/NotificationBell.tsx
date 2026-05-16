import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { supabase } from "../../supabase";
import { useNavigate } from "react-router";
import { formatRelativeTime } from "../../utils/formatDate";
import styles from "./NotificationBell.module.css";
import { useClickOutside } from "../../Hooks/useClickOutside";

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface Notification {
  id: string;
  type: "follow" | "like" | "comment" | "reply";
  is_read: boolean;
  created_at: string;
  recipe_id: string | null;
  comment_id: string | null;
  sender: Profile;
}

interface NotificationBellProps {
  userId: string;
}

const avatarBucketUrl = import.meta.env.VITE_SUPABASE_PROFILE_BUCKET_URL;

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useClickOutside(() => setIsOpen(false));
  const navigate = useNavigate();

  const fetchUnreadCount = async () => {
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .eq("is_read", false);

    if (!error && count !== null) {
      setUnreadCount(count);
    }
  };

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select(`
        id,
        type,
        is_read,
        created_at,
        recipe_id,
        comment_id,
        sender:profiles!notifications_sender_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data as any);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    fetchNotifications();

    // Set up real-time subscription
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          fetchUnreadCount();
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const toggleDropdown = async () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    if (nextState && unreadCount > 0) {
      // Mark as read when opening
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("recipient_id", userId)
        .eq("is_read", false);

      if (!error) {
        setUnreadCount(0);
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true }))
        );
      }
    }
  };

  const deleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);

    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      fetchUnreadCount();
    }
  };

  const clearAllNotifications = async () => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("recipient_id", userId);

    if (!error) {
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    setIsOpen(false);
    switch (notification.type) {
      case "follow":
        navigate(`/profiles/${notification.sender.username}`);
        break;
      case "like":
      case "comment":
      case "reply":
        navigate(`/recipes/${notification.recipe_id}${notification.type !== "like" ? "#comments" : ""}`);
        break;
    }
  };

  const getNotificationText = (notification: Notification) => {
    const name = notification.sender.display_name || notification.sender.username;
    switch (notification.type) {
      case "follow":
        return `${name} followed you`;
      case "like":
        return `${name} liked your recipe`;
      case "comment":
        return `${name} commented on your recipe`;
      case "reply":
        return `${name} replied to your comment`;
      default:
        return "";
    }
  };

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button className={styles.bellButton} onClick={toggleDropdown} aria-label="Notifications">
        <Bell size={24} />
        {unreadCount > 0 && <span className={styles.badge} />}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <h3>Notifications</h3>
            {notifications.length > 0 && (
              <button className={styles.clearAll} onClick={clearAllNotifications}>
                Clear All
              </button>
            )}
          </div>

          <div className={styles.list}>
            {notifications.length === 0 ? (
              <div className={styles.emptyState}>No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`${styles.item} ${!n.is_read ? styles.unread : ""}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <img
                    src={
                      n.sender.avatar_url
                        ? avatarBucketUrl + n.sender.avatar_url
                        : "/defaultAvatar.png"
                    }
                    alt={n.sender.username || "avatar"}
                    className={styles.avatar}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/defaultAvatar.png";
                    }}
                  />
                  <div className={styles.content}>
                    <p className={styles.text}>{getNotificationText(n)}</p>
                    <span className={styles.time}>{formatRelativeTime(n.created_at)}</span>
                  </div>
                  <button
                    className={styles.deleteButton}
                    onClick={(e) => deleteNotification(e, n.id)}
                    aria-label="Delete notification"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
