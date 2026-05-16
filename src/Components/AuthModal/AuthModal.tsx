import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Mail, Lock, Eye, EyeOff, ChefHat, X } from "lucide-react";
import { supabase } from "../../supabase";
import styles from "./AuthModal.module.css";
import Button from "../Button/Button";
import { useFeedCache } from "../../Context/FeedCacheContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { invalidateAll } = useFeedCache();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSuccess(null);
      setError(null);
      setIsForgotPassword(false);
      return;
    }
    invalidateAll();

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/settings?reset=true`,
      });
      if (error) throw error;
      setSuccess("Check your email for the password reset link!");
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      setLoading(true);

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          onClose();
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          onClose();
        } else {
          setSuccess("Welcome to Dishmeister! Please check your email to confirm your account.");
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose}>
          <X size={20} />
        </button>
        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.logo}>
            <ChefHat size={28} />
          </div>
          <h1>Dishmeister</h1>
          <p>Share your culinary creations with the world</p>
        </div>

        {/* TOGGLE */}
        <div className={styles.toggle}>
          <Button
            backgroundColor={
              isLogin
                ? "linear-gradient(135deg, #ff6a00, #ff2e2e)"
                : "var(--header-bg)"
            }
            textColor={isLogin ? "#fff" : "var(--text)"}
            onButtonClick={() => setIsLogin(true)}
            outline={!isLogin ? "2px solid var(--border)" : "0px"}
          >
            Login
          </Button>
          <Button
            backgroundColor={
              !isLogin
                ? "linear-gradient(135deg, #ff6a00, #ff2e2e)"
                : "var(--header-bg)"
            }
            textColor={!isLogin ? "#fff" : "var(--text)"}
            onButtonClick={() => setIsLogin(false)}
            outline={isLogin ? "2px solid var(--border)" : "0px"}
          >
            Sign Up
          </Button>
        </div>

        {/* FORM */}
        <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} className={styles.form}>
          {isForgotPassword && (
            <div className={styles.forgotHeader}>
              <h2>Reset Password</h2>
              <p>Enter your email address and we'll send you a link to reset your password.</p>
            </div>
          )}

          <label>Email Address</label>
          <div className={styles.inputWrapper}>
            <Mail size={18} />
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {!isForgotPassword && (
            <>
              <div className={styles.labelRow}>
                <label>Password</label>
                {isLogin && (
                  <button
                    type="button"
                    className={styles.forgotLink}
                    onClick={() => setIsForgotPassword(true)}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className={styles.inputWrapper}>
                <Lock size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.eye}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </>
          )}

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          <div className={styles.submit}>
            <Button
              backgroundColor={"linear-gradient(135deg, #ff6a00, #ff2e2e)"}
              textColor={"#fff"}
              isActive={!loading}
              outline="0px"
              type="submit"
            >
              {loading
                ? "Please wait..."
                : isForgotPassword
                  ? "Send Reset Link"
                  : isLogin
                    ? "Login"
                    : "Create Account"}
            </Button>
            {isForgotPassword && (
              <button
                type="button"
                className={styles.backLink}
                onClick={() => setIsForgotPassword(false)}
              >
                Back to Login
              </button>
            )}
          </div>

          <div className={styles.legalLinks}>
            By continuing, you agree to our{" "}
            <Link to="/terms-of-service" onClick={onClose}>
              Terms
            </Link>{" "}
            and{" "}
            <a
              href="https://app.termly.io/policy-viewer/policy.html?policyUUID=360c148b-116d-45e4-9614-0464a4ccc0ff"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
          </div>
        </form>

      </div>
    </div>
  );
}
