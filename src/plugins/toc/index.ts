import "./index.css";
import { runOnDocumentReady } from "@/shared/dom-ready";
import {
  DEFAULT_HEADING_SELECTOR,
  getDecodedHash,
  getHeaderOffset,
  getHeadingSelector,
  scrollElementIntoViewWithOffset,
} from "@/shared/headings";
import { getTocConfig } from "@/shared/plugin-config";
import { ensurePluginStylesheet } from "@/shared/stylesheet";
import { createTocState } from "./article-state";
import {
  createNavigationLockController,
  type NavigationLockController,
} from "./navigation-lock";
import {
  hasDetachedTargets,
  type RootLayout,
  resolveActiveId,
  resolveRootLayout,
  type TocEntry,
  type TocState,
} from "./runtime";
import {
  applyRootLayout as applyViewLayout,
  bindLinkInteractions,
  bindMobileToggle,
  bindTooltipInteractions,
  cleanupCreatedElements,
  createRoot,
  createTooltip,
  hideTooltip,
  measureRootHeight,
  revealActiveEntry,
  setActive,
  setMobileExpanded,
  setPendingVisibility,
  syncMobileToggleSummary,
  syncScrollFadeState,
  syncTooltipState,
  type TocViewConfig,
} from "./view";

const CURRENT_SCRIPT =
  document.currentScript instanceof HTMLScriptElement
    ? document.currentScript
    : null;

