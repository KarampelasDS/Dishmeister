import styles from "./ConfirmModal.module.css";

type ModalProps = {
  modalType?: "delete" | "report";
  onConfirm?: () => void;
  onCancel?: () => void;
};

export default function ConfirmModal({
  modalType,
  onConfirm,
  onCancel,
}: ModalProps) {
  return (
    <div className={styles.wrapper} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h1>Confirm Delete</h1>
        <p>
          {modalType === "delete"
            ? "Are you sure you want to delete this recipe?"
            : "Are you sure you want to report this recipe?"}
        </p>
        <button onClick={onConfirm}>Yes, Delete</button>
        <button onClick={onCancel}>No, Keep</button>
      </div>
    </div>
  );
}
