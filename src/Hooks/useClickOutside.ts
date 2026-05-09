import { useEffect, useRef } from "react";

/**
 * Hook that alerts clicks outside of the passed ref
 */
export function useClickOutside(handler: () => void) {
  const domNode = useRef<any>();

  useEffect(() => {
    const maybeHandler = (event: MouseEvent) => {
      if (domNode.current && !domNode.current.contains(event.target)) {
        handler();
      }
    };

    document.addEventListener("mousedown", maybeHandler);

    return () => {
      document.removeEventListener("mousedown", maybeHandler);
    };
  }, [handler]);

  return domNode;
}
