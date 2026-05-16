import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "../../supabase";
import styles from "./ReportModal.module.css";
import { useAuth } from "../../Context/AuthProvider";
import SuccessModal from "../SuccessModal/SuccessModal";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "recipe" | "comment" | "user";
  targetId: string;
}

const REPORT_REASONS = [
  "Inappropriate content",
  "Spam or misleading",
  "Hate speech or harassment",
  "Intellectual property violation",
  "Other",
];

export default function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [otherDetails, setOtherDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const { setIsAuthOpen, showError } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedReason) return;

    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsAuthOpen(true);
        setIsSubmitting(false);
        return;
      }

      const reportData: any = {
        reporter_id: user.id,
        reason:
          selectedReason === "Other"
            ? `Other: ${otherDetails}`
            : selectedReason,
      };

      if (targetType === "recipe") reportData.recipe_id = targetId;
      if (targetType === "comment") reportData.comment_id = targetId;
      if (targetType === "user") reportData.reported_user_id = targetId;

      const { error } = await supabase.from("reports").insert(reportData);

      if (error) throw error;

      setSuccess(true);
      setSelectedReason("");
      setOtherDetails("");
    } catch (error: any) {
      console.error("Error submitting report:", error);
      let msg = error.message || "Failed to submit report. Please try again.";

      // Handle unique constraint violations gracefully
      if (msg.includes("reports_reporter_id_recipe_id_idx")) {
        msg = "You have already reported this recipe.";
      } else if (msg.includes("reports_reporter_id_comment_id_idx")) {
        msg = "You have already reported this comment.";
      } else if (msg.includes("reports_reporter_id_reported_user_id_idx")) {
        msg = "You have already reported this user.";
      }

      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.wrapper} onClick={onClose}>
      {success && (
        <SuccessModal
          isOpen={success}
          onClose={() => {
            setSuccess(false);
            onClose();
          }}
          title="Report Submitted"
          message="Thank you for helping us keep Dishmeister safe. We will review this report shortly."
        />
      )}
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.scrollContent}>
          <div className={styles.header}>
            <div className={styles.iconCircle}>
              <AlertTriangle size={24} />
            </div>
            <h2 className={styles.title}>Report {targetType}</h2>
          </div>

          <p className={styles.subtitle}>
            Why are you reporting this {targetType}?
          </p>

          <div className={styles.optionsGrid}>
            {REPORT_REASONS.map((reason) => (
              <div
                key={reason}
                className={`${styles.option} ${selectedReason === reason ? styles.selected : ""}`}
                onClick={() => setSelectedReason(reason)}
              >
                <div className={styles.radioCircle} />
                <span className={styles.optionLabel}>{reason}</span>
              </div>
            ))}
          </div>

          {selectedReason === "Other" && (
            <textarea
              className={styles.textArea}
              placeholder="Please provide more details..."
              value={otherDetails}
              onChange={(e) => setOtherDetails(e.target.value)}
            />
          )}
        </div>

        <div className={styles.actions}>
          <button
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={
              !selectedReason ||
              isSubmitting ||
              (selectedReason === "Other" && !otherDetails.trim())
            }
          >
            {isSubmitting ? (
              <Loader2 className={styles.spin} size={20} />
            ) : (
              "Submit Report"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
