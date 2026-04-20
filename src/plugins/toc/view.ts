import type { RootLayout, TocEntry } from "./runtime";

export type HeadingItem = {
  heading: HTMLElement;
  text: string;
};

export type CreatedElement<T extends HTMLElement> = {
  element: T;
  created: boolean;
};

export type TocViewConfig = {
  activeClass: string;
  labelClass: string;
  linkClass: string;
  listClass: string;
  panelClass: string;
  pendingClass: string;
  rootClass: string;
  scrollViewportClass: string;
  scrollFadeEpsilon: number;
  tooltipClass: string;
  tooltipVisibleClass: string;
  toggleButtonClass: string;
  toggleLabelClass: string;
  toggleSummaryClass: string;
  truncatedClass: string;
};

type CreateEntryOptions = {
  config: TocViewConfig;
  getHeadingLevel: (heading: HTMLElement) => number;
  headingItems: HeadingItem[];
  root: HTMLElement;
  usedIds: Set<string>;
  ensureHeadingId: (heading: HTMLElement, usedIds: Set<string>) => string;
};

type TooltipBindingsOptions = {
  config: TocViewConfig;
  entries: TocEntry[];
  root: HTMLElement;
  tooltip: HTMLElement;
};

const MOBILE_PANEL_MAX_HEIGHT_FALLBACK = 292;
const MOBILE_PANEL_EDGE_PADDING = 12;
const MOBILE_PANEL_DIRECTION_UP = "up";
const MOBILE_PANEL_DIRECTION_DOWN = "down";
const MOBILE_PANEL_VIEWPORT_BLOCK_CHROME = 24;
const MOBILE_PANEL_MAX_BLOCK_SIZE_PROPERTY =
  "--rp-toc-mobile-panel-max-block-size";

export function createRoot(config: TocViewConfig): CreatedElement<HTMLElement> {
  const existingRoot = document.querySelector<HTMLElement>(
    `.${config.rootClass}`,
  );
  const root = existingRoot ?? document.createElement("nav");
  const created = !existingRoot;

  root.className = config.rootClass;
  root.hidden = true;
  root.setAttribute("aria-label", "본문 목차");

  let panel = root.querySelector<HTMLElement>(`.${config.panelClass}`);
  const existingList = root.querySelector<HTMLOListElement>(
    `.${config.listClass}`,
  );
  if (!panel) {
    panel = document.createElement("div");
    panel.className = config.panelClass;
    panel.hidden = true;
    root.append(panel);
  }

  let scrollViewport = panel.querySelector<HTMLElement>(
    `.${config.scrollViewportClass}`,
  );
  if (!scrollViewport) {
    scrollViewport = document.createElement("div");
    scrollViewport.className = config.scrollViewportClass;
    if (existingList) {
      scrollViewport.append(existingList);
    }
    panel.append(scrollViewport);
  }

  let list = scrollViewport.querySelector<HTMLOListElement>(
    `.${config.listClass}`,
  );
  if (!list) {
    list = existingList ?? document.createElement("ol");
    list.className = config.listClass;
    scrollViewport.append(list);
  }

  let toggleButton = root.querySelector<HTMLButtonElement>(
    `.${config.toggleButtonClass}`,
  );
  if (!toggleButton) {
    toggleButton = document.createElement("button");
    toggleButton.className = config.toggleButtonClass;
    toggleButton.type = "button";
    root.append(toggleButton);
  }

  toggleButton.hidden = true;

  let toggleLabel = toggleButton.querySelector<HTMLSpanElement>(
    `.${config.toggleLabelClass}`,
  );
  if (!toggleLabel) {
    toggleLabel = document.createElement("span");
    toggleLabel.className = config.toggleLabelClass;
    toggleLabel.textContent = "목차";
    toggleButton.append(toggleLabel);
  }

  let toggleSummary = toggleButton.querySelector<HTMLSpanElement>(
    `.${config.toggleSummaryClass}`,
  );
  if (!toggleSummary) {
    toggleSummary = document.createElement("span");
    toggleSummary.className = config.toggleSummaryClass;
    toggleButton.append(toggleSummary);
  }

  const panelId = panel.id || `${config.rootClass}-panel`;
  panel.id = panelId;
  toggleButton.setAttribute("aria-controls", panelId);
  toggleButton.setAttribute("aria-expanded", "false");
  toggleButton.setAttribute("aria-label", "목차 펼치기");

  if (created) {
    document.body.append(root);
  }

  return { element: root, created };
}