(() => {
  ensurePluginStylesheet("toc", CURRENT_SCRIPT);

  const ROOT_CLASS = "rp-toc";
  const PENDING_CLASS = `${ROOT_CLASS}--pending`;
  const PANEL_CLASS = `${ROOT_CLASS}-panel`;
  const SCROLL_VIEWPORT_CLASS = `${ROOT_CLASS}-scroll-viewport`;
  const LIST_CLASS = `${ROOT_CLASS}-list`;
  const LINK_CLASS = `${ROOT_CLASS}-link`;
  const LABEL_CLASS = `${ROOT_CLASS}-label`;
  const TOOLTIP_CLASS = `${ROOT_CLASS}-tooltip`;
  const TOGGLE_BUTTON_CLASS = `${ROOT_CLASS}-toggle`;
  const TOGGLE_LABEL_CLASS = `${ROOT_CLASS}-toggle-label`;
  const TOGGLE_SUMMARY_CLASS = `${ROOT_CLASS}-toggle-summary`;
  const TOOLTIP_VISIBLE_CLASS = "is-visible";
  const TRUNCATED_CLASS = "is-truncated";
  const ACTIVE_CLASS = "is-active";
  const NAVIGATION_LOCK_CLASS = "is-navigation-locked";
  const PENDING_NAVIGATION_CLASS = "is-pending-navigation";
  const PENDING_NAVIGATION_ROOT_CLASS = "is-navigation-pending";
  const DEFAULT_PANEL_WIDTH = 252;
  const MIN_PANEL_WIDTH = 172;
  const MIN_DESKTOP_WIDTH = 1280;
  const MIN_MOBILE_WIDTH = 320;
  const MIN_MOBILE_SCOPE_WIDTH = 220;
  const MIN_SCOPE_WIDTH = 480;
  const SCROLL_FADE_EPSILON = 1;
  const RELATED_CATEGORY_SELECTORS = [".another-category", ".another_category"];
  const BLOCKED_HEADING_ANCESTOR_SELECTOR = [
    ...RELATED_CATEGORY_SELECTORS,
    ".container_postbtn",
    "#comments",
    ".comments",
    ".comment-wrap",
    ".tt-box-comment",
    ".reply",
  ].join(", ");
  const BOTTOM_BOUNDARY_SELECTOR = RELATED_CATEGORY_SELECTORS.join(", ");
  const PANEL_GAP = 68;
  const VIEWPORT_GUTTER = 24;
  const RIGHT_RAIL_GUTTER = 32;
  const ACTIVE_OFFSET = 16;
  const SAFE_TOP_GAP = 24;
  const CLICK_NAVIGATION_LOCK_MS = 1400;
  const CLICK_TARGET_FREEZE_MS = 220;
  const CLICK_NAVIGATION_SETTLE_MS = 100;
  const INITIAL_CLICK_LAYOUT_CHECK_DELAY_MS = 100;
  const INITIAL_CLICK_LAYOUT_PROBE_FRAMES = 2;
  const INITIAL_CLICK_LAYOUT_QUIET_WINDOW_MS = 220;
  const INITIAL_CLICK_LAYOUT_STABLE_TOLERANCE = 2;
  const INITIAL_CLICK_LAYOUT_WAIT_TIMEOUT_MS = 2200;
  const LINK_ACTIVATION_PREWARM_DELAY_MS = 120;
  const CLICK_CORRECTION_POSITION_TOLERANCE = 6;
  const MOBILE_DRAG_THRESHOLD = 6;
  const MOBILE_DRAG_GUTTER = 12;

  let initialized = false;
  let scheduledFrame = 0;

  const viewConfig: TocViewConfig = {
    activeClass: ACTIVE_CLASS,
    labelClass: LABEL_CLASS,
    linkClass: LINK_CLASS,
    listClass: LIST_CLASS,
    panelClass: PANEL_CLASS,
    pendingClass: PENDING_CLASS,
    rootClass: ROOT_CLASS,
    scrollViewportClass: SCROLL_VIEWPORT_CLASS,
    scrollFadeEpsilon: SCROLL_FADE_EPSILON,
    tooltipClass: TOOLTIP_CLASS,
    tooltipVisibleClass: TOOLTIP_VISIBLE_CLASS,
    toggleButtonClass: TOGGLE_BUTTON_CLASS,
    toggleLabelClass: TOGGLE_LABEL_CLASS,
    toggleSummaryClass: TOGGLE_SUMMARY_CLASS,
    truncatedClass: TRUNCATED_CLASS,
  };

  function getResolvedHeadingSelector(): string {
    return getHeadingSelector(getTocConfig().levels, DEFAULT_HEADING_SELECTOR);
  }

  function getResolvedHeaderOffset(): number {
    return getHeaderOffset(getTocConfig().headerOffset);
  }

  function prefersReducedMotion(): boolean {
    return (
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
    );
  }

  function getViewportWidth(): number {
    return Math.max(window.innerWidth, document.documentElement.clientWidth, 0);
  }

  function getViewportHeight(): number {
    return Math.max(
      window.innerHeight,
      document.documentElement.clientHeight,
      0,
    );
  }

  function parsePixelValue(value: string, fallback = 0): number {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function getMobileAnchorHeight(root: HTMLElement): number {
    const toggleButton = root.querySelector(`.${TOGGLE_BUTTON_CLASS}`);
    if (!(toggleButton instanceof HTMLElement)) {
      return 44;
    }

    const computedHeight = parsePixelValue(
      getComputedStyle(toggleButton).height,
      44,
    );
    if (computedHeight > 0) {
      return computedHeight;
    }

    return Math.max(toggleButton.offsetHeight, toggleButton.clientHeight, 44);
  }

  function getMobileAnchorBottom(
    root: HTMLElement,
    viewportHeight: number,
  ): number {
    const bottomInset = parsePixelValue(getComputedStyle(root).bottom, 32);
    const offsetY = parsePixelValue(
      root.style.getPropertyValue("--rp-toc-mobile-offset-y"),
      0,
    );
    const anchorHeight = getMobileAnchorHeight(root);

    return viewportHeight - bottomInset + anchorHeight + offsetY;
  }

  function findActiveId(entries: TocEntry[]): string {
    const activationTop = getResolvedHeaderOffset() + ACTIVE_OFFSET;
    let active = entries[0]?.id ?? "";

    for (const entry of entries) {
      if (entry.heading.getBoundingClientRect().top <= activationTop) {
        active = entry.id;
      }
    }

    return active;
  }

  function findHashedEntry(entries: TocEntry[]): TocEntry | undefined {
    const initialHash = getDecodedHash();
    if (!initialHash) return undefined;

    return entries.find((entry) => entry.id === initialHash);
  }

  function getRootLayout(
    root: HTMLElement,
    scope: HTMLElement,
    bottomBoundary: HTMLElement,
  ): RootLayout {
    const scopeRect = scope.getBoundingClientRect();
    const viewportHeight = getViewportHeight();

    return resolveRootLayout(
      {
        bottomBoundaryRect:
          bottomBoundary === scope
            ? scopeRect
            : bottomBoundary.getBoundingClientRect(),
        headerOffset: getResolvedHeaderOffset(),
        mobileAnchorBottom: getMobileAnchorBottom(root, viewportHeight),
        rootHeight: measureRootHeight(root),
        scopeRect,
        useScopeBottomBoundary: bottomBoundary === scope,
        viewportHeight,
        viewportWidth: getViewportWidth(),
      },
      {
        defaultPanelWidth: DEFAULT_PANEL_WIDTH,
        minDesktopWidth: MIN_DESKTOP_WIDTH,
        minMobileScopeWidth: MIN_MOBILE_SCOPE_WIDTH,
        minMobileWidth: MIN_MOBILE_WIDTH,
        minPanelWidth: MIN_PANEL_WIDTH,
        minScopeWidth: MIN_SCOPE_WIDTH,
        panelGap: PANEL_GAP,
        rightRailGutter: RIGHT_RAIL_GUTTER,
        safeTopGap: SAFE_TOP_GAP,
        viewportGutter: VIEWPORT_GUTTER,
      },
    );
  }

  function applyResolvedRootLayout(
    root: HTMLElement,
    layout: RootLayout,
  ): void {
    applyViewLayout(root, layout, viewConfig);
  }

  function createState(root: HTMLElement): TocState | null {
    return createTocState({
      blockedHeadingAncestorSelector: BLOCKED_HEADING_ANCESTOR_SELECTOR,
      bottomBoundarySelector: BOTTOM_BOUNDARY_SELECTOR,
      headingSelector: getResolvedHeadingSelector(),
      root,
      viewConfig,
    });
  }

  function init(): void {
    if (initialized) return;
    initialized = true;

    if (document.querySelector(`.${ROOT_CLASS}`)) return;

    const { element: root, created: rootCreated } = createRoot(viewConfig);
    const { element: tooltip, created: tooltipCreated } =
      createTooltip(viewConfig);
    let isInitialLayoutPending = document.readyState !== "complete";
    const initialState = createState(root);
    if (!initialState) {
      cleanupCreatedElements(root, tooltip, {
        rootCreated,
        tooltipCreated,
      });
      return;
    }

    let state: TocState = initialState;
    let isMobileExpanded = false;
    let pendingInitialNavigationToken = 0;
    let pendingInitialNavigationEntryId: string | undefined;
    let cancelPendingInitialNavigation: (() => void) | null = null;
    setPendingVisibility(root, isInitialLayoutPending, viewConfig);

    const mobileDragState = {
      active: false,
      pointerId: -1,
      moved: false,
      startClientY: 0,
      startOffsetY: 0,
      baseTop: 0,
      height: 0,
    };

    function getToggleButton(): HTMLButtonElement | null {
      return root.querySelector(`.${TOGGLE_BUTTON_CLASS}`);
    }

    function getMobileOffset(property: string): number {
      const value = root.style.getPropertyValue(property).trim();
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    function setMobileOffset(x: number, y: number): void {
      root.style.setProperty("--rp-toc-mobile-offset-x", `${Math.round(x)}px`);
      root.style.setProperty("--rp-toc-mobile-offset-y", `${Math.round(y)}px`);
    }

    function clearMobileDrag(): void {
      mobileDragState.active = false;
      mobileDragState.pointerId = -1;
      root.dataset.mobilePressed = "false";
      root.dataset.mobileDragging = "false";
    }

    function bindMobileDragging(): void {
      const toggleButton = getToggleButton();
      if (!toggleButton || toggleButton.dataset.dragBound === "true") {
        return;
      }

      toggleButton.dataset.dragBound = "true";
      toggleButton.addEventListener(
        "click",
        (event) => {
          if (toggleButton.dataset.dragSuppressed !== "true") return;

          toggleButton.dataset.dragSuppressed = "false";
          event.preventDefault();
          event.stopImmediatePropagation();
        },
        { capture: true },
      );
      toggleButton.addEventListener("pointerdown", (event) => {
        if (
          root.hidden ||
          root.dataset.layout !== "mobile" ||
          event.button !== 0
        ) {
          return;
        }

        const rect = root.getBoundingClientRect();
        mobileDragState.active = true;
        mobileDragState.pointerId = "pointerId" in event ? event.pointerId : -1;
        mobileDragState.moved = false;
        mobileDragState.startClientY = event.clientY;
        mobileDragState.startOffsetY = getMobileOffset(
          "--rp-toc-mobile-offset-y",
        );
        mobileDragState.baseTop = rect.top;
        mobileDragState.height = rect.height;
        root.dataset.mobilePressed = "true";
        root.dataset.mobileDragging = "false";

        if (
          "setPointerCapture" in toggleButton &&
          mobileDragState.pointerId >= 0
        ) {
          try {
            toggleButton.setPointerCapture(mobileDragState.pointerId);
          } catch {
            // Pointer capture is best-effort.
          }
        }
      });
      toggleButton.addEventListener("pointermove", (event) => {
        if (
          !mobileDragState.active ||
          root.hidden ||
          root.dataset.layout !== "mobile"
        ) {
          return;
        }

        const deltaY = event.clientY - mobileDragState.startClientY;
        if (
          !mobileDragState.moved &&
          Math.abs(deltaY) < MOBILE_DRAG_THRESHOLD
        ) {
          return;
        }

        mobileDragState.moved = true;
        root.dataset.mobilePressed = "false";
        root.dataset.mobileDragging = "true";

        const visualViewport = window.visualViewport;
        const viewportHeight = Math.max(
          visualViewport?.height ?? 0,
          getViewportHeight(),
        );
        const viewportTopInset = Math.max(0, visualViewport?.offsetTop ?? 0);
        const minTopBoundary = Math.max(
          MOBILE_DRAG_GUTTER,
          viewportTopInset + getResolvedHeaderOffset(),
        );
        const nextTop = mobileDragState.baseTop + deltaY;
        const clampedTop = Math.min(
          Math.max(minTopBoundary, nextTop),
          Math.max(
            minTopBoundary,
            viewportHeight - mobileDragState.height - MOBILE_DRAG_GUTTER,
          ),
        );

        setMobileOffset(
          0,
          mobileDragState.startOffsetY + (clampedTop - mobileDragState.baseTop),
        );
      });

      const finishDragging = (): void => {
        if (!mobileDragState.active) return;

        const didMove = mobileDragState.moved;
        clearMobileDrag();

        if (!didMove) return;

        toggleButton.dataset.dragSuppressed = "true";
        window.setTimeout(() => {
          toggleButton.dataset.dragSuppressed = "false";
        }, 0);
      };

      toggleButton.addEventListener("pointerup", finishDragging);
      toggleButton.addEventListener("pointercancel", finishDragging);
      toggleButton.addEventListener("lostpointercapture", finishDragging);
    }

    function syncMobileExpansion(
      options: { focusToggle?: boolean } = {},
    ): void {
      if (root.hidden || root.dataset.layout !== "mobile") {
        isMobileExpanded = false;
        return;
      }

      setMobileExpanded(root, isMobileExpanded, viewConfig);
      syncScrollFadeState(root, viewConfig);

      if (!isMobileExpanded) {
        hideTooltip(tooltip, viewConfig);
        if (options.focusToggle) {
          getToggleButton()?.focus();
        }
        return;
      }

      const activeEntry = state.entries.find(
        (entry) => entry.id === state.currentActiveId,
      );
      if (!activeEntry) return;

      requestAnimationFrame(() => {
        if (
          root.hidden ||
          root.dataset.layout !== "mobile" ||
          !isMobileExpanded
        ) {
          return;
        }

        revealActiveEntry(root, activeEntry, viewConfig, {
          behavior: "nearest",
          force: true,
        });
      });
    }

    function closeMobileExpansion(
      options: { focusToggle?: boolean } = {},
    ): void {
      if (!isMobileExpanded && root.dataset.mobileExpanded !== "true") return;

      isMobileExpanded = false;

      if (root.hidden || root.dataset.layout !== "mobile") {
        return;
      }

      syncMobileExpansion(options);
    }

    function toggleMobileExpansion(): void {
      if (root.hidden || root.dataset.layout !== "mobile") return;

      isMobileExpanded = !isMobileExpanded;
      syncMobileExpansion();
    }

    function scheduleSync(): void {
      if (scheduledFrame) return;

      scheduledFrame = requestAnimationFrame(() => {
        scheduledFrame = 0;
        sync();
      });
    }

    const navigationLock: NavigationLockController =
      createNavigationLockController({
        activeOffset: ACTIVE_OFFSET,
        getHeaderOffset: getResolvedHeaderOffset,
        getState: () => state,
        navigationLockClass: NAVIGATION_LOCK_CLASS,
        root,
        scheduleSync,
        settleDelayMs: CLICK_NAVIGATION_SETTLE_MS,
        targetFreezeMs: CLICK_TARGET_FREEZE_MS,
        timeoutMs: CLICK_NAVIGATION_LOCK_MS,
      });

    function activateEntry(
      entry: TocEntry,
      options: {
        revealBehavior?: "center" | "nearest";
      } = {},
    ): void {
      state.currentActiveId = entry.id;
      setActive(state.entries, entry.id, viewConfig);
      revealActiveEntry(root, entry, viewConfig, {
        behavior: options.revealBehavior,
      });
    }

    function clearPendingInitialNavigation(): void {
      cancelPendingInitialNavigation?.();
      cancelPendingInitialNavigation = null;
      pendingInitialNavigationEntryId = undefined;
      root.classList.remove(PENDING_NAVIGATION_ROOT_CLASS);

      for (const entry of state.entries) {
        entry.link.classList.remove(PENDING_NAVIGATION_CLASS);
        entry.link.removeAttribute("aria-busy");
      }
    }

    function setPendingInitialNavigationEntry(entry: TocEntry): void {
      pendingInitialNavigationEntryId = entry.id;
      root.classList.add(PENDING_NAVIGATION_ROOT_CLASS);

      for (const currentEntry of state.entries) {
        const isPending = currentEntry.id === entry.id;
        currentEntry.link.classList.toggle(PENDING_NAVIGATION_CLASS, isPending);

        if (isPending) {
          currentEntry.link.setAttribute("aria-busy", "true");
        } else {
          currentEntry.link.removeAttribute("aria-busy");
        }
      }
    }

    function isEntryPositionAccurate(
      entry: TocEntry,
      tolerance = CLICK_CORRECTION_POSITION_TOLERANCE,
    ): boolean {
      return (
        Math.abs(
          entry.heading.getBoundingClientRect().top - getResolvedHeaderOffset(),
        ) <= tolerance
      );
    }

    function getEntryDocumentTop(entry: TocEntry): number {
      return window.scrollY + entry.heading.getBoundingClientRect().top;
    }

    function getLayoutShiftResourcesBeforeEntry(
      entry: TocEntry,
    ): HTMLElement[] {
      return Array.from(
        state.article.querySelectorAll("img, iframe, video, embed, object"),
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

    function getUnsettledLayoutShiftResourcesBeforeEntry(
      entry: TocEntry,
    ): HTMLElement[] {
      return getLayoutShiftResourcesBeforeEntry(entry).filter(
        resourceNeedsInitialNavigationWait,
      );
    }

    function primeLinkActivation(entry: TocEntry): void {
      for (const resource of getUnsettledLayoutShiftResourcesBeforeEntry(
        entry,
      )) {
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

    function resourceNeedsInitialNavigationWait(
      resource: HTMLElement,
    ): boolean {
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

    function startInitialNavigationLayoutWait(
      entry: TocEntry,
      resources: HTMLElement[],
      options: { hasObservedLayoutShift?: boolean } = {},
    ): void {
      const navigationToken = pendingInitialNavigationToken + 1;
      pendingInitialNavigationToken = navigationToken;
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
        if (cancelPendingInitialNavigation === cleanup) {
          cancelPendingInitialNavigation = null;
        }
      };

      const finish = (): void => {
        if (pendingInitialNavigationToken !== navigationToken) {
          cleanup();
          return;
        }

        cleanup();
        if (!hasObservedLayoutShift) return;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (pendingInitialNavigationToken !== navigationToken) return;
            correctLinkActivation(entry);
          });
        });
      };

      const markLayoutChanged = (): void => {
        hasObservedLayoutShift = true;
        lastChangeAt = performance.now();
      };

      const check = (): void => {
        if (pendingInitialNavigationToken !== navigationToken) {
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

      cancelPendingInitialNavigation = cleanup;

      for (const resource of resources) {
        primeInitialNavigationResource(resource);
        cleanupCallbacks.push(
          bindInitialNavigationResourceSettle(resource, markLayoutChanged),
        );
      }

      timeoutId = window.setTimeout(
        finish,
        INITIAL_CLICK_LAYOUT_WAIT_TIMEOUT_MS,
      );

      checkTimerId = window.setTimeout(
        check,
        INITIAL_CLICK_LAYOUT_CHECK_DELAY_MS,
      );
    }

    function probeInitialNavigationLayout(entry: TocEntry): void {
      const navigationToken = pendingInitialNavigationToken + 1;
      pendingInitialNavigationToken = navigationToken;
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

        if (cancelPendingInitialNavigation === cleanup) {
          cancelPendingInitialNavigation = null;
        }
      };

      const finish = (): void => {
        if (pendingInitialNavigationToken !== navigationToken) {
          cleanup();
          return;
        }

        cleanup();
      };

      const sample = (): void => {
        if (pendingInitialNavigationToken !== navigationToken) {
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

      cancelPendingInitialNavigation = cleanup;
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
      clearPendingInitialNavigation();
      const {
        behavior = prefersReducedMotion() ? "auto" : "smooth",
        closeMobile = true,
        skipIfAccurate = false,
        updateHistory = true,
      } = options;

      if (skipIfAccurate && isEntryPositionAccurate(entry)) {
        return;
      }

      const headerOffset = getResolvedHeaderOffset();
      const destinationScrollTop = Math.max(
        0,
        window.scrollY +
          entry.heading.getBoundingClientRect().top -
          headerOffset,
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

    function correctLinkActivation(entry: TocEntry): void {
      if (!document.contains(entry.heading) || isEntryPositionAccurate(entry)) {
        return;
      }

      scrollElementIntoViewWithOffset(
        entry.heading,
        getResolvedHeaderOffset(),
        prefersReducedMotion() ? "auto" : "smooth",
      );
    }

    function startLinkActivationWarmup(
      entry: TocEntry,
      resources: HTMLElement[],
    ): void {
      const navigationToken = pendingInitialNavigationToken + 1;
      pendingInitialNavigationToken = navigationToken;
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
        if (cancelPendingInitialNavigation === cleanup) {
          cancelPendingInitialNavigation = null;
        }
      };

      const activate = (): void => {
        if (pendingInitialNavigationToken !== navigationToken) {
          cleanup();
          return;
        }

        cleanup();
        performLinkActivation(entry);
        waitForInitialNavigationLayout(entry);
      };

      cancelPendingInitialNavigation = cleanup;

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
      clearPendingInitialNavigation();

      const unsettledResources =
        getUnsettledLayoutShiftResourcesBeforeEntry(entry);
      if (unsettledResources.length > 0) {
        startLinkActivationWarmup(entry, unsettledResources);
        return;
      }

      performLinkActivation(entry);
      waitForInitialNavigationLayout(entry);
    }

    function rebuildState(): boolean {
      const nextState = createState(root);
      if (!nextState) {
        navigationLock.clear();
        root.hidden = true;
        syncScrollFadeState(root, viewConfig);
        hideTooltip(tooltip, viewConfig);
        return false;
      }

      state = nextState;
      hideTooltip(tooltip, viewConfig);
      bindLinkInteractions(
        state.entries,
        handleLinkActivation,
        primeLinkActivation,
      );
      bindTooltipInteractions({
        config: viewConfig,
        entries: state.entries,
        root,
        tooltip,
      });
      if (pendingInitialNavigationEntryId) {
        const pendingEntry = state.entries.find(
          (entry) => entry.id === pendingInitialNavigationEntryId,
        );
        if (pendingEntry) {
          setPendingInitialNavigationEntry(pendingEntry);
        }
      }
      return true;
    }

    function sync(): void {
      if (hasDetachedTargets(state) && !rebuildState()) {
        return;
      }

      const previousLayout = root.dataset.layout;
      const layout = getRootLayout(root, state.scope, state.bottomBoundary);
      applyResolvedRootLayout(root, layout);
      if (
        previousLayout === "mobile" &&
        !layout.hidden &&
        layout.mode === "desktop"
      ) {
        const refinedLayout = getRootLayout(
          root,
          state.scope,
          state.bottomBoundary,
        );
        if (!refinedLayout.hidden && refinedLayout.mode === "desktop") {
          applyResolvedRootLayout(root, refinedLayout);
        }
      }

      if (root.hidden) {
        closeMobileExpansion();
        navigationLock.clear();
        setPendingVisibility(root, isInitialLayoutPending, viewConfig);
        syncScrollFadeState(root, viewConfig);
        hideTooltip(tooltip, viewConfig);
        return;
      }

      if (root.dataset.layout !== "mobile") {
        isMobileExpanded = false;
      } else {
        syncMobileExpansion();
      }

      syncTooltipState(state.entries, viewConfig);
      const activeId = resolveActiveId({
        activeId: findActiveId(state.entries),
        hashedId: findHashedEntry(state.entries)?.id,
        isInitialLayoutPending,
        lockedTargetId: navigationLock.getFrozenActiveId(),
      });
      const activeEntry = setActive(
        state.entries,
        pendingInitialNavigationEntryId || activeId,
        viewConfig,
      );
      if (!activeEntry) return;

      syncMobileToggleSummary(root, viewConfig, {
        activeText: activeEntry.text,
        entryCount: state.entries.length,
      });

      if (activeEntry.id !== state.currentActiveId) {
        state.currentActiveId = activeEntry.id;

        if (!navigationLock.isActive()) {
          revealActiveEntry(root, activeEntry, viewConfig);
        }
      }

      syncScrollFadeState(root, viewConfig);
      setPendingVisibility(root, isInitialLayoutPending, viewConfig);
      if (isInitialLayoutPending) {
        hideTooltip(tooltip, viewConfig);
      }
    }

    function markInitialLayoutReady(): void {
      if (!isInitialLayoutPending) return;

      isInitialLayoutPending = false;
      scheduleSync();
    }

    bindLinkInteractions(
      state.entries,
      handleLinkActivation,
      primeLinkActivation,
    );
    bindTooltipInteractions({
      config: viewConfig,
      entries: state.entries,
      root,
      tooltip,
    });
    bindMobileToggle(root, viewConfig, toggleMobileExpansion);
    bindMobileDragging();
    sync();

    const initialHash = getDecodedHash();
    const initialEntry = initialHash
      ? findHashedEntry(state.entries)
      : undefined;
    if (initialEntry) {
      activateEntry(initialEntry, { revealBehavior: "nearest" });
    }

    const handleLoad = (): void => {
      markInitialLayoutReady();
      scheduleSync();
    };

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
        !isMobileExpanded ||
        root.hidden ||
        root.dataset.layout !== "mobile"
      ) {
        return;
      }

      closeMobileExpansion({ focusToggle: true });
    });
    document.addEventListener("pointerdown", (event) => {
      if (
        !isMobileExpanded ||
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
    root.addEventListener(
      "scroll",
      () => {
        syncScrollFadeState(root, viewConfig);
      },
      { passive: true },
    );
    root.querySelector(`.${SCROLL_VIEWPORT_CLASS}`)?.addEventListener(
      "scroll",
      () => {
        syncScrollFadeState(root, viewConfig);
      },
      { passive: true },
    );

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", scheduleSync, {
        passive: true,
      });
    }

    if (document.fonts?.ready) {
      void document.fonts.ready.then(scheduleSync);
    }
  }

  runOnDocumentReady(init);
})();
