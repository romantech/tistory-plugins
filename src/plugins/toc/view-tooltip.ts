import type { TocEntry } from "./runtime";
import type { TocViewConfig } from "./view";

type TooltipBindingsOptions = {
  config: TocViewConfig;
  entries: TocEntry[];
  root: HTMLElement;
  tooltip: HTMLElement;
};

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
