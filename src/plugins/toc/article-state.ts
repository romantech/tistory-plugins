import { getTistoryArticle } from "@/shared/article-selector";
import { ensureHeadingId } from "@/shared/headings";
import type { TocEntry, TocState } from "./runtime";
import { buildEntries, type TocViewConfig } from "./view";

type HeadingItem = {
  heading: HTMLElement;
  text: string;
};

type CreateTocStateOptions = {
  blockedHeadingAncestorSelector: string;
  bottomBoundarySelector: string;
  headingSelector: string;
  root: HTMLElement;
  viewConfig: TocViewConfig;
};

const DEFAULT_HEADING_TEXT = "섹션";
const HEADING_ANCHOR_MARKER_SELECTOR = ".rp-heading-anchor-marker";

function getHeadingLevel(heading: HTMLElement): number {
  return Number.parseInt(heading.tagName.slice(1), 10);
}

function getHeadingText(heading: HTMLElement): string {
  const clone = heading.cloneNode(true);
  if (!(clone instanceof HTMLElement)) {
    return heading.textContent?.trim() || DEFAULT_HEADING_TEXT;
  }

  clone.querySelectorAll(HEADING_ANCHOR_MARKER_SELECTOR).forEach((marker) => {
    marker.remove();
  });

  return clone.textContent?.trim() || DEFAULT_HEADING_TEXT;
}

function isEligibleHeading(
  heading: HTMLElement,
  blockedHeadingAncestorSelector: string,
): boolean {
  return !heading.closest(blockedHeadingAncestorSelector);
}

function getHeadingItems(
  article: HTMLElement,
  options: {
    blockedHeadingAncestorSelector: string;
    headingSelector: string;
  },
): HeadingItem[] {
  return Array.from(
    article.querySelectorAll<HTMLElement>(options.headingSelector),
  )
    .map((heading) => ({
      heading,
      text: getHeadingText(heading),
    }))
    .filter(
      ({ heading, text }) =>
        isEligibleHeading(heading, options.blockedHeadingAncestorSelector) &&
        text.length > 0,
    );
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
  const surfaceRgb = parseRgb(getSurfaceColor(surfaceSource)) ?? "255 255 255";

  root.style.setProperty(
    "--rp-toc-font-family",
    styles.fontFamily || "inherit",
  );
  root.style.setProperty("--rp-toc-ink", parseRgb(styles.color) ?? "24 24 27");
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
  bottomBoundarySelector: string,
): HTMLElement {
  const lastHeading = entries.at(-1)?.heading;
  if (!lastHeading) return scope;

  const candidates = Array.from(
    article.querySelectorAll<HTMLElement>(bottomBoundarySelector),
  );

  for (const candidate of candidates) {
    const relation = lastHeading.compareDocumentPosition(candidate);
    if (relation & Node.DOCUMENT_POSITION_FOLLOWING) {
      return candidate;
    }
  }

  return scope;
}

export function createTocState({
  blockedHeadingAncestorSelector,
  bottomBoundarySelector,
  headingSelector,
  root,
  viewConfig,
}: CreateTocStateOptions): TocState | null {
  const article = getTistoryArticle();
  if (!article) return null;

  const headingItems = getHeadingItems(article, {
    blockedHeadingAncestorSelector,
    headingSelector,
  });
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
    bottomBoundary: getBottomBoundary(
      article,
      scope,
      entries,
      bottomBoundarySelector,
    ),
    entries,
    currentActiveId: "",
  };
}
