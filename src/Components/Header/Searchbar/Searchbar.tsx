import styles from "./Searchbar.module.css";
import { Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../../Context/AuthProvider";
import { normalizeSearchQuery } from "../../../utils/searchUtils";

export default function Searchbar() {
  const navigate = useNavigate();
  const { showError } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchSubmit = () => {
    const cleanSearch = normalizeSearchQuery(searchTerm);

    if (cleanSearch.length >= 3) {
      navigate(`/explore?q=${encodeURIComponent(searchTerm.trim())}`);
    } else if (cleanSearch.length >= 1) {
      showError("Please enter at least 3 characters.");
    } else {
      navigate("/explore");
    }
  };

  return (
    <div className={styles.searchbarContainer}>
      <div className={styles.searchbarWrapper}>
        <Search className={styles.searchbarIcon} />
        <input
          type="text"
          placeholder="Search recipes..."
          className={styles.searchbarInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearchSubmit();
            }
          }}
        />
      </div>
    </div>
  );
}
