import type { TocViewConfig } from "./view";

export const ROOT_CLASS = "rp-toc";
export const PENDING_CLASS = `${ROOT_CLASS}--pending`;
export const PANEL_CLASS = `${ROOT_CLASS}-panel`;
export const SCROLL_VIEWPORT_CLASS = `${ROOT_CLASS}-scroll-viewport`;
export const LIST_CLASS = `${ROOT_CLASS}-list`;
export const LINK_CLASS = `${ROOT_CLASS}-link`;
export const LABEL_CLASS = `${ROOT_CLASS}-label`;
export const TOOLTIP_CLASS = `${ROOT_CLASS}-tooltip`;
export const TOGGLE_BUTTON_CLASS = `${ROOT_CLASS}-toggle`;
export const TOGGLE_LABEL_CLASS = `${ROOT_CLASS}-toggle-label`;
export const TOGGLE_SUMMARY_CLASS = `${ROOT_CLASS}-toggle-summary`;
export const TOOLTIP_VISIBLE_CLASS = "is-visible";
export const TRUNCATED_CLASS = "is-truncated";
export const ACTIVE_CLASS = "is-active";
export const NAVIGATION_LOCK_CLASS = "is-navigation-locked";
export const PENDING_NAVIGATION_CLASS = "is-pending-navigation";
export const PENDING_NAVIGATION_ROOT_CLASS = "is-navigation-pending";

export const VIEW_CONFIG: TocViewConfig = {
  activeClass: ACTIVE_CLASS,
  labelClass: LABEL_CLASS,
  linkClass: LINK_CLASS,
  listClass: LIST_CLASS,
  panelClass: PANEL_CLASS,
  pendingClass: PENDING_CLASS,
  rootClass: ROOT_CLASS,
  scrollViewportClass: SCROLL_VIEWPORT_CLASS,
  scrollFadeEpsilon: 1,
  tooltipClass: TOOLTIP_CLASS,
  tooltipVisibleClass: TOOLTIP_VISIBLE_CLASS,
  toggleButtonClass: TOGGLE_BUTTON_CLASS,
  toggleLabelClass: TOGGLE_LABEL_CLASS,
  toggleSummaryClass: TOGGLE_SUMMARY_CLASS,
  truncatedClass: TRUNCATED_CLASS,
};

const RELATED_CATEGORY_SELECTORS = [".another-category", ".another_category"];

export const BLOCKED_HEADING_ANCESTOR_SELECTOR = [
  ...RELATED_CATEGORY_SELECTORS,
  ".container_postbtn",
  "#comments",
  ".comments",
  ".comment-wrap",
  ".tt-box-comment",
  ".reply",
].join(", ");

export const BOTTOM_BOUNDARY_SELECTOR = RELATED_CATEGORY_SELECTORS.join(", ");

export const LAYOUT_CONSTRAINTS = {
  defaultPanelWidth: 252,
  minDesktopWidth: 1280,
  minMobileScopeWidth: 220,
  minMobileWidth: 320,
  minPanelWidth: 172,
  minScopeWidth: 480,
  panelGap: 68,
  rightRailGutter: 32,
  safeTopGap: 24,
  viewportGutter: 24,
};

export const ACTIVE_OFFSET = 16;
export const CLICK_NAVIGATION_LOCK_MS = 1400;
export const CLICK_TARGET_FREEZE_MS = 220;
export const CLICK_NAVIGATION_SETTLE_MS = 100;
