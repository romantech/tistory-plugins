import "./index.css";
import { getTistoryArticle } from "@/shared/article-selector";
import { runOnDocumentReady } from "@/shared/dom-ready";
import {
  DEFAULT_HEADING_SELECTOR,
  ensureHeadingId,
  getDecodedHash,
  getHeaderOffset,
  getHeadingSelector,
  scrollElementIntoViewWithOffset,
} from "@/shared/headings";
import { getTocConfig } from "@/shared/plugin-config";
import { ensurePluginStylesheet } from "@/shared/stylesheet";
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
  bindTooltipInteractions,
  buildEntries,
  cleanupCreatedElements,
  createRoot,
  createTooltip,
  type HeadingItem,
  hideTooltip,
  measureRootHeight,
  revealActiveEntry,
  setActive,
  setPendingVisibility,
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
  const LIST_CLASS = `${ROOT_CLASS}-list`;
  const LINK_CLASS = `${ROOT_CLASS}-link`;
  const LABEL_CLASS = `${ROOT_CLASS}-label`;
  const TOOLTIP_CLASS = `${ROOT_CLASS}-tooltip`;
  const TOOLTIP_VISIBLE_CLASS = "is-visible";
  const TRUNCATED_CLASS = "is-truncated";
  const ACTIVE_CLASS = "is-active";
  const NAVIGATION_LOCK_CLASS = "is-navigation-locked";
  const DEFAULT_PANEL_WIDTH = 252;
  const MIN_PANEL_WIDTH = 172;
  const MIN_DESKTOP_WIDTH = 1280;
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
    pendingClass: PENDING_CLASS,
    rootClass: ROOT_CLASS,
    scrollFadeEpsilon: SCROLL_FADE_EPSILON,
    tooltipClass: TOOLTIP_CLASS,
    tooltipVisibleClass: TOOLTIP_VISIBLE_CLASS,
    truncatedClass: TRUNCATED_CLASS,
  };

  function getResolvedHeadingSelector(): string {
    return getHeadingSelector(getTocConfig().levels, DEFAULT_HEADING_SELECTOR);
  }

  function getResolvedHeaderOffset(): number {
    return getHeaderOffset(getTocConfig().headerOffset);
  }

  function getHeadingLevel(heading: HTMLElement): number {
    return Number.parseInt(heading.tagName.slice(1), 10);
  }

  function getHeadingText(heading: HTMLElement): string {
    const clone = heading.cloneNode(true);
    if (!(clone instanceof HTMLElement)) {
      return heading.textContent?.trim() || "섹션";
    }

    clone.querySelectorAll(".rp-heading-anchor-marker").forEach((marker) => {
      marker.remove();
    });

    return clone.textContent?.trim() || "섹션";
  }

  function isEligibleHeading(heading: HTMLElement): boolean {
    return !heading.closest(BLOCKED_HEADING_ANCESTOR_SELECTOR);
  }

  function getHeadingItems(article: HTMLElement): HeadingItem[] {
    return Array.from(
      article.querySelectorAll<HTMLElement>(getResolvedHeadingSelector()),
    )
      .map((heading) => ({
        heading,
        text: getHeadingText(heading),
      }))
      .filter(
        ({ heading, text }) => isEligibleHeading(heading) && text.length > 0,
      );
  }

  function prefersReducedMotion(): boolean {
    return (
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
    );
  }

  function getViewportWidth(): number {
    return Math.max(window.innerWidth, document.documentElement.clientWidth, 0);
  }

  function parseRgb(color: string): string | null {
    const matches = color.match(/\d+(?:\.\d+)?/g);
    if (!matches || matches.length < 3) return null;

    return matches
      .slice(0, 3)
      .map((value) => `${Math.round(Number(value))}`)
      .join(" ");
  }

  function getRelativeLuminance(rgb: string): number {
    const channels = rgb
      .split(/\s+/)
      .map((value) => Number(value))
      .slice(0, 3)
      .map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.03928
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });

    const [red = 1, green = 1, blue = 1] = channels;
    return red * 0.2126 + green * 0.7152 + blue * 0.0722;
  }

  function hasVisibleBackground(color: string): boolean {
    if (!color || color === "transparent") return false;

    const matches = color.match(/\d+(?:\.\d+)?/g);
    if (!matches) return false;

    if (color.startsWith("rgba(") && matches.length >= 4) {
      return Number(matches[3]) > 0;
    }

    return true;
  }

  function getSurfaceColor(source: HTMLElement): string {
    const candidates = [
      source,
      source.parentElement,
      document.body,
      document.documentElement,
    ];

    for (const candidate of candidates) {
      if (!(candidate instanceof HTMLElement)) continue;

      const backgroundColor = getComputedStyle(candidate).backgroundColor;
      if (hasVisibleBackground(backgroundColor)) {
        return backgroundColor;
      }
    }

    return "rgb(255 255 255)";
  }

  function setPalette(root: HTMLElement, surfaceSource: HTMLElement): void {
    const styles = getComputedStyle(surfaceSource);
    const surfaceRgb =
      parseRgb(getSurfaceColor(surfaceSource)) ?? "255 255 255";

    root.style.setProperty(
      "--rp-toc-font-family",
      styles.fontFamily || "inherit",
    );
    root.style.setProperty(
      "--rp-toc-ink",
      parseRgb(styles.color) ?? "24 24 27",
    );
    root.style.setProperty("--rp-toc-surface", surfaceRgb);
    root.dataset.surfaceTone =
      getRelativeLuminance(surfaceRgb) < 0.22 ? "dark" : "light";
  }

  function findCommonAncestor(
    first: HTMLElement,
    second: HTMLElement,
    boundary: HTMLElement,
  ): HTMLElement {
    const ancestors = new Set<HTMLElement>();

    for (
      let node: HTMLElement | null = first;
      node && boundary.contains(node);
      node = node.parentElement
    ) {
      ancestors.add(node);
      if (node === boundary) break;
    }

    for (
      let node: HTMLElement | null = second;
      node && boundary.contains(node);
      node = node.parentElement
    ) {
      if (ancestors.has(node)) return node;
      if (node === boundary) break;
    }

    return boundary;
  }

  function getStickyScope(
    article: HTMLElement,
    headings: readonly HTMLElement[],
  ): HTMLElement {
    let scope = headings[0] ?? article;

    for (const heading of headings.slice(1)) {
      scope = findCommonAncestor(scope, heading, article);
    }

    return scope === article || !article.contains(scope) ? article : scope;
  }

  function getBottomBoundary(
    article: HTMLElement,
    scope: HTMLElement,
    entries: readonly TocEntry[],
  ): HTMLElement {
    const lastHeading = entries.at(-1)?.heading;
    if (!lastHeading) return scope;

    const candidates = Array.from(
      article.querySelectorAll<HTMLElement>(BOTTOM_BOUNDARY_SELECTOR),
    );

    for (const candidate of candidates) {
      const relation = lastHeading.compareDocumentPosition(candidate);
      if (relation & Node.DOCUMENT_POSITION_FOLLOWING) {
        return candidate;
      }
    }

    return scope;
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

    return resolveRootLayout(
      {
        bottomBoundaryRect:
          bottomBoundary === scope
            ? scopeRect
            : bottomBoundary.getBoundingClientRect(),
        headerOffset: getResolvedHeaderOffset(),
        rootHeight: measureRootHeight(root),
        scopeRect,
        useScopeBottomBoundary: bottomBoundary === scope,
        viewportHeight: Math.max(
          window.innerHeight,
          document.documentElement.clientHeight,
          0,
        ),
        viewportWidth: getViewportWidth(),
      },
      {
        defaultPanelWidth: DEFAULT_PANEL_WIDTH,
        minDesktopWidth: MIN_DESKTOP_WIDTH,
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
    const article = getTistoryArticle();
    if (!article) return null;

    const headingItems = getHeadingItems(article);
    if (headingItems.length < 2) return null;

    const usedIds = new Set<string>();
    const headings = headingItems.map(({ heading }) => heading);

    const scope = getStickyScope(article, headings);
    const entries = buildEntries({
      config: viewConfig,
      ensureHeadingId,
      getHeadingLevel,
      headingItems,
      root,
      usedIds,
    });

    if (entries.length < 2) {
      return null;
    }

    setPalette(root, scope);

    return {
      article,
      scope,
      bottomBoundary: getBottomBoundary(article, scope, entries),
      entries,
      currentActiveId: "",
    };
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
    setPendingVisibility(root, isInitialLayoutPending, viewConfig);

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

    function handleLinkActivation(entry: TocEntry): void {
      const headerOffset = getResolvedHeaderOffset();
      const destinationScrollTop = Math.max(
        0,
        window.scrollY +
          entry.heading.getBoundingClientRect().top -
          headerOffset,
      );

      try {
        history.replaceState(null, "", `#${entry.id}`);
      } catch {
        // 해시 갱신이 실패해도 스크롤은 계속한다.
      }

      navigationLock.lock(entry.id, destinationScrollTop);
      revealActiveEntry(root, entry, viewConfig, { behavior: "nearest" });
      scrollElementIntoViewWithOffset(
        entry.heading,
        headerOffset,
        prefersReducedMotion() ? "auto" : "smooth",
      );
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
      bindLinkInteractions(state.entries, handleLinkActivation);
      bindTooltipInteractions({
        config: viewConfig,
        entries: state.entries,
        root,
        tooltip,
      });
      return true;
    }

    function sync(): void {
      if (hasDetachedTargets(state) && !rebuildState()) {
        return;
      }

      const layout = getRootLayout(root, state.scope, state.bottomBoundary);
      applyResolvedRootLayout(root, layout);
      if (root.hidden) {
        navigationLock.clear();
        setPendingVisibility(root, isInitialLayoutPending, viewConfig);
        syncScrollFadeState(root, viewConfig);
        hideTooltip(tooltip, viewConfig);
        return;
      }

      syncTooltipState(state.entries, viewConfig);
      const activeId = resolveActiveId({
        activeId: findActiveId(state.entries),
        hashedId: findHashedEntry(state.entries)?.id,
        isInitialLayoutPending,
        lockedTargetId: navigationLock.getFrozenActiveId(),
      });
      const activeEntry = setActive(state.entries, activeId, viewConfig);
      if (!activeEntry) return;

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

    bindLinkInteractions(state.entries, handleLinkActivation);
    bindTooltipInteractions({
      config: viewConfig,
      entries: state.entries,
      root,
      tooltip,
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
    root.addEventListener(
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
