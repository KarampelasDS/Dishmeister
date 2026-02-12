import styles from "./Button.module.css";

export default function Button(props: any) {
  return (
    <button
      disabled={!props.isActive}
      className={styles.Container}
      style={{
        color: props.textColor,
        fontSize: props.fontSize,
        backgroundColor: props.isActive
          ? props.backgroundColor
          : props.disabledBackgroundColor,
        border: props.outline,
        cursor: props.isActive ? "pointer" : "default",
      }}
      onClick={props.onButtonClick}
    >
      {props.text}
    </button>
  );
}
