import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const scrollPositions = new Map<string, number>();

export function useScrollRestoration(skipPaths: string[] = []) {
  const { pathname } = useLocation();
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Continuously track scroll position for current pathname
  useEffect(() => {
    if (skipPaths.includes(pathname)) {
      window.scrollTo(0, 0);
      return;
    }

    const handleScroll = () => {
      {
        /*console.log(
        `[ScrollRestore] scroll event on ${pathname}: ${window.scrollY}`,
      );*/
      }
      scrollPositions.set(pathname, window.scrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  // Restore on pathname change
  useEffect(() => {
    const saved = scrollPositions.get(pathname) ?? 0;
    {
      /*console.log(
      `[ScrollRestore] 🔄 navigated to ${pathname}, saved position: ${saved}`,
    );
    console.log(
      `[ScrollRestore] 🗺️ map state:`,
      Object.fromEntries(scrollPositions),
    );*/
    }

    if (saved === 0) {
      window.scrollTo(0, 0);
      return;
    }

    if (retryRef.current) clearTimeout(retryRef.current);

    let attempts = 0;
    const MAX_ATTEMPTS = 20;

    const tryRestore = () => {
      const pageHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;
      {
        /*console.log(
        `[ScrollRestore] attempt ${attempts} | saved: ${saved} | scrollHeight: ${pageHeight} | canScroll: ${pageHeight - viewportHeight >= saved}`,
      );*/
      }

      if (pageHeight - viewportHeight >= saved) {
        window.scrollTo(0, saved);
        {
          /*console.log(
          `[ScrollRestore] ✅ restored to ${saved} on attempt ${attempts}`,
        );*/
        }
        return;
      }

      if (attempts < MAX_ATTEMPTS) {
        attempts++;
        retryRef.current = setTimeout(tryRestore, 50);
      } else {
        {
          /*console.log(
          `[ScrollRestore] ❌ gave up after ${MAX_ATTEMPTS} attempts, scrollHeight never reached ${saved}`,
        );*/
        }
      }
    };

    requestAnimationFrame(tryRestore);

    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [pathname]);
}
