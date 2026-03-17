import "./index.css";
import { getTistoryArticle } from "@/shared/article-selector";

(() => {
  const HEADING_SELECTOR = "h2, h3, h4";
  const LINK_CLASS = "rp-heading-anchor";
  const DEFAULT_ID = "section";
  const DEFAULT_HEADER_HEIGHT = 84;
  const MAX_SUFFIX = 1000;
  const POST_LOAD_CORRECTION_DELAYS = [120, 320, 700, 1100] as const;
  const VIEWPORT_RESIZE_WATCH_DURATION = 1300;
  const POSITION_TOLERANCE = 6;

  const USED_IDS = new Set<string>();
  let cleanupPendingInitialHashScroll: (() => void) | null = null;

  let initialized = false;

  function getHeaderOffset(): number {
    return (
      parseInt(
        getComputedStyle(document.documentElement)
          .getPropertyValue("--header-height")
          .trim(),
        10,
      ) || DEFAULT_HEADER_HEIGHT
    );
  }

  function slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function getUniqueId(base: string, currentHeading?: HTMLElement): string {
    const normalizedBase = base || DEFAULT_ID;

    for (let suffix = 1; suffix <= MAX_SUFFIX; suffix += 1) {
      const id = suffix === 1 ? normalizedBase : `${normalizedBase}-${suffix}`;
      const existing = document.getElementById(id);

      if (!USED_IDS.has(id) && (!existing || existing === currentHeading)) {
        USED_IDS.add(id);
        return id;
      }
    }

    const fallback = `${normalizedBase}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    USED_IDS.add(fallback);
    return fallback;
  }

  function isHeadingPositionAccurate(
    heading: HTMLElement,
    tolerance = POSITION_TOLERANCE,
  ): boolean {
    const expectedTop = getHeaderOffset();
    const actualTop = heading.getBoundingClientRect().top;

    return Math.abs(actualTop - expectedTop) <= tolerance;
  }

  function scrollHeadingIntoView(
    heading: HTMLElement,
    behavior: ScrollBehavior,
  ): void {
    const top =
      window.scrollY + heading.getBoundingClientRect().top - getHeaderOffset();

    window.scrollTo({
      top: Math.max(0, top),
      behavior,
    });
  }

  function scrollHeadingIntoViewIfNeeded(
    heading: HTMLElement,
    behavior: ScrollBehavior,
    tolerance = POSITION_TOLERANCE,
  ): void {
    if (isHeadingPositionAccurate(heading, tolerance)) {
      return;
    }

    scrollHeadingIntoView(heading, behavior);
  }

  function correctInitialHashScroll(target: HTMLElement): void {
    const timeoutIds: number[] = [];
    cleanupPendingInitialHashScroll?.();

    const run = (): void => {
      if (!document.contains(target)) return;
      scrollHeadingIntoViewIfNeeded(target, "auto");
    };

    const addManagedTimeout = (callback: () => void, delay: number): void => {
      const timeoutId = window.setTimeout(() => {
        const index = timeoutIds.indexOf(timeoutId);
        if (index !== -1) {
          timeoutIds.splice(index, 1);
        }

        callback();
      }, delay);

      timeoutIds.push(timeoutId);
    };

    const handleViewportChange = (): void => {
      run();
    };

    const cleanup = (): void => {
      while (timeoutIds.length) {
        const timeoutId = timeoutIds.pop();
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
        }
      }

      if (window.visualViewport) {
        window.visualViewport.removeEventListener(
          "resize",
          handleViewportChange,
        );
      }

      window.removeEventListener("load", runAfterLoad);

      if (cleanupPendingInitialHashScroll === cleanup) {
        cleanupPendingInitialHashScroll = null;
      }
    };

    cleanupPendingInitialHashScroll = cleanup;

    const runAfterLoad = (): void => {
      run();

      requestAnimationFrame(() => {
        run();
        requestAnimationFrame(run);
      });

      POST_LOAD_CORRECTION_DELAYS.forEach((delay) => {
        addManagedTimeout(run, delay);
      });

      addManagedTimeout(cleanup, VIEWPORT_RESIZE_WATCH_DURATION);
    };

    if (document.readyState === "complete") {
      runAfterLoad();
    } else {
      window.addEventListener("load", runAfterLoad, { once: true });
    }

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportChange, {
        passive: true,
      });
    }
  }

  function activateHeading(heading: HTMLElement): void {
    try {
      history.replaceState(null, "", `#${heading.id}`);
    } catch {
      // 해시 갱신 실패 시에도 스크롤은 계속 진행
    }

    scrollHeadingIntoView(heading, "smooth");
  }

  function createAnchorLink(heading: HTMLElement): HTMLAnchorElement {
    const text = heading.textContent?.trim() || "섹션";

    const anchor = document.createElement("a");
    anchor.className = LINK_CLASS;
    anchor.href = `#${heading.id}`;
    anchor.setAttribute("aria-label", `${text} 링크`);
    anchor.setAttribute("title", "현재 섹션으로 이동");

    while (heading.firstChild) {
      anchor.append(heading.firstChild);
    }

    const marker = document.createElement("span");
    marker.className = `${LINK_CLASS}-marker`;
    marker.textContent = "#";
    marker.setAttribute("aria-hidden", "true");

    anchor.append(marker);

    anchor.addEventListener("click", (event) => {
      event.preventDefault();
      activateHeading(heading);
      anchor.blur();
    });

    return anchor;
  }

  function getDecodedHash(): string {
    const rawHash = location.hash.slice(1);

    if (!rawHash) return "";

    try {
      return decodeURIComponent(rawHash);
    } catch {
      return rawHash;
    }
  }

  function hasHash(): boolean {
    return location.hash.length > 1;
  }

  function scrollToHeadingHash(article: HTMLElement): void {
    const hash = getDecodedHash();
    if (!hash) return;

    const target = document.getElementById(hash);
    if (
      !target ||
      !article.contains(target) ||
      !target.matches(HEADING_SELECTOR)
    ) {
      return;
    }

    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (!document.contains(target)) return;
        correctInitialHashScroll(target);
      });
      return;
    }

    correctInitialHashScroll(target);
  }

  function prepareHeading(heading: HTMLElement): void {
    if (heading.querySelector(`.${LINK_CLASS}`)) {
      return;
    }

    const text = heading.textContent?.trim();
    if (!text) return;

    if (heading.id) {
      heading.id = getUniqueId(heading.id, heading);
    } else {
      heading.id = getUniqueId(slugify(text), heading);
    }

    if (heading.querySelector("a")) {
      return;
    }

    heading.append(createAnchorLink(heading));
  }

  function init(): void {
    if (initialized) return;
    initialized = true;

    const article = getTistoryArticle();
    if (!(article instanceof HTMLElement)) return;

    const headings = article.querySelectorAll<HTMLElement>(HEADING_SELECTOR);
    if (!headings.length) return;

    headings.forEach(prepareHeading);

    if (!hasHash()) return;

    const runInitialHashScroll = (): void => {
      scrollToHeadingHash(article);
    };

    runInitialHashScroll();

    window.addEventListener("pageshow", (event) => {
      if (event.persisted) {
        runInitialHashScroll();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
