import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "../../supabase";
import styles from "./ReportModal.module.css";
import ErrorModal from "../ErrorModal/ErrorModal";


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
  const [errorModal, setErrorModal] = useState({ open: false, message: "" });


  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedReason) return;
    
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert("You must be logged in to report content.");
        setIsSubmitting(false);
        return;
      }

      const reportData: any = {
        reporter_id: user.id,
        reason: selectedReason === "Other" ? `Other: ${otherDetails}` : selectedReason,
      };

      if (targetType === "recipe") reportData.recipe_id = targetId;
      if (targetType === "comment") reportData.comment_id = targetId;
      if (targetType === "user") reportData.reported_user_id = targetId;

      const { error } = await supabase
        .from("reports")
        .insert(reportData);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setSelectedReason("");
        setOtherDetails("");
      }, 2000);

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

      setErrorModal({ 
        open: true, 
        message: msg 
      });
    } finally {

      setIsSubmitting(false);
    }
  };


  return (
    <div className={styles.wrapper} onClick={onClose}>
      <ErrorModal 
        isOpen={errorModal.open} 
        onClose={() => setErrorModal({ ...errorModal, open: false })}
        message={errorModal.message}
      />
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {success ? (
          <div className={styles.scrollContent} style={{ textAlign: "center", padding: "2rem" }}>
            <div className={styles.iconCircle} style={{ margin: "0 auto 1.5rem", background: "rgba(34, 197, 94, 0.1)", color: "#22c55e" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className={styles.title}>Report Submitted</h2>
            <p className={styles.subtitle}>Thank you for helping us keep Dishmeister safe. We will review this report shortly.</p>
          </div>
        ) : (
          <>
            <div className={styles.scrollContent}>
              <div className={styles.header}>
                <div className={styles.iconCircle}>
                  <AlertTriangle size={24} />
                </div>
                <h2 className={styles.title}>Report {targetType}</h2>
              </div>

              <p className={styles.subtitle}>
                Why are you reporting this {targetType}? Your report is anonymous, 
                except if you're reporting an intellectual property infringement.
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
                disabled={!selectedReason || isSubmitting || (selectedReason === "Other" && !otherDetails.trim())}
              >
                {isSubmitting ? (
                  <Loader2 className={styles.spin} size={20} />
                ) : (
                  "Submit Report"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
