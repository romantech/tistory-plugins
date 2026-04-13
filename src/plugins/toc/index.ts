import "./index.css";
import { runOnDocumentReady } from "@/shared/dom-ready";
import {
  DEFAULT_HEADING_SELECTOR,
  getDecodedHash,
  getHeaderOffset,
  getHeadingSelector,
  prefixGeneratedHeadingId,
} from "@/shared/headings";
import { getTocConfig } from "@/shared/plugin-config";
import { ensurePluginStylesheet } from "@/shared/stylesheet";
import { createTocState } from "./article-state";
import { createInitialNavigationController } from "./initial-navigation";
import { bindMobileDragging } from "./mobile-drag";
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
  bindScrollViewport,
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

    const prefixedHash = prefixGeneratedHeadingId(initialHash);
    return (
      entries.find((entry) => entry.id === initialHash) ??
      entries.find((entry) => entry.id === prefixedHash)
    );
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
        measureRootHeight: () => measureRootHeight(root),
        mobileAnchorBottom: getMobileAnchorBottom(root, viewportHeight),
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
    setPendingVisibility(root, isInitialLayoutPending, viewConfig);

    function getToggleButton(): HTMLButtonElement | null {
      return root.querySelector(`.${TOGGLE_BUTTON_CLASS}`);
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

    const initialNavigation = createInitialNavigationController({
      closeMobileExpansion,
      getHeaderOffset: getResolvedHeaderOffset,
      getState: () => state,
      navigationLock,
      pendingNavigationClass: PENDING_NAVIGATION_CLASS,
      pendingNavigationRootClass: PENDING_NAVIGATION_ROOT_CLASS,
      prefersReducedMotion,
      root,
      viewConfig,
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
        initialNavigation.handleLinkActivation,
        initialNavigation.primeLinkActivation,
      );
      bindTooltipInteractions({
        config: viewConfig,
        entries: state.entries,
        root,
        tooltip,
      });
      initialNavigation.restorePendingEntry();
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
        initialNavigation.getPendingEntryId() || activeId,
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
      initialNavigation.handleLinkActivation,
      initialNavigation.primeLinkActivation,
    );
    bindTooltipInteractions({
      config: viewConfig,
      entries: state.entries,
      root,
      tooltip,
    });
    bindMobileToggle(root, viewConfig, toggleMobileExpansion);
    bindMobileDragging({
      getHeaderOffset: getResolvedHeaderOffset,
      getViewportHeight,
      root,
      toggleButtonClass: TOGGLE_BUTTON_CLASS,
    });
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

  runOnDocumentReady(init);
})();
