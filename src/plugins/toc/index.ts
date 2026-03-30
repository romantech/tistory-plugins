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

(() => {
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
  const CLICK_NAVIGATION_SETTLE_MS = 120;

  type HeadingItem = {
    heading: HTMLElement;
    text: string;
  };

  type TocEntry = {
    heading: HTMLElement;
    id: string;
    level: number;
    link: HTMLAnchorElement;
    label: HTMLSpanElement;
    text: string;
  };

  type TocState = {
    article: HTMLElement;
    scope: HTMLElement;
    bottomBoundary: HTMLElement;
    entries: TocEntry[];
    currentActiveId: string;
  };

  type PendingNavigation = {
    expiresAt: number;
    targetFreezeExpiresAt: number;
    frozenActiveId: string;
    destinationId: string;
  };

  type CreatedElement<T extends HTMLElement> = {
    element: T;
    created: boolean;
  };

  type RootLayout = {
    hidden: boolean;
    left?: number;
    top?: number;
    width?: number;
    safeTop?: number;
  };

  let initialized = false;
  let scheduledFrame = 0;

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

    root.style.setProperty(
      "--rp-toc-font-family",
      styles.fontFamily || "inherit",
    );
    root.style.setProperty(
      "--rp-toc-ink",
      parseRgb(styles.color) ?? "24 24 27",
    );
    root.style.setProperty(
      "--rp-toc-surface",
      parseRgb(getSurfaceColor(surfaceSource)) ?? "255 255 255",
    );
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

  function createRoot(): CreatedElement<HTMLElement> {
    const existingRoot = document.querySelector<HTMLElement>(`.${ROOT_CLASS}`);
    if (existingRoot) {
      return { element: existingRoot, created: false };
    }

    const root = document.createElement("nav");
    root.className = ROOT_CLASS;
    root.hidden = true;
    root.setAttribute("aria-label", "본문 목차");

    const list = document.createElement("ol");
    list.className = LIST_CLASS;
    root.append(list);

    document.body.append(root);
    return { element: root, created: true };
  }

  function createTooltip(): CreatedElement<HTMLElement> {
    const existingTooltip = document.querySelector<HTMLElement>(
      `.${TOOLTIP_CLASS}`,
    );
    if (existingTooltip) {
      return { element: existingTooltip, created: false };
    }

    const tooltip = document.createElement("div");
    tooltip.className = TOOLTIP_CLASS;
    tooltip.hidden = true;
    tooltip.setAttribute("role", "tooltip");

    document.body.append(tooltip);
    return { element: tooltip, created: true };
  }

  function getList(root: HTMLElement): HTMLOListElement {
    const list = root.querySelector(`.${LIST_CLASS}`);
    if (!(list instanceof HTMLOListElement)) {
      throw new Error("TOC list not found");
    }

    return list;
  }

  function buildEntries(
    root: HTMLElement,
    headingItems: HeadingItem[],
    usedIds: Set<string>,
  ): TocEntry[] {
    const list = getList(root);
    list.innerHTML = "";

    return headingItems.map(({ heading, text }) => {
      const id = ensureHeadingId(heading, usedIds);
      const level = getHeadingLevel(heading);

      const item = document.createElement("li");
      item.className = `${ROOT_CLASS}-item`;

      const link = document.createElement("a");
      link.className = LINK_CLASS;
      link.href = `#${id}`;
      link.dataset.level = `${level}`;
      link.dataset.tooltip = text;
      link.setAttribute("aria-label", text);

      const label = document.createElement("span");
      label.className = LABEL_CLASS;
      label.textContent = text;

      link.append(label);

      item.append(link);
      list.append(item);

      return {
        heading,
        id,
        level,
        link,
        label,
        text,
      };
    });
  }

  function syncTooltipState(entries: TocEntry[]): void {
    for (const entry of entries) {
      const isTruncated = entry.label.scrollWidth > entry.label.clientWidth + 1;
      entry.link.classList.toggle(TRUNCATED_CLASS, isTruncated);
    }
  }

  function hideTooltip(tooltip: HTMLElement): void {
    tooltip.hidden = true;
    tooltip.classList.remove(TOOLTIP_VISIBLE_CLASS);
    tooltip.textContent = "";
  }

  function setPendingVisibility(root: HTMLElement, pending: boolean): void {
    root.classList.toggle(PENDING_CLASS, pending);
  }

  function syncScrollFadeState(root: HTMLElement): void {
    if (root.hidden) {
      delete root.dataset.scrollFade;
      return;
    }

    const viewportHeight = root.clientHeight;
    const maxScrollTop = Math.max(0, root.scrollHeight - viewportHeight);
    if (
      viewportHeight <= 0 ||
      maxScrollTop <= SCROLL_FADE_EPSILON ||
      Number.isNaN(maxScrollTop)
    ) {
      delete root.dataset.scrollFade;
      return;
    }

    const hasTopFade = root.scrollTop > SCROLL_FADE_EPSILON;
    const hasBottomFade = root.scrollTop < maxScrollTop - SCROLL_FADE_EPSILON;

    if (hasTopFade && hasBottomFade) {
      root.dataset.scrollFade = "both";
      return;
    }

    if (hasTopFade) {
      root.dataset.scrollFade = "top";
      return;
    }

    if (hasBottomFade) {
      root.dataset.scrollFade = "bottom";
      return;
    }

    delete root.dataset.scrollFade;
  }

  function measureRootHeight(root: HTMLElement): number {
    if (!root.hidden) {
      return Math.max(root.offsetHeight, root.clientHeight);
    }

    const previousVisibility = root.style.getPropertyValue("visibility");
    const previousPointerEvents = root.style.getPropertyValue("pointer-events");

    root.hidden = false;
    root.style.setProperty("visibility", "hidden");
    root.style.setProperty("pointer-events", "none");

    const height = Math.max(root.offsetHeight, root.clientHeight);

    root.hidden = true;

    if (previousVisibility) {
      root.style.setProperty("visibility", previousVisibility);
    } else {
      root.style.removeProperty("visibility");
    }

    if (previousPointerEvents) {
      root.style.setProperty("pointer-events", previousPointerEvents);
    } else {
      root.style.removeProperty("pointer-events");
    }

    return height;
  }

  function positionTooltip(
    tooltip: HTMLElement,
    link: HTMLAnchorElement,
    root: HTMLElement,
  ): void {
    const linkRect = link.getBoundingClientRect();
    const viewportWidth = Math.max(
      window.innerWidth,
      document.documentElement.clientWidth,
      0,
    );
    const viewportHeight = Math.max(
      window.innerHeight,
      document.documentElement.clientHeight,
      0,
    );
    const gap = 10;
    const padding = 16;
    const rootLeft = Number.parseFloat(
      root.style.getPropertyValue("--rp-toc-left") || "0",
    );
    const maxWidth = Math.min(320, Math.max(180, viewportWidth - padding * 2));

    tooltip.style.setProperty("--rp-toc-tooltip-max-width", `${maxWidth}px`);
    tooltip.style.left = "0px";
    tooltip.style.top = "0px";

    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    const spaceRight = viewportWidth - linkRect.right - padding;
    const placeRight = spaceRight >= tooltipWidth || rootLeft <= tooltipWidth;
    const left = placeRight
      ? Math.min(linkRect.right + gap, viewportWidth - tooltipWidth - padding)
      : Math.max(padding, linkRect.left - tooltipWidth - gap);
    const top = Math.min(
      Math.max(padding, linkRect.top + linkRect.height / 2 - tooltipHeight / 2),
      viewportHeight - tooltipHeight - padding,
    );

    tooltip.dataset.side = placeRight ? "right" : "left";
    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
  }

  function bindTooltipInteractions(
    entries: TocEntry[],
    root: HTMLElement,
    tooltip: HTMLElement,
  ): void {
    const syncTooltipPalette = (): void => {
      tooltip.style.setProperty(
        "--rp-toc-font-family",
        root.style.getPropertyValue("--rp-toc-font-family"),
      );
      tooltip.style.setProperty(
        "--rp-toc-ink",
        root.style.getPropertyValue("--rp-toc-ink"),
      );
      tooltip.style.setProperty(
        "--rp-toc-surface",
        root.style.getPropertyValue("--rp-toc-surface"),
      );
    };

    const showTooltip = (entry: TocEntry): void => {
      if (!entry.link.classList.contains(TRUNCATED_CLASS)) {
        hideTooltip(tooltip);
        return;
      }

      syncTooltipPalette();
      tooltip.textContent = entry.text;
      tooltip.hidden = false;
      tooltip.classList.add(TOOLTIP_VISIBLE_CLASS);
      positionTooltip(tooltip, entry.link, root);
    };

    for (const entry of entries) {
      entry.link.addEventListener("mouseenter", () => {
        showTooltip(entry);
      });
      entry.link.addEventListener("focus", () => {
        showTooltip(entry);
      });
      entry.link.addEventListener("mouseleave", () => {
        hideTooltip(tooltip);
      });
      entry.link.addEventListener("blur", () => {
        hideTooltip(tooltip);
      });
      entry.link.addEventListener("click", () => {
        hideTooltip(tooltip);
      });
    }

    if (root.dataset.tooltipBound !== "true") {
      root.dataset.tooltipBound = "true";
      root.addEventListener("mouseleave", () => {
        hideTooltip(tooltip);
      });
    }
  }

  function setActive(
    entries: TocEntry[],
    activeId: string,
  ): TocEntry | undefined {
    let activeEntry: TocEntry | undefined;

    for (const entry of entries) {
      const isActive = entry.id === activeId;
      entry.link.classList.toggle(ACTIVE_CLASS, isActive);

      if (isActive) {
        activeEntry = entry;
        entry.link.setAttribute("aria-current", "location");
      } else {
        entry.link.removeAttribute("aria-current");
      }
    }

    return activeEntry;
  }

  function revealActiveEntry(
    root: HTMLElement,
    entry: TocEntry,
    options: {
      behavior?: "center" | "nearest";
      force?: boolean;
    } = {},
  ): void {
    const viewportHeight = root.clientHeight;
    const maxScrollTop = Math.max(0, root.scrollHeight - viewportHeight);
    if (viewportHeight <= 0 || maxScrollTop <= 0) return;

    const { behavior = "center", force = false } = options;
    const entryTop = entry.link.offsetTop;
    const entryHeight = Math.max(entry.link.offsetHeight, 20);
    const entryBottom = entryTop + entryHeight;
    const currentScrollTop = root.scrollTop;
    const revealPadding = 18;
    const visibleTop = currentScrollTop + revealPadding;
    const visibleBottom = currentScrollTop + viewportHeight - revealPadding;

    if (!force && entryTop >= visibleTop && entryBottom <= visibleBottom) {
      return;
    }

    let nextScrollTop = currentScrollTop;

    if (behavior === "nearest") {
      if (entryTop < visibleTop) {
        nextScrollTop = entryTop - revealPadding;
      } else if (entryBottom > visibleBottom) {
        nextScrollTop = entryBottom - viewportHeight + revealPadding;
      } else {
        return;
      }
    } else {
      nextScrollTop = Math.round(entryTop - (viewportHeight - entryHeight) / 2);
    }

    nextScrollTop = Math.min(maxScrollTop, Math.max(0, nextScrollTop));

    if (Math.abs(nextScrollTop - currentScrollTop) <= 1) return;
    root.scrollTop = nextScrollTop;
    syncScrollFadeState(root);
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
    const viewportWidth = getViewportWidth();
    const viewportHeight = Math.max(
      window.innerHeight,
      document.documentElement.clientHeight,
      0,
    );
    const scopeRect = scope.getBoundingClientRect();
    const bottomBoundaryRect = bottomBoundary.getBoundingClientRect();
    const maxPanelWidth = viewportWidth - RIGHT_RAIL_GUTTER - VIEWPORT_GUTTER;
    const panelWidth = Math.min(DEFAULT_PANEL_WIDTH, maxPanelWidth);
    const left = viewportWidth - RIGHT_RAIL_GUTTER - panelWidth;
    const articleGap = left - scopeRect.right;
    const safeTop = getResolvedHeaderOffset() + SAFE_TOP_GAP;
    const shouldShow =
      viewportWidth >= MIN_DESKTOP_WIDTH &&
      scopeRect.width >= 480 &&
      scopeRect.right > 0 &&
      scopeRect.bottom > 0 &&
      scopeRect.top < viewportHeight &&
      panelWidth >= MIN_PANEL_WIDTH &&
      articleGap >= PANEL_GAP;

    if (!shouldShow) {
      return { hidden: true };
    }

    const rootHeight = measureRootHeight(root);
    const desiredTop = Math.max(
      safeTop,
      Math.round(viewportHeight / 2 - rootHeight / 2),
    );
    const clampEdge =
      bottomBoundary === scope ? scopeRect.bottom : bottomBoundaryRect.bottom;
    const maxTop = Math.round(clampEdge - rootHeight - SAFE_TOP_GAP);
    const revealTop = Math.max(safeTop, Math.round(scopeRect.top));
    const centeredTop = Math.min(desiredTop, maxTop);
    const resolvedTop =
      maxTop < revealTop ? maxTop : Math.max(revealTop, centeredTop);

    if (resolvedTop + rootHeight <= 0) {
      return { hidden: true };
    }

    return {
      hidden: false,
      left: Math.round(left),
      top: resolvedTop,
      width: Math.round(panelWidth),
      safeTop: Math.round(safeTop),
    };
  }

  function applyRootLayout(root: HTMLElement, layout: RootLayout): void {
    if (layout.hidden) {
      root.hidden = true;
      syncScrollFadeState(root);
      return;
    }

    root.hidden = false;
    root.style.setProperty("--rp-toc-left", `${layout.left}px`);
    root.style.setProperty("--rp-toc-top", `${layout.top}px`);
    root.style.setProperty("--rp-toc-width", `${layout.width}px`);
    root.style.setProperty("--rp-toc-safe-top", `${layout.safeTop}px`);
  }

  function bindLinkInteractions(
    entries: TocEntry[],
    handleLinkActivation: (entry: TocEntry) => void,
  ): void {
    for (const entry of entries) {
      entry.link.addEventListener("click", (event) => {
        event.preventDefault();
        const isPointerActivation = event.detail > 0;
        handleLinkActivation(entry);

        if (isPointerActivation) {
          entry.link.blur();
        }
      });
    }
  }

  function createState(root: HTMLElement): TocState | null {
    const article = getTistoryArticle();
    if (!article) return null;

    const headingItems = getHeadingItems(article);
    if (headingItems.length < 2) return null;

    const usedIds = new Set<string>();
    const headings = headingItems.map(({ heading }) => heading);

    const scope = getStickyScope(article, headings);
    const entries = buildEntries(root, headingItems, usedIds);

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

  function hasDetachedTargets(state: TocState): boolean {
    if (!state.article.isConnected || !state.scope.isConnected) {
      return true;
    }

    if (!state.bottomBoundary.isConnected) {
      return true;
    }

    return state.entries.some(({ heading }) => !heading.isConnected);
  }

  function init(): void {
    if (initialized) return;
    initialized = true;

    if (document.querySelector(`.${ROOT_CLASS}`)) return;

    const { element: root, created: rootCreated } = createRoot();
    const { element: tooltip, created: tooltipCreated } = createTooltip();
    let isInitialLayoutPending = document.readyState !== "complete";
    let pendingNavigation: PendingNavigation | null = null;
    let pendingNavigationTimer = 0;
    let pendingNavigationSettleTimer = 0;
    const initialState = createState(root);
    if (!initialState) {
      if (rootCreated) root.remove();
      if (tooltipCreated) tooltip.remove();
      return;
    }
    let state: TocState = initialState;
    setPendingVisibility(root, isInitialLayoutPending);

    const clearPendingNavigation = (): void => {
      if (pendingNavigationTimer) {
        window.clearTimeout(pendingNavigationTimer);
        pendingNavigationTimer = 0;
      }
      if (pendingNavigationSettleTimer) {
        window.clearTimeout(pendingNavigationSettleTimer);
        pendingNavigationSettleTimer = 0;
      }
      pendingNavigation = null;
      root.classList.remove(NAVIGATION_LOCK_CLASS);
      scheduleSync();
    };

    const isNavigationLockActive = (): boolean => {
      if (!pendingNavigation) return false;

      if (performance.now() > pendingNavigation.expiresAt) {
        clearPendingNavigation();
        return false;
      }

      return true;
    };

    const lockNavigationReveal = (destinationId: string): void => {
      if (pendingNavigationTimer) {
        window.clearTimeout(pendingNavigationTimer);
      }
      if (pendingNavigationSettleTimer) {
        window.clearTimeout(pendingNavigationSettleTimer);
      }

      pendingNavigation = {
        expiresAt: performance.now() + CLICK_NAVIGATION_LOCK_MS,
        targetFreezeExpiresAt: performance.now() + CLICK_TARGET_FREEZE_MS,
        frozenActiveId: state.currentActiveId,
        destinationId,
      };
      root.classList.add(NAVIGATION_LOCK_CLASS);
      pendingNavigationTimer = window.setTimeout(() => {
        clearPendingNavigation();
      }, CLICK_NAVIGATION_LOCK_MS);
      pendingNavigationSettleTimer = window.setTimeout(() => {
        if (hasReachedNavigationTarget()) {
          clearPendingNavigation();
          return;
        }

        pendingNavigationSettleTimer = 0;
      }, CLICK_NAVIGATION_SETTLE_MS);
    };

    const hasReachedNavigationTarget = (): boolean => {
      if (!pendingNavigation) return false;

      const targetEntry = state.entries.find(
        (entry) => entry.id === pendingNavigation.destinationId,
      );
      if (!targetEntry) return false;

      return (
        targetEntry.heading.getBoundingClientRect().top <=
        getResolvedHeaderOffset() + ACTIVE_OFFSET
      );
    };

    const touchNavigationSettle = (): void => {
      if (!pendingNavigation) return;

      if (pendingNavigationSettleTimer) {
        window.clearTimeout(pendingNavigationSettleTimer);
      }

      pendingNavigationSettleTimer = window.setTimeout(() => {
        if (hasReachedNavigationTarget()) {
          clearPendingNavigation();
          return;
        }

        pendingNavigationSettleTimer = 0;
      }, CLICK_NAVIGATION_SETTLE_MS);
    };

    const activateEntry = (
      entry: TocEntry,
      options: {
        revealBehavior?: "center" | "nearest";
      } = {},
    ): void => {
      state.currentActiveId = entry.id;
      setActive(state.entries, entry.id);
      revealActiveEntry(root, entry, {
        behavior: options.revealBehavior,
      });
    };

    const handleLinkActivation = (entry: TocEntry): void => {
      try {
        history.replaceState(null, "", `#${entry.id}`);
      } catch {
        // 해시 갱신이 실패해도 스크롤은 계속한다.
      }

      lockNavigationReveal(entry.id);
      scrollElementIntoViewWithOffset(
        entry.heading,
        getResolvedHeaderOffset(),
        prefersReducedMotion() ? "auto" : "smooth",
      );
    };

    const rebuildState = (): boolean => {
      const nextState = createState(root);
      if (!nextState) {
        clearPendingNavigation();
        root.hidden = true;
        syncScrollFadeState(root);
        hideTooltip(tooltip);
        return false;
      }

      state = nextState;
      hideTooltip(tooltip);
      bindLinkInteractions(state.entries, handleLinkActivation);
      bindTooltipInteractions(state.entries, root, tooltip);
      return true;
    };

    const sync = (): void => {
      if (hasDetachedTargets(state) && !rebuildState()) {
        return;
      }

      const layout = getRootLayout(root, state.scope, state.bottomBoundary);
      applyRootLayout(root, layout);
      if (root.hidden) {
        clearPendingNavigation();
        setPendingVisibility(root, isInitialLayoutPending);
        syncScrollFadeState(root);
        hideTooltip(tooltip);
        return;
      }

      syncTooltipState(state.entries);
      const lockedTargetId =
        isNavigationLockActive() &&
        pendingNavigation &&
        performance.now() <= pendingNavigation.targetFreezeExpiresAt
          ? pendingNavigation.frozenActiveId
          : undefined;
      const activeId = isInitialLayoutPending
        ? findHashedEntry(state.entries)?.id || findActiveId(state.entries)
        : lockedTargetId || findActiveId(state.entries);
      const activeEntry = setActive(state.entries, activeId);
      if (!activeEntry) return;

      if (activeEntry.id !== state.currentActiveId) {
        state.currentActiveId = activeEntry.id;

        if (!isNavigationLockActive()) {
          revealActiveEntry(root, activeEntry);
        }
      }

      syncScrollFadeState(root);
      setPendingVisibility(root, isInitialLayoutPending);
      if (isInitialLayoutPending) {
        hideTooltip(tooltip);
      }
    };

    const scheduleSync = (): void => {
      if (scheduledFrame) return;

      scheduledFrame = requestAnimationFrame(() => {
        scheduledFrame = 0;
        sync();
      });
    };

    const markInitialLayoutReady = (): void => {
      if (!isInitialLayoutPending) return;

      isInitialLayoutPending = false;
      scheduleSync();
    };

    bindLinkInteractions(state.entries, handleLinkActivation);
    bindTooltipInteractions(state.entries, root, tooltip);
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
        touchNavigationSettle();
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
        syncScrollFadeState(root);
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
