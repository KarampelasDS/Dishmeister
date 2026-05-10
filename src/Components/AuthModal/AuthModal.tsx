import { useEffect, useState } from "react";
import { Mail, Lock, Eye, EyeOff, ChefHat } from "lucide-react";
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

  useEffect(() => {
    if (!isOpen) return;
    invalidateAll();

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
          setError(
            "Account created. Check your email to confirm before logging in.",
          );
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
    <div className={styles.overlay}>
      <div className={styles.modal}>
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
        <form onSubmit={handleSubmit} className={styles.form}>
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

          <label>Password</label>
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

          {error && <div className={styles.error}>{error}</div>}

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
                : isLogin
                  ? "Login"
                  : "Create Account"}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}
