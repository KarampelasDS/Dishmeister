import { useState, useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router";
import CreateRecipePage from "./pages/CreateRecipePage";
import Recipes from "./pages/Recipes";
import { useTheme } from "./Hooks/useTheme";
import Header from "./Components/Header/Header";
import ProfilePage from "./pages/ProfilePage";
import HomePage from "./pages/HomePage";
import AuthModal from "./Components/AuthModal/AuthModal";
import OnboardingModal from "./Components/OnboardingModal/OnboardingModal";
import { useAuth } from "./Context/AuthProvider";
import RecipePage from "./pages/RecipePage";
import SavedRecipes from "./pages/SavedRecipes";
import Dock from "./Components/Dock/Dock";
import Explore from "./pages/Explore";
import { useScrollRestoration } from "./Hooks/useScrollRestoration";
import EditProfilePage from "./pages/EditProfile";
import { Analytics } from "@vercel/analytics/react";

function App() {
  useScrollRestoration(["/explore"]);
  const { session, profile, loading, needsOnboarding } = useAuth();
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const { toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  /* ---------------- OPEN MODAL VIA /auth ---------------- */

  useEffect(() => {
    if (location.pathname === "/auth") {
      setIsAuthOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    setIsOnboardingOpen(!!session && needsOnboarding);
  }, [session, needsOnboarding]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <Analytics />
      <Header
        username={profile?.username ?? null}
        displayName={profile?.display_name ?? null}
        avatarUrl={profile?.avatar_url ?? null}
        onLoginClick={() => setIsAuthOpen(true)}
        onToggleDarkMode={() => toggleTheme()}
      />
      <Dock
        currentUserId={profile?.username ?? null}
        currentUrl={location.pathname}
      />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/saved" element={<SavedRecipes />} />
        <Route
          path="/recipes/new"
          element={
            session ? (
              <CreateRecipePage />
            ) : (
              <div>
                <p>You must log in to create a recipe.</p>
                <button onClick={() => setIsAuthOpen(true)}>Login</button>
              </div>
            )
          }
        />
        <Route path="/recipes/:id" element={<RecipePage />} />
        <Route path="/profiles/:username" element={<ProfilePage />} />
        <Route path="/settings" element={<EditProfilePage />} />
      </Routes>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          if (location.pathname === "/auth") {
            navigate("/");
          }
        }}
      />

      {session && (
        <OnboardingModal
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
