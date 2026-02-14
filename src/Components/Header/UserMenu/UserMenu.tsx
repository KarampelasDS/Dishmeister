import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../supabase";
import { useNavigate } from "react-router";

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
    <div style={containerStyle} ref={menuRef}>
      <div style={triggerStyle} onClick={() => setOpen((prev) => !prev)}>
        <span>{username ? username : "Guest"}</span>

        <img
          src={
            avatarUrl ? `${avatarUrl}?t=${Date.now()}` : "/defaultAvatar.png"
          }
          alt="avatar"
          style={avatarStyle}
        />
      </div>

      {open && (
        <div style={dropdownStyle}>
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

/* ---------- styles ---------- */

const containerStyle: React.CSSProperties = {
  position: "relative",
};

const triggerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
};

const avatarStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: "50%",
  objectFit: "cover",
};

const dropdownStyle: React.CSSProperties = {
  position: "absolute",
  right: 0,
  top: "calc(100% + 8px)",
  background: "#1a1a1a",
  borderRadius: 12,
  minWidth: 220,
  boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
  overflow: "hidden",
};
