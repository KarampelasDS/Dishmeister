import { useState, useCallback, useEffect } from "react";
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

type NotificationRow = Omit<Notification, "sender"> & {
  sender: Profile | Profile[] | null;
};

interface NotificationBellProps {
  userId: string;
}

const avatarBucketUrl = import.meta.env.VITE_SUPABASE_PROFILE_BUCKET_URL;
const NOTIFICATIONS_PAGE_SIZE = 20;

const normalizeNotification = (row: NotificationRow): Notification | null => {
  const sender = Array.isArray(row.sender) ? row.sender[0] : row.sender;

  if (!sender) return null;

  return {
    ...row,
    sender,
  };
};

const sortNotificationsNewestFirst = (notifications: Notification[]) =>
  [...notifications].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

const dedupeNotifications = (notifications: Notification[]) => {
  const seen = new Set<string>();

  return notifications.filter((notification) => {
    if (seen.has(notification.id)) return false;

    seen.add(notification.id);
    return true;
  });
};

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const dropdownRef = useClickOutside(() => setIsOpen(false));
  const navigate = useNavigate();

  const fetchUnreadCount = useCallback(async () => {
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .eq("is_read", false);

    if (!error && count !== null) {
      setUnreadCount(count);
    }
  }, [userId]);

  const fetchNotifications = useCallback(async (offset = 0) => {
    setIsLoadingNotifications(true);
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
      .range(offset, offset + NOTIFICATIONS_PAGE_SIZE);

    if (!error && data) {
      const rows = data as unknown as NotificationRow[];
      const nextNotifications = rows
        .slice(0, NOTIFICATIONS_PAGE_SIZE)
        .map(normalizeNotification)
        .filter((notification): notification is Notification => notification !== null);

      setNotifications((prev) =>
        sortNotificationsNewestFirst(
          dedupeNotifications(
            offset === 0 ? nextNotifications : [...prev, ...nextNotifications]
          )
        )
      );
      setHasMoreNotifications(data.length > NOTIFICATIONS_PAGE_SIZE);
    }
    setIsLoadingNotifications(false);
  }, [userId]);

  const loadMoreNotifications = () => {
    if (isLoadingNotifications) return;

    fetchNotifications(notifications.length);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
  }, [fetchNotifications, fetchUnreadCount, userId]);

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
          sortNotificationsNewestFirst(
            prev.map((n) => ({ ...n, is_read: true }))
          )
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

  const handleAvatarClick = (e: React.MouseEvent, sender: Profile) => {
    e.stopPropagation();
    if (!sender.username) return;

    setIsOpen(false);
    navigate(`/profiles/${sender.username}`);
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
              <>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`${styles.item} ${!n.is_read ? styles.unread : ""}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <button
                      className={styles.avatarButton}
                      onClick={(e) => handleAvatarClick(e, n.sender)}
                      aria-label={`View ${n.sender.display_name || n.sender.username || "user"}'s profile`}
                      disabled={!n.sender.username}
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
                    </button>
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
                ))}
                {hasMoreNotifications && (
                  <button
                    className={styles.loadMore}
                    onClick={loadMoreNotifications}
                    disabled={isLoadingNotifications}
                  >
                    {isLoadingNotifications ? "Loading..." : "Load older notifications"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
