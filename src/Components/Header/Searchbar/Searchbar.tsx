import styles from "./Searchbar.module.css";
import { Search } from "lucide-react";
export default function Searchbar() {
  return (
    <div className={styles.searchbarContainer}>
      <div className={styles.searchbarWrapper}>
        <Search className={styles.searchbarIcon} />
        <input
          type="text"
          placeholder="Search recipes..."
          className={styles.searchbarInput}
        />
      </div>
    </div>
  );
}
