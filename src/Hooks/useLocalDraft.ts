// hooks/useLocalDraft.ts
import { useState, useEffect } from "react";

export function useLocalDraft<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // storage quota exceeded etc.
    }
  }, [key, state]);

  return [state, setState] as const;
}
