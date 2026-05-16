import styles from "./Toast.module.css";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  const Icon = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
  }[type];

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <div className={styles.iconWrapper}>
        <Icon size={20} />
      </div>
      <p className={styles.message}>{message}</p>
      <button
        className={styles.closeBtn}
        onClick={onClose}
        aria-label="Close toast"
      >
        <X size={16} />
      </button>
      <div className={styles.progressBar} />
    </div>
  );
}
