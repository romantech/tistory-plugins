import type { RootLayout, TocEntry } from "./runtime";
import {
  getPanel,
  getScrollViewport,
  getToggleButton,
  getToggleSummary,
} from "./view-dom";
import { getTocViewport } from "./viewport";

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

const MOBILE_PANEL_MAX_HEIGHT_FALLBACK = 292;
const MOBILE_PANEL_EDGE_PADDING = 12;
const MOBILE_PANEL_DIRECTION_UP = "up";
const MOBILE_PANEL_DIRECTION_DOWN = "down";
const MOBILE_PANEL_VIEWPORT_BLOCK_CHROME = 24;
const MOBILE_PANEL_MAX_BLOCK_SIZE_PROPERTY =
  "--rp-toc-mobile-panel-max-block-size";

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
  const viewport = getTocViewport();
  const viewportTop = viewport.visibleTop;
  const viewportBottom = viewport.visibleBottom;
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

export type { CreatedElement, HeadingItem } from "./view-dom";
export {
  bindScrollViewport,
  buildEntries,
  cleanupCreatedElements,
  createRoot,
  createTooltip,
} from "./view-dom";
export {
  bindTooltipInteractions,
  hideTooltip,
  syncTooltipState,
} from "./view-tooltip";

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
