import type { TocEntry } from "./runtime";
import type { TocViewConfig } from "./view";

export type HeadingItem = {
  heading: HTMLElement;
  text: string;
};

export type CreatedElement<T extends HTMLElement> = {
  element: T;
  created: boolean;
};

type CreateEntryOptions = {
  config: TocViewConfig;
  getHeadingLevel: (heading: HTMLElement) => number;
  headingItems: HeadingItem[];
  root: HTMLElement;
  usedIds: Set<string>;
  ensureHeadingId: (heading: HTMLElement, usedIds: Set<string>) => string;
};

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

export function getPanel(
  root: HTMLElement,
  config: TocViewConfig,
): HTMLElement {
  const panel = root.querySelector(`.${config.panelClass}`);
  if (!(panel instanceof HTMLElement)) {
    throw new Error("TOC panel not found");
  }

  return panel;
}

export function getToggleButton(
  root: HTMLElement,
  config: TocViewConfig,
): HTMLButtonElement {
  const toggleButton = root.querySelector(`.${config.toggleButtonClass}`);
  if (!(toggleButton instanceof HTMLButtonElement)) {
    throw new Error("TOC toggle button not found");
  }

  return toggleButton;
}

export function getToggleSummary(
  root: HTMLElement,
  config: TocViewConfig,
): HTMLSpanElement {
  const toggleSummary = root.querySelector(`.${config.toggleSummaryClass}`);
  if (!(toggleSummary instanceof HTMLSpanElement)) {
    throw new Error("TOC toggle summary not found");
  }

  return toggleSummary;
}

export function getScrollViewport(
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
