import styles from "./Header.module.css";
import AppLogo from "../AppLogo/AppLogo";
import UserMenu from "./UserMenu/UserMenu";

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
        <UserMenu username={props.username} avatarUrl={props.avatarUrl} />
      </div>
    </div>
  );
}
