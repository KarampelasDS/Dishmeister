import styles from "./Dock.module.css";
import { Home, Compass, SquarePlus, Heart, User } from "lucide-react";
import { useNavigate } from "react-router";

interface DockProps {
  currentUserId: string | null;
  currentUrl: string;
}

const dockItems = (userId: string | null) => [
  {
    key: "home",
    url: "/",
    icon: Home,
    glowColor: "#f97316",
    activeColor: "#f97316",
  },
  {
    key: "explore",
    url: "/explore",
    icon: Compass,
    glowColor: "#3b82f6",
    activeColor: "#3b82f6",
  },
  {
    key: "new",
    url: "/recipes/new",
    icon: SquarePlus,
    glowColor: "#f97316",
    activeColor: "#f97316",
  },
  {
    key: "saved",
    url: "/saved",
    icon: Heart,
    glowColor: "#ef4444",
    activeColor: "#ef4444",
  },
  {
    key: "profile",
    url: "/profile/" + userId,
    icon: User,
    glowColor: "#f97316",
    activeColor: "#f97316",
  },
];

export default function Dock({ currentUserId, currentUrl }: DockProps) {
  const navigate = useNavigate();
  const items = dockItems(currentUserId);

  return (
    <nav className={styles.container}>
      {items.map(({ key, url, icon: Icon, glowColor, activeColor }) => {
        const isActive = currentUrl === url;
        return (
          <button
            key={key}
            className={styles.button}
            style={
              {
                ...(isActive
                  ? { borderColor: activeColor, color: activeColor }
                  : undefined),
                "--hover-color": glowColor,
              } as React.CSSProperties
            }
            onClick={() => navigate(url)}
          >
            <div className={styles.glow} style={{ background: glowColor }} />
            <div className={styles.inner}>
              <Icon size={22} />
            </div>
          </button>
        );
      })}
    </nav>
  );
}
