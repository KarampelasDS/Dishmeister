import styles from "./Header.module.css";
import AppLogo from "../AppLogo/AppLogo";
import UserMenu from "./UserMenu/UserMenu";
import BurgerMenu from "../BurgerMenu/BurgerMenu";
import Searchbar from "./Searchbar/Searchbar";
import NotificationBell from "../NotificationBell/NotificationBell";

export default function Header(props: any) {
  return (
    <div className={styles.HeaderContainer}>
      <div className={styles.appLogoContainerDesktop}>
        <AppLogo />
      </div>
      <div className={styles.searchBarContainerDesktop}>
        <Searchbar />
      </div>
      <div className={styles.userMenuContainerDesktop}>
        {props.userId && <NotificationBell userId={props.userId} />}
        <UserMenu
          username={props.displayName}
          avatarUrl={props.avatarUrl}
          onToggleDarkMode={props.onToggleDarkMode}
        />
      </div>
      <div className={styles.burgerMenu}>
        {props.userId && <NotificationBell userId={props.userId} />}
        <BurgerMenu
          onToggleDarkMode={props.onToggleDarkMode}
          username={props.username}
          displayName={props.displayName}
          avatarUrl={props.avatarUrl}
        />
      </div>
    </div>
  );
}
