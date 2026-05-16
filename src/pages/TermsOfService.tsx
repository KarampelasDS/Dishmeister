import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import styles from "./LegalPage.module.css";

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.backRow}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Back
        </button>
      </div>

      <header className={styles.header}>
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.updated}>Last Updated: May 16, 2026</p>
      </header>

      <main className={styles.content}>
        <p>
          By using Dishmeister ("the Service"), you agree to these terms. If you
          don't agree, don't use the Service.
        </p>

        <section className={styles.section}>
          <h2>1. Who can use Dishmeister</h2>
          <p>
            You must be at least 13 years old. By using the Service you confirm
            you meet this requirement.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Your account</h2>
          <p>
            You're responsible for keeping your account secure. Don't share your
            credentials. We can suspend or delete accounts that violate these
            terms.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. Your content</h2>
          <p>
            You own the recipes and content you post. By posting, you give us a
            license to display it on the Service. You're responsible for
            ensuring your content doesn't infringe anyone else's rights.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Prohibited conduct</h2>
          <p>
            Don't post illegal, harmful, or abusive content. Don't spam, harass
            other users, or attempt to exploit the Service.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. Limitation of liability</h2>
          <p>
            The Service is provided "as is." To the extent permitted by law, our
            liability is limited to the amount you paid us — which for a free
            service is €0.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Governing law</h2>
          <p>These terms are governed by the laws of Greece.</p>
        </section>

        <section className={styles.section}>
          <h2>7. Changes</h2>
          <p>
            We may update these terms. Continued use after changes means you
            accept them.
          </p>
        </section>

        <section className={styles.section}>
          <h2>8. Contact</h2>
          <p>
            Questions? Email{" "}
            <a href="mailto:24dimitris@gmail.com">24dimitris@gmail.com</a>
          </p>
        </section>
      </main>

      <footer className={styles.footer}>
        &copy; 2026 Dishmeister. All rights reserved.
      </footer>
    </div>
  );
}
