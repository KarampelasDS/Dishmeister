import { Menu } from "lucide-react";
import { useState } from "react";

export default function BurgerMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <>
      <div>
        <Menu onClick={() => setIsMenuOpen((prev) => !prev)} />
      </div>
      {isMenuOpen && <span>im open bro</span>}
    </>
  );
}
