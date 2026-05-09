import { Check } from "lucide-react";
import styles from "./SuccessModal.module.css";
import { useWebHaptics } from "web-haptics/react";
import { useEffect } from "react";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
}

export default function SuccessModal({
  isOpen,
  onClose,
  title = "Success!",
  message,
}: SuccessModalProps) {
  const { trigger } = useWebHaptics();

  useEffect(() => {
    if (isOpen) {
      if ("vibrate" in navigator) {
        navigator.vibrate(40); // Success pattern
      } else {
        trigger([{ duration: 30 }, { delay: 60, duration: 40, intensity: 1 }]);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;


  return (
    <div className={styles.wrapper} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.iconCircle}>
          <Check size={32} strokeWidth={3} />
        </div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>
        <button className={styles.closeBtn} onClick={onClose}>
          Great!
        </button>
      </div>
    </div>
  );
}
