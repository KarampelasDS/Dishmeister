import { useState, useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router";
import CreateRecipePage from "./pages/CreateRecipePage";
import Recipes from "./pages/Recipes";
import { useTheme } from "./Hooks/useTheme";
import Header from "./Components/Header/Header";
import Profile from "./pages/Profile";
import HomePage from "./pages/HomePage";
import AuthModal from "./Components/AuthModal/AuthModal";
import OnboardingModal from "./Components/OnboardingModal/OnboardingModal";
import { useAuth } from "./context/AuthProvider";

function App() {
  const { session, profile, loading, needsOnboarding, signOut } = useAuth();
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
      <Header
        username={profile?.display_name ?? null}
        avatarUrl={profile?.avatar_url ?? null}
        onLoginClick={() => setIsAuthOpen(true)}
      />

      {session && <button onClick={signOut}>Logout</button>}

      <button onClick={toggleTheme}>Toggle Dark Mode</button>

      <hr />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/recipes" element={<Recipes />} />
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
        <Route path="/profile" element={<Profile />} />
      </Routes>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          if (location.pathname === "/auth") {
            navigate("/");
          }
        }}
        onAuthSuccess={() => {
          setIsAuthOpen(false);
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
