import styles from "./Dock.module.css";
import { Home, Compass, SquarePlus, User, Bookmark } from "lucide-react";
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
    name: "Home",
  },
  {
    key: "explore",
    url: "/explore",
    icon: Compass,
    glowColor: "#3b82f6",
    activeColor: "#3b82f6",
    name: "Explore",
  },
  {
    key: "new",
    url: "/recipes/new",
    icon: SquarePlus,
    glowColor: "#f43f5e",
    activeColor: "#f43f5e",
    name: "New Recipe",
  },
  {
    key: "saved",
    url: "/saved",
    icon: Bookmark,
    glowColor: "#f59e0b",
    activeColor: "#f59e0b",
    name: "Saved Recipes",
  },
  {
    key: "profile",
    url: "/profiles/" + userId,
    icon: User,
    glowColor: "#8b5cf6",
    activeColor: "#8b5cf6",
    name: "Profile",
  },
];

export default function Dock({ currentUserId, currentUrl }: DockProps) {
  const navigate = useNavigate();
  const items = dockItems(currentUserId);

  return (
    <nav className={styles.container}>
      {items.map(({ key, url, icon: Icon, glowColor, activeColor, name }) => {
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
              <Icon size={36} />
            </div>
            <span className={styles.label}>{name}</span>
          </button>
        );
      })}
    </nav>
  );
}
