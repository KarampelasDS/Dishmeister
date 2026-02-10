import styles from "./Header.module.css";
import AppLogo from "../AppLogo/AppLogo";

export default function Header(props: any) {
  return (
    <div className={styles.HeaderContainer}>
      <div>
        <AppLogo />
      </div>
      <div>
        <h1>searchbar</h1>
      </div>
      <div>
        <h1>User</h1>
      </div>
    </div>
  );
}
