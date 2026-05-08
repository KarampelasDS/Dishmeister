import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../supabase";
import { useNavigate } from "react-router";
import styles from "./UserMenu.module.css";
import { useTheme } from "../../../Hooks/useTheme";

import {
  Settings,
  Bookmark,
  Sun,
  Moon,
  LogOut,
  LogIn,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const profileURL = import.meta.env.VITE_SUPABASE_PROFILE_BUCKET_URL as string;

type Props = {
  username?: string;
  avatarUrl?: string | null;
  onToggleDarkMode: () => void;
};

export default function UserMenu({
  username,
  avatarUrl,
  onToggleDarkMode,
}: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(theme === "dark");

  return (
    <div className={styles.container} ref={menuRef}>
      {/* Trigger */}
      <div className={styles.trigger} onClick={() => setOpen((prev) => !prev)}>
        <span>{username || "Guest"}</span>

        <img
          src={avatarUrl ? `${profileURL}${avatarUrl}` : "/defaultAvatar.png"}
          alt="avatar"
          className={styles.avatar}
        />
        {open ? <ChevronDown /> : <ChevronUp />}
      </div>

      {/* Dropdown */}
      {open && (
        <div className={styles.dropdown}>
          <MenuItem
            icon={<Settings size={18} />}
            onClick={() => {
              setOpen(false);
              navigate("/settings");
            }}
          >
            Account Settings
          </MenuItem>

          <MenuItem
            icon={<Bookmark size={18} />}
            onClick={() => {
              setOpen(false);
              navigate("/saved");
            }}
          >
            Saved Recipes
          </MenuItem>

          <MenuItem
            icon={isDark ? <Sun size={18} /> : <Moon size={18} />}
            onClick={() => {
              onToggleDarkMode();
              setIsDark((prev) => !prev);
            }}
          >
            {isDark ? "Light Mode" : "Dark Mode"}
          </MenuItem>

          <MenuItem
            icon={username ? <LogOut size={18} /> : <LogIn size={18} />}
            onClick={() => {
              setOpen(false);
              if (username) {
                logout();
              } else {
                navigate("/auth");
              }
            }}
            style={{ color: "red" }}
          >
            {username ? "Logout" : "Login"}
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  children,
  onClick,
  style,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 16px",
        cursor: "pointer",
        ...style,
      }}
    >
      {icon && <span style={{ display: "flex" }}>{icon}</span>}
      <span>{children}</span>
    </div>
  );
}
