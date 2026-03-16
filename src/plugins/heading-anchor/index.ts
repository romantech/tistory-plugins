import "./style.css";
import { getTistoryArticle } from "@/shared/utils";

(() => {
  const HEADING_SELECTOR = "h2, h3, h4";
  const LINK_CLASS = "rp-heading-anchor";
  const DEFAULT_ID = "section";
  const USED_IDS = new Set<string>();

  function getHeaderOffset(): number {
    return (
      parseInt(
        getComputedStyle(document.documentElement)
          .getPropertyValue("--header-height")
          .trim(),
        10,
      ) || 84
    );
  }

  function slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s가-힣-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function getUniqueId(base: string): string {
    const normalizedBase = base || DEFAULT_ID;
    let id = normalizedBase;
    let count = 2;

    while (USED_IDS.has(id) || document.getElementById(id)) {
      id = `${normalizedBase}-${count++}`;
    }

    USED_IDS.add(id);
    return id;
  }

  async function copyToClipboard(text: string): Promise<boolean> {
    try {
      if (!navigator.clipboard?.writeText) return false;
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  function scrollToHeading(heading: HTMLElement, smooth = true): void {
    const top =
      window.scrollY + heading.getBoundingClientRect().top - getHeaderOffset();

    window.scrollTo({
      top: Math.max(0, top),
      behavior: smooth ? "smooth" : "auto",
    });
  }

  async function activateHeading(heading: HTMLElement): Promise<void> {
    const url = new URL(location.href);
    url.hash = heading.id;

    await copyToClipboard(url.toString());
    history.replaceState(null, "", url);
    scrollToHeading(heading, true);
  }

  function createAnchorLink(heading: HTMLElement): HTMLAnchorElement {
    const text = heading.textContent?.trim() || "섹션";

    const anchor = document.createElement("a");
    anchor.className = LINK_CLASS;
    anchor.href = `#${heading.id}`;
    anchor.textContent = "#";
    anchor.setAttribute("aria-label", `${text} 링크 복사`);
    anchor.setAttribute("title", "링크 복사");

    anchor.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await activateHeading(heading);
      anchor.blur();
    });

    return anchor;
  }

  function getImagesBeforeTarget(
    article: Element,
    target: HTMLElement,
  ): HTMLImageElement[] {
    const allImages = Array.from(article.querySelectorAll("img"));

    return allImages.filter((img) => {
      const pos = img.compareDocumentPosition(target);
      return Boolean(pos & Node.DOCUMENT_POSITION_FOLLOWING);
    });
  }

  function waitForImages(images: HTMLImageElement[]): Promise<void[]> {
    const pending = images.filter((img) => !img.complete);

    if (pending.length === 0) {
      return Promise.resolve([]);
    }

    return Promise.all(
      pending.map(
        (img) =>
          new Promise<void>((resolve) => {
            const done = () => resolve();

            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });

            if (img.complete) resolve();
          }),
      ),
    );
  }

  async function fixInitialHashScroll(article: Element): Promise<void> {
    if (!location.hash) return;

    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;

    const target = document.getElementById(id);
    if (!(target instanceof HTMLElement)) return;

    const imagesBeforeTarget = getImagesBeforeTarget(article, target);

    await waitForImages(imagesBeforeTarget);

    requestAnimationFrame(() => {
      scrollToHeading(target, false);
    });
  }

  function init(): void {
    const article = getTistoryArticle();
    if (!(article instanceof HTMLElement)) return;

    const headings = article.querySelectorAll(HEADING_SELECTOR);
    if (!headings.length) return;

    headings.forEach((heading) => {
      if (!(heading instanceof HTMLElement)) return;
      if (heading.querySelector(`.${LINK_CLASS}`)) return;

      const text = heading.textContent?.trim();
      if (!text) return;

      if (!heading.id) {
        heading.id = getUniqueId(slugify(text));
      } else {
        USED_IDS.add(heading.id);
      }

      heading.append(createAnchorLink(heading));

      heading.addEventListener("click", async (event) => {
        const selection = window.getSelection();
        if (selection?.toString().trim()) return;

        const target = event.target;
        if (target instanceof Element && target.closest(`.${LINK_CLASS}`)) {
          return;
        }

        await activateHeading(heading);
      });
    });

    void fixInitialHashScroll(article);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
