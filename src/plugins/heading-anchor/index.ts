import "./index.css";
import { getTistoryArticle } from "@/shared/article-selector";
import { runOnDocumentReady } from "@/shared/dom-ready";
import {
  DEFAULT_HEADING_SELECTOR,
  ensureHeadingId,
  getDecodedHash,
  getHeaderOffset,
  prefixGeneratedHeadingId,
  getHeadingSelector as resolveHeadingSelector,
  scrollElementIntoViewWithOffset,
} from "@/shared/headings";
import { getHeadingAnchorConfig } from "@/shared/plugin-config";
import { ensurePluginStylesheet } from "@/shared/stylesheet";

const CURRENT_SCRIPT =
  document.currentScript instanceof HTMLScriptElement
    ? document.currentScript
    : null;

(() => {
  ensurePluginStylesheet("heading-anchor", CURRENT_SCRIPT);

  const LINK_CLASS = "rp-heading-anchor";
  const TARGET_CLASS = "rp-heading-target";
  const POST_LOAD_CORRECTION_DELAYS = [120, 320, 700] as const;
  const VIEWPORT_RESIZE_WATCH_DURATION = 1100;
  const POSITION_TOLERANCE = 6;

  const USED_IDS = new Set<string>();
  let cleanupPendingInitialHashScroll: (() => void) | null = null;

  let initialized = false;

  function getHeadingSelector(): string {
    return getHeadingSelectorFromConfig().trim();
  }

  function getHeadingSelectorFromConfig(): string {
    return resolveHeadingSelector(
      getHeadingAnchorConfig().levels,
      DEFAULT_HEADING_SELECTOR,
    );
  }

  function getResolvedHeaderOffset(): number {
    return getHeaderOffset(getHeadingAnchorConfig().headerOffset);
  }

  function isHeadingPositionAccurate(
    heading: HTMLElement,
    tolerance = POSITION_TOLERANCE,
  ): boolean {
    const expectedTop = getResolvedHeaderOffset();
    const actualTop = heading.getBoundingClientRect().top;

    return Math.abs(actualTop - expectedTop) <= tolerance;
  }

  function scrollHeadingIntoView(
    heading: HTMLElement,
    behavior: ScrollBehavior,
  ): void {
    scrollElementIntoViewWithOffset(
      heading,
      getResolvedHeaderOffset(),
      behavior,
    );
  }

  function scrollHeadingIntoViewIfNeeded(
    heading: HTMLElement,
    behavior: ScrollBehavior,
    tolerance = POSITION_TOLERANCE,
  ): void {
    if (isHeadingPositionAccurate(heading, tolerance)) return;

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
        if (index !== -1) timeoutIds.splice(index, 1);

        callback();
      }, delay);

      timeoutIds.push(timeoutId);
    };

    const handleViewportChange = (): void => run();

    const cleanup = (): void => {
      while (timeoutIds.length) {
        const timeoutId = timeoutIds.pop();
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
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

    if (document.readyState === "complete") runAfterLoad();
    else window.addEventListener("load", runAfterLoad, { once: true });

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

  function hasHash(): boolean {
    return location.hash.length > 1;
  }

  function findHeadingHashTarget(
    article: HTMLElement,
    hash: string,
  ): HTMLElement | null {
    const target = document.getElementById(hash);
    if (target) {
      return isHeadingHashTarget(article, target) ? target : null;
    }

    const prefixedTarget = document.getElementById(
      prefixGeneratedHeadingId(hash),
    );

    return isHeadingHashTarget(article, prefixedTarget) ? prefixedTarget : null;
  }

  function isHeadingHashTarget(
    article: HTMLElement,
    target: HTMLElement | null,
  ): target is HTMLElement {
    return (
      target instanceof HTMLElement &&
      article.contains(target) &&
      target.matches(getHeadingSelector())
    );
  }

  function scrollToHeadingHash(article: HTMLElement): void {
    const hash = getDecodedHash();
    if (!hash) return;

    const target = findHeadingHashTarget(article, hash);
    if (!target) return;

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
    if (heading.querySelector(`.${LINK_CLASS}`)) return;

    const text = heading.textContent?.trim();
    if (!text) return;

    heading.classList.add(TARGET_CLASS);
    ensureHeadingId(heading, USED_IDS);

    if (heading.querySelector("a")) return;

    heading.append(createAnchorLink(heading));
  }

  function init(): void {
    if (initialized) return;
    initialized = true;

    const article = getTistoryArticle();
    if (!article) return;

    const headings = article.querySelectorAll<HTMLElement>(
      getHeadingSelector(),
    );
    if (!headings.length) return;

    headings.forEach(prepareHeading);

    if (!hasHash()) return;

    const runInitialHashScroll = (): void => scrollToHeadingHash(article);

    runInitialHashScroll();

    window.addEventListener("pageshow", (event) => {
      if (event.persisted) runInitialHashScroll();
    });
  }

  runOnDocumentReady(init);
})();
