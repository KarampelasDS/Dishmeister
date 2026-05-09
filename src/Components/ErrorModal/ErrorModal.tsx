import { XCircle } from "lucide-react";
import styles from "./ErrorModal.module.css";
import { useWebHaptics } from "web-haptics/react";
import { useEffect } from "react";

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
}

export default function ErrorModal({
  isOpen,
  onClose,
  title = "Something went wrong",
  message,
}: ErrorModalProps) {
  const { trigger } = useWebHaptics();

  useEffect(() => {
    trigger([
      { duration: 40, intensity: 0.7 },
      { delay: 40, duration: 40, intensity: 0.7 },
      { delay: 40, duration: 40, intensity: 0.9 },
      { delay: 40, duration: 50, intensity: 0.6 },
    ]);
  }, []);

  if (!isOpen) return null;

  return (
    <div className={styles.wrapper} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.iconCircle}>
          <XCircle size={40} strokeWidth={2.5} />
        </div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>
        <button className={styles.closeBtn} onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}
