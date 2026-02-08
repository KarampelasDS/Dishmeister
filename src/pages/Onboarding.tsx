import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router";
import UsernameModal from "../components/UsernameModal";

function Onboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  const fetchProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error(error.message);
      return;
    }

    setUsername(data.username);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // once username exists → leave onboarding
  useEffect(() => {
    if (username !== null) {
      navigate("/");
    }
  }, [username, navigate]);

  if (loading) return <div>Loading...</div>;

  return (
    <>
      {username === null && (
        <UsernameModal
          session={supabase.auth.session()}
          onSuccess={fetchProfile}
        />
      )}
    </>
  );
}

export default Onboarding;
