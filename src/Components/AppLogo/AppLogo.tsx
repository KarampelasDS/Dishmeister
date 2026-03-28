import styles from "./AppLogo.module.css";
import { useNavigate } from "react-router";

export default function AppLogo() {
  const navigate = useNavigate();
  return (
    <div onClick={() => navigate("/")} className={styles.title}>
      <div className={styles.iconWrapper}>
        <div className={styles.iconBadge}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className={styles.icon}
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
            <line x1="6" y1="17" x2="18" y2="17" />
          </svg>
        </div>
      </div>

      <span className={styles.text}>Dishmeister</span>
    </div>
  );
}
