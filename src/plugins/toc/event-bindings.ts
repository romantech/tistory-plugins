import type { NavigationLockController } from "./navigation-lock";
import {
  bindScrollViewport,
  syncScrollFadeState,
  type TocViewConfig,
} from "./view";

type BindTocEventsOptions = {
  closeMobileExpansion: (options?: { focusToggle?: boolean }) => void;
  getIsMobileExpanded: () => boolean;
  handleLoad: () => void;
  navigationLock: NavigationLockController;
  root: HTMLElement;
  scheduleSync: () => void;
  viewConfig: TocViewConfig;
};

export function bindTocEvents({
  closeMobileExpansion,
  getIsMobileExpanded,
  handleLoad,
  navigationLock,
  root,
  scheduleSync,
  viewConfig,
}: BindTocEventsOptions): void {
  window.addEventListener(
    "scroll",
    () => {
      navigationLock.touchSettle();
      scheduleSync();
    },
    { passive: true },
  );
  window.addEventListener("resize", scheduleSync, { passive: true });
  window.addEventListener("load", handleLoad, { once: true });
  window.addEventListener("pageshow", scheduleSync);
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (
      !getIsMobileExpanded() ||
      root.hidden ||
      root.dataset.layout !== "mobile"
    ) {
      return;
    }

    closeMobileExpansion({ focusToggle: true });
  });
  document.addEventListener("pointerdown", (event) => {
    if (
      !getIsMobileExpanded() ||
      root.hidden ||
      root.dataset.layout !== "mobile"
    ) {
      return;
    }

    if (event.target instanceof Node && root.contains(event.target)) {
      return;
    }

    closeMobileExpansion();
  });
  bindScrollViewport(root, viewConfig, () => {
    syncScrollFadeState(root, viewConfig);
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", scheduleSync, {
      passive: true,
    });
  }

  if (document.fonts?.ready) {
    void document.fonts.ready.then(scheduleSync);
  }
}
