import styles from "./Button.module.css";
import { ReactNode } from "react";

interface ButtonProps {
  text?: string;
  children?: ReactNode;
  isActive?: boolean;
  textColor?: string;
  fontSize?: string;
  backgroundColor?: string;
  disabledBackgroundColor?: string;
  outline?: string;
  onButtonClick?: () => void;
  type?: "button" | "submit" | "reset";
}

export default function Button({
  text,
  children,
  isActive = true,
  textColor,
  fontSize,
  backgroundColor,
  disabledBackgroundColor,
  outline,
  onButtonClick,
  type,
}: ButtonProps) {
  const disabled = !isActive;

  return (
    <button
      type={type ?? "button"}
      disabled={disabled}
      className={styles.Container}
      style={{
        color: textColor,
        fontSize: fontSize,
        background: disabled ? disabledBackgroundColor : backgroundColor,
        border: outline,
        cursor: disabled ? "default" : "pointer",
      }}
      onClick={disabled ? undefined : onButtonClick}
    >
      {text ?? children}
    </button>
  );
}