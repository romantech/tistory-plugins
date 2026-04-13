import { scrollElementIntoViewWithOffset } from "@/shared/headings";
import type { NavigationLockController } from "./navigation-lock";
import type { TocEntry, TocState } from "./runtime";
import { revealActiveEntry, type TocViewConfig } from "./view";

type CreateInitialNavigationControllerOptions = {
  closeMobileExpansion: () => void;
  getHeaderOffset: () => number;
  getState: () => TocState;
  navigationLock: NavigationLockController;
  pendingNavigationClass: string;
  pendingNavigationRootClass: string;
  prefersReducedMotion: () => boolean;
  root: HTMLElement;
  viewConfig: TocViewConfig;
};

export type InitialNavigationController = {
  getPendingEntryId: () => string | undefined;
  handleLinkActivation: (entry: TocEntry) => void;
  primeLinkActivation: (entry: TocEntry) => void;
  restorePendingEntry: () => void;
};

const LAYOUT_SHIFT_RESOURCE_SELECTOR = "img, iframe, video, embed, object";
const INITIAL_CLICK_LAYOUT_CHECK_DELAY_MS = 100;
const INITIAL_CLICK_LAYOUT_PROBE_FRAMES = 2;
const INITIAL_CLICK_LAYOUT_QUIET_WINDOW_MS = 220;
const INITIAL_CLICK_LAYOUT_STABLE_TOLERANCE = 2;
const INITIAL_CLICK_LAYOUT_WAIT_TIMEOUT_MS = 2200;
const LINK_ACTIVATION_PREWARM_DELAY_MS = 120;
const CLICK_CORRECTION_POSITION_TOLERANCE = 6;

