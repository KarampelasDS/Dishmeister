import styles from "./TopChefs.module.css";
import { Users } from "lucide-react";
import TopChefsItem from "../TopChefsItem/TopChefsItem";

type TopChef = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  follower_count: number;
  recipe_count: number;
};

type TopChefsProps = {
  chefs: TopChef[];
};

export default function TopChefs({ chefs }: TopChefsProps) {
  if (chefs.length == 0) return;
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Users color="#ff6900" size={30} />
        <span>Suggested Chefs</span>
      </div>
      <div className={styles.chefList}>
        {chefs.map((chef) => (
          <TopChefsItem key={chef.id} chef={chef} />
        ))}
      </div>
    </div>
  );
}