export function createTooltip(
  config: TocViewConfig,
): CreatedElement<HTMLElement> {
  const existingTooltip = document.querySelector<HTMLElement>(
    `.${config.tooltipClass}`,
  );
  if (existingTooltip) {
    return { element: existingTooltip, created: false };
  }

  const tooltip = document.createElement("div");
  tooltip.className = config.tooltipClass;
  tooltip.hidden = true;
  tooltip.setAttribute("role", "tooltip");

  document.body.append(tooltip);
  return { element: tooltip, created: true };
}

export function cleanupCreatedElements(
  root: HTMLElement,
  tooltip: HTMLElement,
  options: {
    rootCreated: boolean;
    tooltipCreated: boolean;
  },
): void {
  if (options.rootCreated) {
    root.remove();
  }

  if (options.tooltipCreated) {
    tooltip.remove();
  }
}

function getList(root: HTMLElement, config: TocViewConfig): HTMLOListElement {
  const list = root.querySelector(`.${config.listClass}`);
  if (!(list instanceof HTMLOListElement)) {
    throw new Error("TOC list not found");
  }

  return list;
}

function getPanel(root: HTMLElement, config: TocViewConfig): HTMLElement {
  const panel = root.querySelector(`.${config.panelClass}`);
  if (!(panel instanceof HTMLElement)) {
    throw new Error("TOC panel not found");
  }

  return panel;
}

function getToggleButton(
  root: HTMLElement,
  config: TocViewConfig,
): HTMLButtonElement {
  const toggleButton = root.querySelector(`.${config.toggleButtonClass}`);
  if (!(toggleButton instanceof HTMLButtonElement)) {
    throw new Error("TOC toggle button not found");
  }

  return toggleButton;
}

function getToggleSummary(
  root: HTMLElement,
  config: TocViewConfig,
): HTMLSpanElement {
  const toggleSummary = root.querySelector(`.${config.toggleSummaryClass}`);
  if (!(toggleSummary instanceof HTMLSpanElement)) {
    throw new Error("TOC toggle summary not found");
  }

  return toggleSummary;
}

function getScrollViewport(
  root: HTMLElement,
  config: TocViewConfig,
): HTMLElement {
  if (root.dataset.layout !== "mobile") {
    return root;
  }

  const scrollViewport = root.querySelector(`.${config.scrollViewportClass}`);
  if (!(scrollViewport instanceof HTMLElement)) {
    throw new Error("TOC scroll viewport not found");
  }

  return scrollViewport;
}

export function bindScrollViewport(
  root: HTMLElement,
  config: TocViewConfig,
  handleScroll: () => void,
): void {
  if (root.dataset.scrollViewportBound === "true") {
    return;
  }

  root.dataset.scrollViewportBound = "true";
  root.addEventListener("scroll", handleScroll, { passive: true });
  const scrollViewport = root.querySelector(`.${config.scrollViewportClass}`);
  if (scrollViewport instanceof HTMLElement) {
    scrollViewport.addEventListener("scroll", handleScroll, {
      passive: true,
    });
  }
}

