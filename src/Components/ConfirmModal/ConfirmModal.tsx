import styles from "./ConfirmModal.module.css";

type ModalProps = {
  modalType?: "delete" | "report" | "block";
  targetName?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

export default function ConfirmModal({
  modalType,
  targetName,
  onConfirm,
  onCancel,
}: ModalProps) {
  const isDelete = modalType === "delete";
  const isBlock = modalType === "block";

  return (
    <div className={styles.wrapper} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.iconRing}>
          {isDelete ? (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
          ) : isBlock ? (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          ) : (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          )}
        </div>

        <h2 className={styles.heading}>
          {isDelete
            ? "Delete recipe?"
            : isBlock
              ? `Block @${targetName}?`
              : "Report recipe?"}
        </h2>
        <p className={styles.body}>
          {isDelete
            ? "This will permanently remove the recipe and all its data. This action cannot be undone."
            : isBlock
              ? "They won't be able to see your profile or recipes, and you won't see theirs. You can unblock them at any time."
              : "Let us know you think this recipe violates our community guidelines. We'll review it shortly."}
        </p>

        <div className={styles.actions}>
          <button className={styles.confirmBtn} onClick={onConfirm}>
            {isDelete
              ? "Yes, delete recipe"
              : isBlock
                ? "Block"
                : "Yes, report recipe"}
          </button>
          <button className={styles.cancelBtn} onClick={onCancel}>
            {isBlock ? "Cancel" : "No, keep it"}
          </button>
        </div>
      </div>
    </div>
  );
}
