// hooks/useLocalDraft.ts
import { useState, useEffect } from "react";

const DRAFT_TTL_MS = 10 * 60 * 1000;

type Persisted<T> = {
  data: T;
  savedAt: number;
};

export function useLocalDraft<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return initialValue;

      const parsed: Persisted<T> = JSON.parse(raw);

      // Support old format (pre-TTL drafts won't have `savedAt`)
      if (!parsed.savedAt) {
        localStorage.removeItem(key);
        return initialValue;
      }

      if (Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
        localStorage.removeItem(key);
        return initialValue;
      }

      return parsed.data;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      const persisted: Persisted<T> = { data: state, savedAt: Date.now() };
      localStorage.setItem(key, JSON.stringify(persisted));
    } catch {
      // storage quota exceeded etc.
    }
  }, [key, state]);

  return [state, setState] as const;
}
