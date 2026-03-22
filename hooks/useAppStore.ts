import { useEffect, useState } from "preact/hooks";
import { appStore } from "../stores/chat.ts";
import type { AppState } from "../stores/chat.ts";

/** Subscribe to a slice of AppState. Only re-renders when the selected value changes (shallow compare). */
export function useAppStore<T>(selector: (state: AppState) => T): T {
  const [value, setValue] = useState(() => selector(appStore.state));

  useEffect(() => {
    const unsub = appStore.subscribe(({ currentVal }) => {
      const next = selector(currentVal);
      setValue((prev) => (prev === next ? prev : next));
    });
    return unsub;
  }, []);

  return value;
}
