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
  const LIST_CLASS = `${ROOT_CLASS}-list`;
  const LINK_CLASS = `${ROOT_CLASS}-link`;
  const LABEL_CLASS = `${ROOT_CLASS}-label`;
  const TOOLTIP_CLASS = `${ROOT_CLASS}-tooltip`;
  const TOOLTIP_VISIBLE_CLASS = "is-visible";
  const TRUNCATED_CLASS = "is-truncated";
  const ACTIVE_CLASS = "is-active";
  const DEFAULT_PANEL_WIDTH = 240;
  const MIN_PANEL_WIDTH = 172;
  const MIN_DESKTOP_WIDTH = 1280;
  const BLOCKED_HEADING_ANCESTOR_SELECTOR = [
    ".another-category",
    ".another_category",
    ".container_postbtn",
    "#comments",
    ".comments",
    ".comment-wrap",
    ".tt-box-comment",
    ".reply",
  ].join(", ");
  const BOTTOM_BOUNDARY_SELECTOR = ".revenue_unit_wrap";
  const PANEL_GAP = 68;
  const VIEWPORT_GUTTER = 24;
  const ACTIVE_OFFSET = 16;
  const SAFE_TOP_GAP = 24;

  const USED_IDS = new Set<string>();

  type TocEntry = {
    heading: HTMLElement;
    id: string;
    level: number;
    link: HTMLAnchorElement;
    label: HTMLSpanElement;
    text: string;
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

  function getSurfaceColor(article: HTMLElement): string {
    const candidates = [
      article,
      article.parentElement,
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

  function setPalette(root: HTMLElement, article: HTMLElement): void {
    const styles = getComputedStyle(article);

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
      parseRgb(getSurfaceColor(article)) ?? "255 255 255",
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

  function createRoot(): HTMLElement {
    const existingRoot = document.querySelector<HTMLElement>(`.${ROOT_CLASS}`);
    if (existingRoot) return existingRoot;

    const root = document.createElement("nav");
    root.className = ROOT_CLASS;
    root.hidden = true;
    root.setAttribute("aria-label", "본문 목차");

    const list = document.createElement("ol");
    list.className = LIST_CLASS;
    root.append(list);

    document.body.append(root);
    return root;
  }

  function createTooltip(): HTMLElement {
    const existingTooltip = document.querySelector<HTMLElement>(
      `.${TOOLTIP_CLASS}`,
    );
    if (existingTooltip) return existingTooltip;

    const tooltip = document.createElement("div");
    tooltip.className = TOOLTIP_CLASS;
    tooltip.hidden = true;
    tooltip.setAttribute("role", "tooltip");

    document.body.append(tooltip);
    return tooltip;
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
    headings: HTMLElement[],
  ): TocEntry[] {
    const list = getList(root);
    list.innerHTML = "";

    return headings.map((heading) => {
      const id = ensureHeadingId(heading, USED_IDS);
      const level = getHeadingLevel(heading);
      const text = getHeadingText(heading);

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
      Math.max(
        padding,
        linkRect.top + linkRect.height / 2 - tooltipHeight / 2,
      ),
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

    root.addEventListener("mouseleave", () => {
      hideTooltip(tooltip);
    });
  }

  function setActive(entries: TocEntry[], activeId: string): void {
    for (const entry of entries) {
      const isActive = entry.id === activeId;
      entry.link.classList.toggle(ACTIVE_CLASS, isActive);

      if (isActive) {
        entry.link.setAttribute("aria-current", "location");
      } else {
        entry.link.removeAttribute("aria-current");
      }
    }
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

  function alignRoot(
    root: HTMLElement,
    scope: HTMLElement,
    bottomBoundary: HTMLElement,
  ): void {
    const viewportWidth = getViewportWidth();
    const viewportHeight = Math.max(
      window.innerHeight,
      document.documentElement.clientHeight,
      0,
    );
    const scopeRect = scope.getBoundingClientRect();
    const bottomBoundaryRect = bottomBoundary.getBoundingClientRect();
    const left = scopeRect.right + PANEL_GAP;
    const availableWidth = viewportWidth - left - VIEWPORT_GUTTER;
    const safeTop = getResolvedHeaderOffset() + SAFE_TOP_GAP;
    const shouldShow =
      viewportWidth >= MIN_DESKTOP_WIDTH &&
      scopeRect.width >= 480 &&
      scopeRect.right > 0 &&
      scopeRect.bottom > 0 &&
      scopeRect.top < viewportHeight &&
      availableWidth >= MIN_PANEL_WIDTH;

    if (!shouldShow) {
      root.hidden = true;
      return;
    }

    root.hidden = false;
    root.style.setProperty("--rp-toc-left", `${Math.round(left)}px`);
    root.style.setProperty(
      "--rp-toc-safe-top",
      `${Math.round(safeTop)}px`,
    );
    root.style.setProperty(
      "--rp-toc-width",
      `${Math.round(Math.min(DEFAULT_PANEL_WIDTH, availableWidth))}px`,
    );

    const rootHeight = Math.max(root.offsetHeight, root.scrollHeight);
    const desiredTop = Math.max(
      safeTop,
      Math.round(viewportHeight / 2 - rootHeight / 2),
    );
    const clampEdge =
      bottomBoundary === scope ? scopeRect.bottom : bottomBoundaryRect.top;
    const maxTop = Math.round(clampEdge - rootHeight - SAFE_TOP_GAP);

    const resolvedTop = Math.min(desiredTop, maxTop);

    if (resolvedTop + rootHeight <= 0) {
      root.hidden = true;
      return;
    }

    root.style.setProperty(
      "--rp-toc-top",
      `${resolvedTop}px`,
    );
  }

  function bindLinkInteractions(entries: TocEntry[]): void {
    for (const entry of entries) {
      entry.link.addEventListener("click", (event) => {
        event.preventDefault();

        try {
          history.replaceState(null, "", `#${entry.id}`);
        } catch {
          // 해시 갱신이 실패해도 스크롤은 계속한다.
        }

        setActive(entries, entry.id);
        scrollElementIntoViewWithOffset(
          entry.heading,
          getResolvedHeaderOffset(),
          prefersReducedMotion() ? "auto" : "smooth",
        );
      });
    }
  }

  function init(): void {
    if (initialized) return;
    initialized = true;

    if (document.querySelector(`.${ROOT_CLASS}`)) return;

    const article = getTistoryArticle();
    if (!article) return;

    const headings = Array.from(
      article.querySelectorAll<HTMLElement>(getResolvedHeadingSelector()),
    ).filter(
      (heading) =>
        isEligibleHeading(heading) && getHeadingText(heading).length > 0,
    );

    if (headings.length < 2) return;

    const scope = getStickyScope(article, headings);
    const root = createRoot();
    const tooltip = createTooltip();
    const entries = buildEntries(root, headings);

    if (entries.length < 2) {
      root.remove();
      return;
    }

    const bottomBoundary = getBottomBoundary(article, scope, entries);

    setPalette(root, scope);

    const sync = (): void => {
      alignRoot(root, scope, bottomBoundary);
      if (root.hidden) {
        hideTooltip(tooltip);
        return;
      }

      syncTooltipState(entries);
      setActive(entries, findActiveId(entries));
    };

    const scheduleSync = (): void => {
      if (scheduledFrame) return;

      scheduledFrame = requestAnimationFrame(() => {
        scheduledFrame = 0;
        sync();
      });
    };

    bindLinkInteractions(entries);
    bindTooltipInteractions(entries, root, tooltip);
    sync();

    const initialHash = getDecodedHash();
    if (initialHash && entries.some((entry) => entry.id === initialHash)) {
      setActive(entries, initialHash);
    }

    window.addEventListener(
      "scroll",
      scheduleSync,
      { passive: true },
    );
    window.addEventListener("resize", scheduleSync, { passive: true });
    window.addEventListener("load", scheduleSync, { once: true });
    window.addEventListener("pageshow", scheduleSync);

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
