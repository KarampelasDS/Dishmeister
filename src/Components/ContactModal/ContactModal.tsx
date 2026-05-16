import React from "react";
import styles from "./ContactModal.module.css";
import { 
  Instagram, 
  Twitter, 
  Youtube, 
  Globe, 
  Facebook, 
  Link as LinkIcon, 
  Share2, 
  X, 
  ExternalLink,
  PlusCircle
} from "lucide-react";
import { Link } from "react-router-dom";

type SocialLink = {
  platform: string;
  url: string;
};

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  socialLinks: SocialLink[];
  isOwnProfile: boolean;
  displayName: string;
}

const PLATFORM_ICONS: Record<string, any> = {
  Instagram,
  Twitter,
  TikTok: Share2,
  YouTube: Youtube,
  Facebook,
  Website: Globe,
  Other: LinkIcon,
};

const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  socialLinks,
  isOwnProfile,
  displayName,
}) => {
  if (!isOpen) return null;

  const hasLinks = socialLinks && socialLinks.length > 0;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{isOwnProfile ? "Your Social Links" : `Connect with ${displayName}`}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.content}>
          {hasLinks ? (
            <div className={styles.linksGrid}>
              {socialLinks.map((link, idx) => {
                const Icon = PLATFORM_ICONS[link.platform] || LinkIcon;
                return (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkCard}
                  >
                    <div className={styles.platformIcon}>
                      <Icon size={24} />
                    </div>
                    <div className={styles.linkInfo}>
                      <span className={styles.platformName}>{link.platform}</span>
                      <span className={styles.urlPreview}>
                        {link.url.replace(/^https?:\/\/(www\.)?/, "")}
                      </span>
                    </div>
                    <ExternalLink size={16} className={styles.externalIcon} />
                  </a>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Share2 size={48} />
              </div>
              <p className={styles.emptyText}>
                {isOwnProfile
                  ? "You haven't added any contact links yet."
                  : `${displayName} hasn't added any contact links.`}
              </p>
              {isOwnProfile && (
                <Link to="/settings" className={styles.ctaButton}>
                  <PlusCircle size={18} />
                  <span>Add links now</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactModal;
