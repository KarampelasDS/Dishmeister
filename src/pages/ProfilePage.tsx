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
};

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<profileType | null>(null);
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

      const { count } = await supabase
        .from("recipes")
        .select("*", { count: "exact", head: true })
        .eq("author_id", data.id);

      setProfile({ ...data, recipe_count: count ?? 0 });
      setLoading(false);
    };

    fetchProfile();
  }, [username]);
  return <ProfileCard profile={profile} />;
}
