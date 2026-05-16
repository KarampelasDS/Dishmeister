import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { X } from "lucide-react";
import TopChefsItem from "../TopChefsItem/TopChefsItem";
import styles from "./SocialModal.module.css";
import Loader from "../Loader/Loader";
import { useAuth } from "../../Context/AuthProvider";
import { useFeedCache } from "../../Context/FeedCacheContext";

type SocialModalProps = {
  isOpen: boolean;
  onClose: () => void;
  type: "followers" | "following";
  profileId: string;
};

type TopChef = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  follower_count: number;
  recipe_count: number;
  is_following: boolean;
};

export default function SocialModal({ isOpen, onClose, type, profileId }: SocialModalProps) {
  const [users, setUsers] = useState<TopChef[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoadingIds, setFollowLoadingIds] = useState<Set<string>>(new Set());
  const { session } = useAuth();
  const { invalidate, invalidateSidebar } = useFeedCache();

  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      setLoading(true);
      const currentUserId = session?.user?.id;

      if (type === "followers") {
        const { data, error } = await supabase
          .from("follows")
          .select(`
            profiles!follows_follower_id_fkey(id, username, display_name, avatar_url, follower_count, recipe_count)
          `)
          .eq("following_id", profileId);

        if (!error && data) {
          const profiles = data.map((d: any) => d.profiles);
          await processProfiles(profiles, currentUserId);
        }
      } else {
        const { data, error } = await supabase
          .from("follows")
          .select(`
            profiles!follows_following_id_fkey(id, username, display_name, avatar_url, follower_count, recipe_count)
          `)
          .eq("follower_id", profileId);

        if (!error && data) {
          const profiles = data.map((d: any) => d.profiles);
          await processProfiles(profiles, currentUserId);
        }
      }
      setLoading(false);
    };

    const processProfiles = async (profiles: any[], currentUserId?: string) => {
      if (!currentUserId) {
        setUsers(profiles.map(p => ({ ...p, is_following: false })));
        return;
      }

      // Check which of these profiles the current user is following
      const profileIds = profiles.map(p => p.id);
      if (profileIds.length === 0) {
        setUsers([]);
        return;
      }

      const { data: followData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUserId)
        .in("following_id", profileIds);

      const followingSet = new Set(followData?.map(f => f.following_id) || []);

      const formattedProfiles = profiles.map(p => ({
        ...p,
        is_following: followingSet.has(p.id)
      }));

      setUsers(formattedProfiles);
    };

    fetchUsers();
  }, [isOpen, type, profileId, session?.user?.id]);

  const handleFollow = async (targetUserId: string) => {
    if (!session?.user) return;
    const currentUserId = session.user.id;

    setFollowLoadingIds(prev => {
      const newSet = new Set(prev);
      newSet.add(targetUserId);
      return newSet;
    });

    const targetUser = users.find(u => u.id === targetUserId);
    const isFollowing = targetUser?.is_following;

    if (isFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId);

      if (!error) {
        setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, is_following: false, follower_count: u.follower_count - 1 } : u));
        invalidate("following");
        invalidateSidebar();
      }
    } else {
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: currentUserId, following_id: targetUserId });

      if (!error) {
        setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, is_following: true, follower_count: u.follower_count + 1 } : u));
        invalidate("following");
        invalidateSidebar();
      }
    }

    setFollowLoadingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(targetUserId);
      return newSet;
    });
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{type === "followers" ? "Followers" : "Following"}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className={styles.list}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
              <Loader />
            </div>
          ) : users.length === 0 ? (
            <div className={styles.emptyState}>
              No {type === "followers" ? "followers" : "following"} found.
            </div>
          ) : (
            users.map(user => (
              <TopChefsItem
                key={user.id}
                chef={user}
                onFollow={handleFollow}
                isFollowingLoading={followLoadingIds.has(user.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
