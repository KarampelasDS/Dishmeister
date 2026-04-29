import { Menu, X } from "lucide-react";
import { useState, type MouseEvent } from "react";
import styles from "./BurgerMenu.module.css";
import { useTheme } from "../../Hooks/useTheme";
import { useNavigate } from "react-router";
import { supabase } from "../../supabase";
const profileURL = import.meta.env.VITE_SUPABASE_PROFILE_BUCKET_URL as string;

type BurgerMenuProps = {
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  onToggleDarkMode: () => void;
};

export default function BurgerMenu({
  username,
  displayName,
  avatarUrl,
  onToggleDarkMode,
}: BurgerMenuProps) {
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(theme === "dark");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const items = [
    { label: "Account Settings", link: "/settings" },
    { label: "Saved Recipes", link: "/saved" },
    {
      label: isDark ? "Light Mode" : "Dark Mode",
      onClick: (e: MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        onToggleDarkMode();
        setIsDark((prev) => !prev);
      },
    },
    {
      label: username !== null ? "Logout" : "Login",
      link: "",
      onClick: () => (username !== null ? logout() : navigate("/auth")),
    },
  ];
  return (
    <>
      {!isMenuOpen && (
        <div>
          <Menu onClick={() => setIsMenuOpen((prev) => !prev)} />
        </div>
      )}
      {isMenuOpen && (
        <div className={styles.overlay} onClick={() => setIsMenuOpen(false)}>
          <div className={styles.menuContainer}>
            <X
              className={styles.closeIcon}
              onClick={() => setIsMenuOpen(false)}
            />
            <div
              className={styles.profileSection}
              onClick={() => navigate("/profile")}
            >
              <div className={styles.avatar}>
                <img
                  src={
                    avatarUrl
                      ? `${profileURL}${avatarUrl}`
                      : "/defaultAvatar.png"
                  }
                  alt="User Avatar"
                />
              </div>
              <div className={styles.info}>
                <div>{displayName || "Guest"}</div>
                <div>{username === null ? "" : `@${username}`}</div>
              </div>
            </div>
            <div className={styles.menuItems}>
              {items.map((item, index) => (
                <a key={index} href={item.link} onClick={item.onClick}>
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
