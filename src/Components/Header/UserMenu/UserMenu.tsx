import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../supabase";
import { useNavigate } from "react-router";
import styles from "./UserMenu.module.css";

const profileURL = import.meta.env.VITE_SUPABASE_PROFILE_BUCKET_URL as string;

type Props = {
  username: string;
  avatarUrl?: string | null;
  onToggleDarkMode?: () => void;
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

  return (
    <div className={styles.container} ref={menuRef}>
      <div className={styles.trigger} onClick={() => setOpen((prev) => !prev)}>
        <span>{username ? username : "Guest"}</span>

        <img
          src={avatarUrl ? `${profileURL}${avatarUrl}` : "/defaultAvatar.png"}
          alt="avatar"
          className={styles.avatar}
        />
      </div>

      {open && (
        <div className={styles.dropdown}>
          <MenuItem onClick={() => navigate("/settings")}>
            Account Settings
          </MenuItem>

          <MenuItem onClick={() => navigate("/saved")}>Saved Recipes</MenuItem>

          <MenuItem onClick={onToggleDarkMode}>Dark Mode</MenuItem>

          <MenuItem onClick={logout} style={{ color: "red" }}>
            Logout
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "12px 16px",
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