export function buildEntries({
  config,
  ensureHeadingId,
  getHeadingLevel,
  headingItems,
  root,
  usedIds,
}: CreateEntryOptions): TocEntry[] {
  const list = getList(root, config);
  list.innerHTML = "";

  return headingItems.map(({ heading, text }) => {
    const id = ensureHeadingId(heading, usedIds);
    const level = getHeadingLevel(heading);

    const item = document.createElement("li");
    item.className = `${config.rootClass}-item`;

    const link = document.createElement("a");
    link.className = config.linkClass;
    link.href = `#${id}`;
    link.dataset.level = `${level}`;
    link.dataset.tooltip = text;
    link.setAttribute("aria-label", text);

    const label = document.createElement("span");
    label.className = config.labelClass;
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

export function syncTooltipState(
  entries: TocEntry[],
  config: TocViewConfig,
): void {
  for (const entry of entries) {
    const isTruncated = entry.label.scrollWidth > entry.label.clientWidth + 1;
    entry.link.classList.toggle(config.truncatedClass, isTruncated);
  }
}

export function hideTooltip(tooltip: HTMLElement, config: TocViewConfig): void {
  tooltip.hidden = true;
  tooltip.classList.remove(config.tooltipVisibleClass);
  tooltip.textContent = "";
}

export function setPendingVisibility(
  root: HTMLElement,
  pending: boolean,
  config: TocViewConfig,
): void {
  root.classList.toggle(config.pendingClass, pending);
  root.style.visibility = pending ? "hidden" : "";
  root.style.pointerEvents = pending ? "none" : "";
}

export function syncScrollFadeState(
  root: HTMLElement,
  config: TocViewConfig,
): void {
  if (root.hidden) {
    delete root.dataset.scrollFade;
    return;
  }

  if (root.dataset.layout === "mobile") {
    delete root.dataset.scrollFade;
    return;
  }

  const scrollViewport = getScrollViewport(root, config);

  const viewportHeight = scrollViewport.clientHeight;
  const maxScrollTop = Math.max(
    0,
    scrollViewport.scrollHeight - viewportHeight,
  );
  if (
    viewportHeight <= 0 ||
    maxScrollTop <= config.scrollFadeEpsilon ||
    Number.isNaN(maxScrollTop)
  ) {
    delete root.dataset.scrollFade;
    return;
  }

  const hasTopFade = scrollViewport.scrollTop > config.scrollFadeEpsilon;
  const hasBottomFade =
    scrollViewport.scrollTop < maxScrollTop - config.scrollFadeEpsilon;

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

export function measureRootHeight(root: HTMLElement): number {
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
  const gap = 6;
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

export function bindTooltipInteractions({
  config,
  entries,
  root,
  tooltip,
}: TooltipBindingsOptions): void {
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
    tooltip.dataset.surfaceTone = root.dataset.surfaceTone || "light";
  };

  const showTooltip = (entry: TocEntry): void => {
    if (root.dataset.layout === "mobile") {
      hideTooltip(tooltip, config);
      return;
    }

    if (!entry.link.classList.contains(config.truncatedClass)) {
      hideTooltip(tooltip, config);
      return;
    }

    syncTooltipPalette();
    tooltip.textContent = entry.text;
    tooltip.hidden = false;
    tooltip.classList.add(config.tooltipVisibleClass);
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
      hideTooltip(tooltip, config);
    });
    entry.link.addEventListener("blur", () => {
      hideTooltip(tooltip, config);
    });
    entry.link.addEventListener("click", () => {
      hideTooltip(tooltip, config);
    });
  }

  if (root.dataset.tooltipBound !== "true") {
    root.dataset.tooltipBound = "true";
    root.addEventListener("mouseleave", () => {
      hideTooltip(tooltip, config);
    });
  }
}

export function setActive(
  entries: TocEntry[],
  activeId: string,
  config: TocViewConfig,
): TocEntry | undefined {
  let activeEntry: TocEntry | undefined;

  for (const entry of entries) {
    const isActive = entry.id === activeId;
    entry.link.classList.toggle(config.activeClass, isActive);

    if (isActive) {
      activeEntry = entry;
      entry.link.setAttribute("aria-current", "location");
    } else {
      entry.link.removeAttribute("aria-current");
    }
  }

  return activeEntry;
}

export function revealActiveEntry(
  root: HTMLElement,
  entry: TocEntry,
  config: TocViewConfig,
  options: {
    behavior?: "center" | "nearest";
    force?: boolean;
  } = {},
): void {
  const scrollViewport = getScrollViewport(root, config);
  const viewportHeight = scrollViewport.clientHeight;
  const maxScrollTop = Math.max(
    0,
    scrollViewport.scrollHeight - viewportHeight,
  );
  if (viewportHeight <= 0 || maxScrollTop <= 0) return;

  const { behavior = "center", force = false } = options;
  const entryTop = entry.link.offsetTop;
  const entryHeight = Math.max(entry.link.offsetHeight, 20);
  const entryBottom = entryTop + entryHeight;
  const currentScrollTop = scrollViewport.scrollTop;
  const revealPadding = 24;
  const visibleTop = currentScrollTop + revealPadding;
  const visibleBottom = currentScrollTop + viewportHeight - revealPadding;
  const isFullyVisible = entryTop >= visibleTop && entryBottom <= visibleBottom;

  if (!force && isFullyVisible) {
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
  scrollViewport.scrollTop = nextScrollTop;
  syncScrollFadeState(root, config);
}

export function applyRootLayout(
  root: HTMLElement,
  layout: RootLayout,
  config: TocViewConfig,
): void {
  const panel = getPanel(root, config);
  const toggleButton = getToggleButton(root, config);

  if (layout.hidden) {
    setMobileExpanded(root, false, config);
    root.hidden = true;
    delete root.dataset.mobilePanelDirection;
    syncScrollFadeState(root, config);
    return;
  }

  root.hidden = false;
  root.dataset.layout = layout.mode;

  if (layout.mode === "desktop") {
    root.dataset.mobileExpanded = "false";
    root.dataset.mobileDragging = "false";
    delete root.dataset.mobilePanelDirection;
    toggleButton.hidden = true;
    panel.hidden = false;
    panel.setAttribute("aria-hidden", "false");
    panel.removeAttribute("inert");
    toggleButton.setAttribute("aria-expanded", "false");
    toggleButton.setAttribute("aria-label", "목차 펼치기");
    root.style.setProperty("--rp-toc-left", `${layout.left}px`);
    root.style.setProperty("--rp-toc-top", `${layout.top}px`);
    root.style.setProperty("--rp-toc-width", `${layout.width}px`);
    root.style.setProperty("--rp-toc-safe-top", `${layout.safeTop}px`);
    return;
  }

  toggleButton.hidden = false;
  root.style.setProperty("--rp-toc-mobile-offset-x", "0px");
  setMobileExpanded(root, root.dataset.mobileExpanded === "true", config);
  root.style.removeProperty("--rp-toc-left");
  root.style.removeProperty("--rp-toc-top");
  root.style.removeProperty("--rp-toc-width");
  root.style.removeProperty("--rp-toc-safe-top");
}

function syncMobilePanelPlacement(
  root: HTMLElement,
  panel: HTMLElement,
  toggleButton: HTMLButtonElement,
): void {
  const visualViewport = window.visualViewport;
  const viewportTop = Math.max(0, visualViewport?.offsetTop ?? 0);
  const fallbackViewportHeight = Math.max(
    window.innerHeight,
    document.documentElement.clientHeight,
    0,
  );
  const viewportHeight =
    visualViewport && visualViewport.height > 0
      ? visualViewport.height
      : fallbackViewportHeight;
  const viewportBottom = viewportTop + viewportHeight;
  const rootStyle = getComputedStyle(root);
  const panelGap = Number.parseFloat(
    rootStyle.getPropertyValue("--rp-toc-mobile-panel-gap"),
  );
  const resolvedPanelGap = Number.isFinite(panelGap) ? panelGap : 10;
  const scrollViewportBlockChrome = Number.parseFloat(
    rootStyle.getPropertyValue("--rp-toc-mobile-panel-viewport-block-chrome"),
  );
  const resolvedScrollViewportBlockChrome = Number.isFinite(
    scrollViewportBlockChrome,
  )
    ? scrollViewportBlockChrome
    : MOBILE_PANEL_VIEWPORT_BLOCK_CHROME;
  const panelMaxHeight = Number.parseFloat(
    rootStyle.getPropertyValue(MOBILE_PANEL_MAX_BLOCK_SIZE_PROPERTY),
  );
  const resolvedPanelMaxHeight = Number.isFinite(panelMaxHeight)
    ? panelMaxHeight
    : MOBILE_PANEL_MAX_HEIGHT_FALLBACK;
  const toggleRect = toggleButton.getBoundingClientRect();
  const panelHeight = Math.max(
    panel.offsetHeight,
    panel.scrollHeight,
    panel.clientHeight,
  );
  const targetPanelHeight = Math.min(
    resolvedPanelMaxHeight,
    Math.max(panelHeight, panel.clientHeight),
  );
  const availableAbove = Math.max(
    0,
    toggleRect.top - viewportTop - resolvedPanelGap - MOBILE_PANEL_EDGE_PADDING,
  );
  const availableBelow = Math.max(
    0,
    viewportBottom -
      toggleRect.bottom -
      resolvedPanelGap -
      MOBILE_PANEL_EDGE_PADDING,
  );
  const shouldOpenDown =
    availableAbove < targetPanelHeight && availableBelow > availableAbove;
  const availableSpace = Math.max(
    0,
    Math.floor(shouldOpenDown ? availableBelow : availableAbove),
  );

  root.dataset.mobilePanelDirection = shouldOpenDown
    ? MOBILE_PANEL_DIRECTION_DOWN
    : MOBILE_PANEL_DIRECTION_UP;
  const availableContentSpace = Math.max(
    0,
    availableSpace - Math.ceil(resolvedScrollViewportBlockChrome),
  );
  panel.style.setProperty(
    "--rp-toc-mobile-panel-max-height",
    `min(${availableContentSpace}px, 39vh, ${resolvedPanelMaxHeight}px)`,
  );
}

export function setMobileExpanded(
  root: HTMLElement,
  expanded: boolean,
  config: TocViewConfig,
): void {
  const panel = getPanel(root, config);
  const toggleButton = getToggleButton(root, config);

  root.dataset.mobileExpanded = expanded ? "true" : "false";
  panel.hidden = false;
  if (root.dataset.layout === "mobile") {
    syncMobilePanelPlacement(root, panel, toggleButton);
  } else {
    delete root.dataset.mobilePanelDirection;
    panel.style.removeProperty("--rp-toc-mobile-panel-max-height");
  }
  panel.setAttribute("aria-hidden", expanded ? "false" : "true");
  panel.toggleAttribute("inert", !expanded);
  toggleButton.setAttribute("aria-expanded", expanded ? "true" : "false");
  toggleButton.setAttribute(
    "aria-label",
    expanded ? "목차 접기" : "목차 펼치기",
  );
}

export function syncMobileToggleSummary(
  root: HTMLElement,
  config: TocViewConfig,
  options: {
    activeText: string;
    entryCount: number;
  },
): void {
  const toggleSummary = getToggleSummary(root, config);
  const summary = options.activeText.trim() || `섹션 ${options.entryCount}개`;
  toggleSummary.textContent = summary;
  toggleSummary.title = summary;

  const toggleButton = getToggleButton(root, config);
  toggleButton.setAttribute(
    "aria-label",
    `${root.dataset.mobileExpanded === "true" ? "목차 접기" : "목차 펼치기"}: ${summary}`,
  );
}

export function bindMobileToggle(
  root: HTMLElement,
  config: TocViewConfig,
  handleToggle: () => void,
): void {
  const toggleButton = getToggleButton(root, config);

  if (toggleButton.dataset.bound === "true") {
    return;
  }

  toggleButton.dataset.bound = "true";
  toggleButton.addEventListener("click", handleToggle);
}

export function bindLinkInteractions(
  entries: TocEntry[],
  handleLinkActivation: (entry: TocEntry) => void,
  primeLinkActivation?: (entry: TocEntry) => void,
): void {
  for (const entry of entries) {
    if (entry.link.dataset.bound === "true") continue;

    entry.link.dataset.bound = "true";
    entry.link.addEventListener("click", (event) => {
      event.preventDefault();
      const isPointerActivation = event.detail > 0;
      handleLinkActivation(entry);

      if (isPointerActivation) {
        entry.link.blur();
      }
    });

    if (!primeLinkActivation) continue;

    entry.link.addEventListener("pointerenter", () => {
      primeLinkActivation(entry);
    });
    entry.link.addEventListener("focus", () => {
      primeLinkActivation(entry);
    });
    entry.link.addEventListener("pointerdown", () => {
      primeLinkActivation(entry);
    });
  }
}
