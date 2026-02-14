import { lazy, ComponentType } from "react";

type ModuleDefault = { default: ComponentType<any> };

export function lazyWithRetry(importFn: () => Promise<ModuleDefault>) {
  return lazy(() =>
    importFn().catch((error) => {
      const key = "chunk_reload_" + btoa(error?.message || "unknown").slice(0, 20);
      const hasReloaded = sessionStorage.getItem(key);

      if (!hasReloaded) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
        // Return a never-resolving promise so React doesn't render stale UI
        return new Promise<ModuleDefault>(() => {});
      }

      // Already reloaded once — let error boundary handle it
      throw error;
    })
  );
}
