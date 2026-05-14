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
import Loader from "./Components/Loader/Loader";
import ErrorModal from "./Components/ErrorModal/ErrorModal";

function App() {
  useScrollRestoration(["/explore"]);
  const {
    session,
    profile,
    loading,
    needsOnboarding,
    isAuthOpen,
    setIsAuthOpen,
    isErrorOpen,
    setIsErrorOpen,
    errorMsg,
  } = useAuth();
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const { toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  /* ---------------- OPEN MODAL VIA /auth ---------------- */

  useEffect(() => {
    if (location.pathname === "/auth") {
      setIsAuthOpen(true);
    }
  }, [location.pathname, setIsAuthOpen]);

  useEffect(() => {
    setIsOnboardingOpen(!!session && needsOnboarding);
  }, [session, needsOnboarding]);

  /* ---------------- GUEST REDIRECTS (removed global redirect) ---------------- */

  if (loading) return <Loader fullPage />;

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
        <Route
          path="/saved"
          element={
            session ? (
              <SavedRecipes />
            ) : (
              <div className="guest-action-prompt">
                <h2>Log in to see your saved recipes</h2>
                <button onClick={() => setIsAuthOpen(true)}>Log In</button>
              </div>
            )
          }
        />
        <Route
          path="/recipes/new"
          element={
            session ? (
              <CreateRecipePage />
            ) : (
              <div className="guest-action-prompt">
                <h2>Log in to create a recipe</h2>
                <button onClick={() => setIsAuthOpen(true)}>Log In</button>
              </div>
            )
          }
        />
        <Route path="/recipes/:id" element={<RecipePage />} />
        <Route path="/profiles/:username" element={<ProfilePage />} />
        <Route
          path="/settings"
          element={
            session ? (
              <EditProfilePage />
            ) : (
              <div className="guest-action-prompt">
                <h2>Log in to edit your profile</h2>
                <button onClick={() => setIsAuthOpen(true)}>Log In</button>
              </div>
            )
          }
        />
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

      <ErrorModal
        isOpen={isErrorOpen}
        onClose={() => setIsErrorOpen(false)}
        message={errorMsg}
      />

      {!!session && needsOnboarding && (
        <div className="onboardingWrapper">
          <OnboardingModal
            isOpen={isOnboardingOpen}
            onClose={() => setIsOnboardingOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

export default App;
