import {
  Menu,
  X,
  Settings,
  Bookmark,
  Sun,
  Moon,
  LogOut,
  LogIn,
  Search,
} from "lucide-react";
import { useState, type MouseEvent } from "react";
import styles from "./BurgerMenu.module.css";
import { useTheme } from "../../Hooks/useTheme";
import { useNavigate } from "react-router";
import { supabase } from "../../supabase";
import { useAuth } from "../../Context/AuthProvider";
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
  const { setIsAuthOpen, showError } = useAuth();
  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(theme === "dark");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const openMenu = () => {
    setIsMenuOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    document.body.style.overflow = "";
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleSearchSubmit = () => {
    const q = searchValue.trim();
    closeMenu();
    if (q.length >= 3) {
      navigate(`/explore?q=${encodeURIComponent(q)}`);
    } else if (q.length >= 1) {
      showError("Please enter at least 3 characters.");
    } else {
      navigate("/explore");
    }
  };

  const items = [
    {
      label: "Account Settings",
      link: username != null ? "/settings" : undefined,
      onClick: username == null ? () => { closeMenu(); setIsAuthOpen(true); } : undefined,
      icon: <Settings size={24} />,
    },
    {
      label: "Saved Recipes",
      link: username != null ? "/saved" : undefined,
      onClick: username == null ? () => { closeMenu(); setIsAuthOpen(true); } : undefined,
      icon: <Bookmark size={24} />,
    },
    {
      label: isDark ? "Light Mode" : "Dark Mode",
      icon: isDark ? <Sun size={24} /> : <Moon size={24} />,
      onClick: (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        onToggleDarkMode();
        setIsDark((prev) => !prev);
      },
    },
    {
      label: username != null ? "Logout" : "Login",
      icon: username != null ? <LogOut size={24} /> : <LogIn size={24} />,
      onClick: (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        closeMenu();
        if (username != null) {
          logout();
        } else {
          setIsAuthOpen(true);
        }
      },
    },
  ];

  return (
    <>
      {!isMenuOpen && (
        <button
          className={styles.menuTrigger}
          onClick={openMenu}
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
      )}

      {isMenuOpen && (
        <div className={styles.overlay} onClick={closeMenu}>
          <div
            className={styles.menuContainer}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Profile */}
            <div className={styles.headerRow}>
              <div
                className={styles.profileSection}
                onClick={() => {
                  closeMenu();
                  navigate("/profile/" + username);
                }}
              >
                <div className={styles.avatarWrapper}>
                  <img
                    src={
                      avatarUrl
                        ? `${profileURL}${avatarUrl}`
                        : "/defaultAvatar.png"
                    }
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = "/defaultAvatar.png";
                    }}
                    alt="User Avatar"
                    className={styles.avatarImg}
                  />
                </div>
                <div className={styles.profileInfo}>
                  <span className={styles.displayName}>
                    {displayName || "Guest"}
                  </span>
                  {username != null ? (
                    <span className={styles.username}>@{username}</span>
                  ) : (
                    <span className={styles.username} onClick={(e) => { e.stopPropagation(); closeMenu(); setIsAuthOpen(true); }}>Click to log in</span>
                  )}
                </div>
              </div>
              {/* Close */}
              <button
                className={styles.closeBtn}
                onClick={closeMenu}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.divider} />

            {/* Search */}
            <div className={styles.searchRow}>
              <div className={styles.searchWrapper}>
                <Search size={15} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search recipes..."
                  className={styles.searchInput}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                />
              </div>
              <button className={styles.searchBtn} onClick={handleSearchSubmit}>
                Go
              </button>
            </div>

            <div className={styles.divider} />

            {/* Nav items */}
            <nav className={styles.menuItems}>
              {items.map((item, index) =>
                item.link ? (
                  <a
                    key={index}
                    href={item.link}
                    className={styles.menuItem}
                    onClick={() => closeMenu()}
                  >
                    <span className={styles.menuItemIcon}>{item.icon}</span>
                    <span>{item.label}</span>
                  </a>
                ) : (
                  <button
                    key={index}
                    className={styles.menuItem}
                    onClick={item.onClick}
                  >
                    <span className={styles.menuItemIcon}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ),
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
