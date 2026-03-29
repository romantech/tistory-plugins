const DEFAULT_ID = "section";
const MAX_SUFFIX = 1000;

export const DEFAULT_HEADER_HEIGHT = 84;
export const DEFAULT_HEADING_SELECTOR = "h2, h3, h4";

export function getHeadingSelector(
  levels: number[] | undefined,
  defaultSelector = DEFAULT_HEADING_SELECTOR,
): string {
  if (!Array.isArray(levels) || levels.length === 0) {
    return defaultSelector;
  }

  const selectors = levels
    .filter((level): level is number => Number.isInteger(level))
    .filter((level) => level >= 1 && level <= 6)
    .map((level) => `h${level}`);

  return selectors.length > 0 ? selectors.join(", ") : defaultSelector;
}

export function getHeaderOffset(
  configuredOffset: number | undefined,
  fallback = DEFAULT_HEADER_HEIGHT,
): number {
  if (
    typeof configuredOffset === "number" &&
    Number.isFinite(configuredOffset)
  ) {
    return configuredOffset;
  }

  return (
    parseInt(
      getComputedStyle(document.documentElement)
        .getPropertyValue("--header-height")
        .trim(),
      10,
    ) || fallback
  );
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getUniqueHeadingId(
  base: string,
  usedIds: Set<string>,
  currentHeading?: HTMLElement,
): string {
  const normalizedBase = base || DEFAULT_ID;

  for (let suffix = 1; suffix <= MAX_SUFFIX; suffix += 1) {
    const id = suffix === 1 ? normalizedBase : `${normalizedBase}-${suffix}`;
    const existing = document.getElementById(id);

    if (!usedIds.has(id) && (!existing || existing === currentHeading)) {
      usedIds.add(id);
      return id;
    }
  }

  const fallback = `${normalizedBase}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  usedIds.add(fallback);
  return fallback;
}

export function ensureHeadingId(
  heading: HTMLElement,
  usedIds: Set<string>,
): string {
  const text = heading.textContent?.trim() || "";
  const baseId = heading.id || slugifyHeading(text) || DEFAULT_ID;
  const id = getUniqueHeadingId(baseId, usedIds, heading);

  heading.id = id;
  return id;
}

export function getDecodedHash(): string {
  const rawHash = location.hash.slice(1);

  if (!rawHash) return "";

  try {
    return decodeURIComponent(rawHash);
  } catch {
    return rawHash;
  }
}

export function scrollElementIntoViewWithOffset(
  element: HTMLElement,
  offset: number,
  behavior: ScrollBehavior,
): void {
  const top = window.scrollY + element.getBoundingClientRect().top - offset;

  window.scrollTo({
    top: Math.max(0, top),
    behavior,
  });
}
