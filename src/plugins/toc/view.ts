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
  pendingClass: string;
  rootClass: string;
  scrollFadeEpsilon: number;
  tooltipClass: string;
  tooltipVisibleClass: string;
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

export function createRoot(config: TocViewConfig): CreatedElement<HTMLElement> {
  const existingRoot = document.querySelector<HTMLElement>(
    `.${config.rootClass}`,
  );
  if (existingRoot) {
    return { element: existingRoot, created: false };
  }

  const root = document.createElement("nav");
  root.className = config.rootClass;
  root.hidden = true;
  root.setAttribute("aria-label", "본문 목차");

  const list = document.createElement("ol");
  list.className = config.listClass;
  root.append(list);

  document.body.append(root);
  return { element: root, created: true };
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
}

export function syncScrollFadeState(
  root: HTMLElement,
  config: TocViewConfig,
): void {
  if (root.hidden) {
    delete root.dataset.scrollFade;
    return;
  }

  const viewportHeight = root.clientHeight;
  const maxScrollTop = Math.max(0, root.scrollHeight - viewportHeight);
  if (
    viewportHeight <= 0 ||
    maxScrollTop <= config.scrollFadeEpsilon ||
    Number.isNaN(maxScrollTop)
  ) {
    delete root.dataset.scrollFade;
    return;
  }

  const hasTopFade = root.scrollTop > config.scrollFadeEpsilon;
  const hasBottomFade =
    root.scrollTop < maxScrollTop - config.scrollFadeEpsilon;

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
  const viewportHeight = root.clientHeight;
  const maxScrollTop = Math.max(0, root.scrollHeight - viewportHeight);
  if (viewportHeight <= 0 || maxScrollTop <= 0) return;

  const { behavior = "center", force = false } = options;
  const entryTop = entry.link.offsetTop;
  const entryHeight = Math.max(entry.link.offsetHeight, 20);
  const entryBottom = entryTop + entryHeight;
  const currentScrollTop = root.scrollTop;
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
  root.scrollTop = nextScrollTop;
  syncScrollFadeState(root, config);
}

export function applyRootLayout(
  root: HTMLElement,
  layout: RootLayout,
  config: TocViewConfig,
): void {
  if (layout.hidden) {
    root.hidden = true;
    syncScrollFadeState(root, config);
    return;
  }

  root.hidden = false;
  root.style.setProperty("--rp-toc-left", `${layout.left}px`);
  root.style.setProperty("--rp-toc-top", `${layout.top}px`);
  root.style.setProperty("--rp-toc-width", `${layout.width}px`);
  root.style.setProperty("--rp-toc-safe-top", `${layout.safeTop}px`);
}

export function bindLinkInteractions(
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
