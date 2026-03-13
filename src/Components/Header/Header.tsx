import styles from "./Header.module.css";
import AppLogo from "../AppLogo/AppLogo";
import UserMenu from "./UserMenu/UserMenu";
import BurgerMenu from "../BurgerMenu/BurgerMenu";

export default function Header(props: any) {
  return (
    <div className={styles.HeaderContainer}>
      <div className={styles.appLogoContainerDesktop}>
        <AppLogo />
      </div>
      <div className={styles.searchBarContainerDesktop}>
        <h1>searchbar</h1>
      </div>
      <div className={styles.userMenuContainerDesktop}>
        <UserMenu
          username={props.username}
          avatarUrl={props.avatarUrl}
          onToggleDarkMode={props.onToggleDarkMode}
        />
      </div>
      <div className={styles.burgerMenu}>
        <BurgerMenu />
      </div>
    </div>
  );
}
