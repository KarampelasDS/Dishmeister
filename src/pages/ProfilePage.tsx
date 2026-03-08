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
};

export default function Profile(props: any) {
  const { username } = useParams<{ username: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<profileType | null>(null);
  useEffect(() => {
    if (!username) return;

    const fetchRecipe = async () => {
      // get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("profiles")
        .select(`*`)
        .eq("username", username)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        setLoading(false);
        return;
      }

      console.log("Fetched profile data:", data);
      setProfile(data);
      setLoading(false);
    };

    fetchRecipe();
  }, [username]);
  return <ProfileCard profile={profile} />;
}
