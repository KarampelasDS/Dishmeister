import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import styles from "./LegalPage.module.css";
// @ts-ignore
import policyHtml from "./PrivacyPolicy.html?raw";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.backRow}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Back
        </button>
      </div>

      <div 
        className={styles.embeddedContent}
        dangerouslySetInnerHTML={{ __html: policyHtml }} 
      />
    </div>
  );
}