export function createInitialNavigationController({
  closeMobileExpansion,
  getHeaderOffset,
  getState,
  navigationLock,
  pendingNavigationClass,
  pendingNavigationRootClass,
  prefersReducedMotion,
  root,
  viewConfig,
}: CreateInitialNavigationControllerOptions): InitialNavigationController {
  let pendingNavigationToken = 0;
  let pendingNavigationEntryId: string | undefined;
  let cancelPendingNavigation: (() => void) | null = null;

  function clear(): void {
    cancelPendingNavigation?.();
    cancelPendingNavigation = null;
    pendingNavigationEntryId = undefined;
    root.classList.remove(pendingNavigationRootClass);

    for (const entry of getState().entries) {
      entry.link.classList.remove(pendingNavigationClass);
      entry.link.removeAttribute("aria-busy");
    }
  }

  function setPendingEntry(entry: TocEntry): void {
    pendingNavigationEntryId = entry.id;
    root.classList.add(pendingNavigationRootClass);

    for (const currentEntry of getState().entries) {
      const isPending = currentEntry.id === entry.id;
      currentEntry.link.classList.toggle(pendingNavigationClass, isPending);

      if (isPending) {
        currentEntry.link.setAttribute("aria-busy", "true");
      } else {
        currentEntry.link.removeAttribute("aria-busy");
      }
    }
  }

  function getEntryDocumentTop(entry: TocEntry): number {
    return window.scrollY + entry.heading.getBoundingClientRect().top;
  }

  function getLayoutShiftResourcesBeforeEntry(entry: TocEntry): HTMLElement[] {
    return Array.from(
      getState().article.querySelectorAll(LAYOUT_SHIFT_RESOURCE_SELECTOR),
    ).filter((element): element is HTMLElement => {
      if (!(element instanceof HTMLElement) || !element.isConnected) {
        return false;
      }

      return Boolean(
        element.compareDocumentPosition(entry.heading) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });
  }

  function primeInitialNavigationResource(resource: HTMLElement): void {
    if (
      (resource instanceof HTMLImageElement ||
        resource instanceof HTMLIFrameElement) &&
      resource.loading === "lazy"
    ) {
      resource.loading = "eager";
    }

    if (
      resource instanceof HTMLVideoElement &&
      (!resource.preload || resource.preload === "none")
    ) {
      resource.preload = "metadata";
    }

    if (
      resource instanceof HTMLImageElement &&
      typeof resource.decode === "function"
    ) {
      void resource.decode().catch(() => undefined);
    }
  }

  function resourceNeedsInitialNavigationWait(resource: HTMLElement): boolean {
    if (resource instanceof HTMLImageElement) {
      return !resource.complete;
    }

    if (resource instanceof HTMLIFrameElement) {
      return resource.loading === "lazy";
    }

    if (resource instanceof HTMLVideoElement) {
      return resource.readyState < HTMLMediaElement.HAVE_METADATA;
    }

    return false;
  }

  function getUnsettledLayoutShiftResourcesBeforeEntry(
    entry: TocEntry,
  ): HTMLElement[] {
    return getLayoutShiftResourcesBeforeEntry(entry).filter(
      resourceNeedsInitialNavigationWait,
    );
  }

  function primeLinkActivation(entry: TocEntry): void {
    for (const resource of getUnsettledLayoutShiftResourcesBeforeEntry(entry)) {
      primeInitialNavigationResource(resource);
    }
  }

  function bindInitialNavigationResourceSettle(
    resource: HTMLElement,
    onSettled: () => void,
  ): () => void {
    const settleEventName =
      resource instanceof HTMLVideoElement ? "loadeddata" : "load";

    resource.addEventListener(settleEventName, onSettled, { once: true });
    resource.addEventListener("error", onSettled, { once: true });

    return () => {
      resource.removeEventListener(settleEventName, onSettled);
      resource.removeEventListener("error", onSettled);
    };
  }

  function isEntryPositionAccurate(
    entry: TocEntry,
    tolerance = CLICK_CORRECTION_POSITION_TOLERANCE,
  ): boolean {
    return (
      Math.abs(entry.heading.getBoundingClientRect().top - getHeaderOffset()) <=
      tolerance
    );
  }

  function correctLinkActivation(entry: TocEntry): void {
    if (!document.contains(entry.heading) || isEntryPositionAccurate(entry)) {
      return;
    }

    scrollElementIntoViewWithOffset(
      entry.heading,
      getHeaderOffset(),
      prefersReducedMotion() ? "auto" : "smooth",
    );
  }

  function startInitialNavigationLayoutWait(
    entry: TocEntry,
    resources: HTMLElement[],
    options: { hasObservedLayoutShift?: boolean } = {},
  ): void {
    const navigationToken = pendingNavigationToken + 1;
    pendingNavigationToken = navigationToken;
    const startTime = performance.now();
    let lastChangeAt = startTime;
    let lastDocumentTop = getEntryDocumentTop(entry);
    let hasObservedLayoutShift = options.hasObservedLayoutShift ?? false;
    const cleanupCallbacks: Array<() => void> = [];
    let timeoutId = 0;
    let checkTimerId = 0;
    let cleaned = false;

    if (resources.length === 0) {
      return;
    }

    const cleanup = (): void => {
      if (cleaned) return;
      cleaned = true;

      if (timeoutId) {
        window.clearTimeout(timeoutId);
        timeoutId = 0;
      }

      if (checkTimerId) {
        window.clearTimeout(checkTimerId);
        checkTimerId = 0;
      }

      for (const removeListener of cleanupCallbacks) {
        removeListener();
      }

      cleanupCallbacks.length = 0;
      if (cancelPendingNavigation === cleanup) {
        cancelPendingNavigation = null;
      }
    };

    const finish = (): void => {
      if (pendingNavigationToken !== navigationToken) {
        cleanup();
        return;
      }

      cleanup();
      if (!hasObservedLayoutShift) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (pendingNavigationToken !== navigationToken) return;
          correctLinkActivation(entry);
        });
      });
    };

    const markLayoutChanged = (): void => {
      hasObservedLayoutShift = true;
      lastChangeAt = performance.now();
    };

    const check = (): void => {
      if (pendingNavigationToken !== navigationToken) {
        cleanup();
        return;
      }

      if (!document.contains(entry.heading)) {
        cleanup();
        return;
      }

      const now = performance.now();
      const nextDocumentTop = getEntryDocumentTop(entry);
      if (
        Math.abs(nextDocumentTop - lastDocumentTop) >
        INITIAL_CLICK_LAYOUT_STABLE_TOLERANCE
      ) {
        lastDocumentTop = nextDocumentTop;
        markLayoutChanged();
      } else {
        lastDocumentTop = nextDocumentTop;
      }

      if (now - lastChangeAt >= INITIAL_CLICK_LAYOUT_QUIET_WINDOW_MS) {
        finish();
        return;
      }

      checkTimerId = window.setTimeout(
        check,
        INITIAL_CLICK_LAYOUT_CHECK_DELAY_MS,
      );
    };

    cancelPendingNavigation = cleanup;

    for (const resource of resources) {
      primeInitialNavigationResource(resource);
      cleanupCallbacks.push(
        bindInitialNavigationResourceSettle(resource, markLayoutChanged),
      );
    }

    timeoutId = window.setTimeout(finish, INITIAL_CLICK_LAYOUT_WAIT_TIMEOUT_MS);

    checkTimerId = window.setTimeout(
      check,
      INITIAL_CLICK_LAYOUT_CHECK_DELAY_MS,
    );
  }

  function probeInitialNavigationLayout(entry: TocEntry): void {
    const navigationToken = pendingNavigationToken + 1;
    pendingNavigationToken = navigationToken;
    let frameId = 0;
    let probeCount = 0;
    let cleaned = false;
    let lastDocumentTop = getEntryDocumentTop(entry);

    const cleanup = (): void => {
      if (cleaned) return;
      cleaned = true;

      if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }

      if (cancelPendingNavigation === cleanup) {
        cancelPendingNavigation = null;
      }
    };

    const finish = (): void => {
      if (pendingNavigationToken !== navigationToken) {
        cleanup();
        return;
      }

      cleanup();
    };

    const sample = (): void => {
      if (pendingNavigationToken !== navigationToken) {
        cleanup();
        return;
      }

      if (!document.contains(entry.heading)) {
        cleanup();
        return;
      }

      const nextDocumentTop = getEntryDocumentTop(entry);
      if (
        Math.abs(nextDocumentTop - lastDocumentTop) >
        INITIAL_CLICK_LAYOUT_STABLE_TOLERANCE
      ) {
        cleanup();
        startInitialNavigationLayoutWait(
          entry,
          getLayoutShiftResourcesBeforeEntry(entry),
          { hasObservedLayoutShift: true },
        );
        return;
      }

      lastDocumentTop = nextDocumentTop;
      probeCount += 1;

      if (probeCount >= INITIAL_CLICK_LAYOUT_PROBE_FRAMES) {
        finish();
        return;
      }

      frameId = requestAnimationFrame(sample);
    };

    cancelPendingNavigation = cleanup;
    frameId = requestAnimationFrame(sample);
  }

  function waitForInitialNavigationLayout(entry: TocEntry): void {
    const resources = getLayoutShiftResourcesBeforeEntry(entry);
    if (resources.length === 0) return;

    const unsettledResources = resources.filter(
      resourceNeedsInitialNavigationWait,
    );
    if (unsettledResources.length > 0) {
      startInitialNavigationLayoutWait(entry, unsettledResources);
      return;
    }

    probeInitialNavigationLayout(entry);
  }

  function performLinkActivation(
    entry: TocEntry,
    options: {
      behavior?: ScrollBehavior;
      closeMobile?: boolean;
      skipIfAccurate?: boolean;
      updateHistory?: boolean;
    } = {},
  ): void {
    clear();
    const {
      behavior = prefersReducedMotion() ? "auto" : "smooth",
      closeMobile = true,
      skipIfAccurate = false,
      updateHistory = true,
    } = options;

    if (skipIfAccurate && isEntryPositionAccurate(entry)) {
      return;
    }

    const headerOffset = getHeaderOffset();
    const destinationScrollTop = Math.max(
      0,
      window.scrollY + entry.heading.getBoundingClientRect().top - headerOffset,
    );

    if (updateHistory) {
      try {
        history.replaceState(null, "", `#${entry.id}`);
      } catch {
        // 해시 갱신이 실패해도 스크롤은 계속한다.
      }
    }

    navigationLock.lock(entry.id, destinationScrollTop);
    revealActiveEntry(root, entry, viewConfig, { behavior: "nearest" });
    if (closeMobile) {
      closeMobileExpansion();
    }
    scrollElementIntoViewWithOffset(entry.heading, headerOffset, behavior);
  }

  function startLinkActivationWarmup(
    entry: TocEntry,
    resources: HTMLElement[],
  ): void {
    const navigationToken = pendingNavigationToken + 1;
    pendingNavigationToken = navigationToken;
    setPendingEntry(entry);
    const cleanupCallbacks: Array<() => void> = [];
    let timeoutId = 0;
    let cleaned = false;
    let settledCount = 0;

    const cleanup = (): void => {
      if (cleaned) return;
      cleaned = true;

      if (timeoutId) {
        window.clearTimeout(timeoutId);
        timeoutId = 0;
      }

      for (const removeListener of cleanupCallbacks) {
        removeListener();
      }

      cleanupCallbacks.length = 0;
      if (cancelPendingNavigation === cleanup) {
        cancelPendingNavigation = null;
      }
    };

    const activate = (): void => {
      if (pendingNavigationToken !== navigationToken) {
        cleanup();
        return;
      }

      cleanup();
      performLinkActivation(entry);
      waitForInitialNavigationLayout(entry);
    };

    cancelPendingNavigation = cleanup;

    for (const resource of resources) {
      primeInitialNavigationResource(resource);
      cleanupCallbacks.push(
        bindInitialNavigationResourceSettle(resource, () => {
          settledCount += 1;
          if (settledCount >= resources.length) {
            activate();
          }
        }),
      );
    }

    timeoutId = window.setTimeout(activate, LINK_ACTIVATION_PREWARM_DELAY_MS);
  }

  function handleLinkActivation(entry: TocEntry): void {
    clear();

    const unsettledResources =
      getUnsettledLayoutShiftResourcesBeforeEntry(entry);
    if (unsettledResources.length > 0) {
      startLinkActivationWarmup(entry, unsettledResources);
      return;
    }

    performLinkActivation(entry);
    waitForInitialNavigationLayout(entry);
  }

  function restorePendingEntry(): void {
    if (!pendingNavigationEntryId) return;

    const pendingEntry = getState().entries.find(
      (entry) => entry.id === pendingNavigationEntryId,
    );
    if (pendingEntry) {
      setPendingEntry(pendingEntry);
    }
  }

  return {
    getPendingEntryId: () => pendingNavigationEntryId,
    handleLinkActivation,
    primeLinkActivation,
    restorePendingEntry,
  };
}
