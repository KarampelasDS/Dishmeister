import { useParams } from "react-router";
import ProfileCard from "../Components/ProfileCard/ProfileCard";
import { useState, useEffect } from "react";
import { supabase } from "../supabase";

// adjust dark mode styles
// make profile box

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

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<profileType | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);

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

  const handleFollow = async () => {
    if (!profile) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert("User not authenticated");
      return;
    }

    if (isFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", profile.id);

      if (error) {
        console.error(error);
        return;
      }
      setIsFollowing(false);
    } else {
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: user.id, following_id: profile.id });

      if (error) {
        console.error(error);
        return;
      }
      setIsFollowing(true);
    }
  };

  return (
    <ProfileCard
      profile={profile}
      isFollowing={isFollowing}
      followFunction={handleFollow}
    />
  );
}
