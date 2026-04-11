import {
  getRequiredElement,
  getRequiredElements,
  renderArticle,
} from "@test/dom";
import { describe, expect, it } from "vitest";
import {
  flushAll,
  loadTocPlugin,
  mockRect,
  setupTocTest,
} from "./test-helpers";

describe("toc plugin desktop layout", () => {
  setupTocTest();

  it("uses the shared heading scope for layout calculations", async () => {
    const article = renderArticle(
      `
      <article class="post-body">
        <h2>첫 섹션</h2>
        <div class="body-group">
          <h3>둘째 섹션</h3>
        </div>
      </article>
      <div class="another-category">
        <h4>관련 글 제목</h4>
      </div>
    `,
      { tagName: "div" },
    );

    const scope = getRequiredElement(article, ".post-body", HTMLElement);
    const relatedCategory = getRequiredElement(
      article,
      ".another-category",
      HTMLElement,
    );
    mockRect(article, {
      top: 100,
      left: 0,
      width: 220,
      height: 1200,
    });
    mockRect(scope, {
      top: 100,
      left: 240,
      width: 820,
      height: 1200,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3, h4");
    mockRect(headings[0], { top: 120 });
    mockRect(headings[1], { top: 360 });
    mockRect(headings[2], { top: 720 });
    mockRect(relatedCategory, {
      top: 760,
      left: 240,
      width: 820,
      height: 320,
    });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    expect(root.hidden).toBe(false);
    expect(root.style.getPropertyValue("--rp-toc-left")).toBe("1316px");
    expect(root.style.getPropertyValue("--rp-toc-width")).toBe("252px");
  });

  it("uses the first another-category boundary after the last heading as the bottom clamp", async () => {
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get() {
        return this.classList.contains("rp-toc") ? (this.hidden ? 0 : 447) : 40;
      },
    });

    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return this.classList.contains("rp-toc") ? 447 : 40;
      },
    });

    const article = renderArticle(
      `
      <h2>첫 섹션</h2>
      <h3>둘째 섹션</h3>
      <div class="another-category">관련 글</div>
      <div class="ad-slot">광고</div>
    `,
      { tagName: "article" },
    );

    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 900,
      writable: true,
    });

    Object.defineProperty(document.documentElement, "clientHeight", {
      configurable: true,
      value: 900,
    });

    mockRect(article, {
      top: -200,
      left: 240,
      width: 820,
      height: 1800,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3");
    const relatedCategory = getRequiredElement(
      article,
      ".another-category",
      HTMLElement,
    );

    mockRect(headings[0], { top: -120 });
    mockRect(headings[1], { top: 80 });
    mockRect(relatedCategory, { top: 12, height: 500 });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    expect(root.hidden).toBe(false);
    expect(root.style.getPropertyValue("--rp-toc-top")).toBe("41px");
  });

  it("measures the toc height before revealing it", async () => {
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get() {
        return this.classList.contains("rp-toc") ? (this.hidden ? 0 : 447) : 40;
      },
    });

    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return this.classList.contains("rp-toc") ? 447 : 40;
      },
    });

    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 900,
      writable: true,
    });

    Object.defineProperty(document.documentElement, "clientHeight", {
      configurable: true,
      value: 900,
    });

    const article = renderArticle(
      `
      <h2>첫 섹션</h2>
      <h3>둘째 섹션</h3>
      <div class="another-category">관련 글</div>
      <div class="ad-slot">광고</div>
    `,
      { tagName: "article" },
    );

    mockRect(article, {
      top: -200,
      left: 240,
      width: 820,
      height: 1800,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3");
    const relatedCategory = getRequiredElement(
      article,
      ".another-category",
      HTMLElement,
    );

    mockRect(headings[0], { top: -120 });
    mockRect(headings[1], { top: 80 });
    mockRect(relatedCategory, { top: 12, height: 500 });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    expect(root.hidden).toBe(false);
    expect(root.style.getPropertyValue("--rp-toc-top")).toBe("41px");
  });

  it("uses the underscore related-category variant as the bottom clamp", async () => {
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get() {
        return this.classList.contains("rp-toc") ? 447 : 40;
      },
    });

    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return this.classList.contains("rp-toc") ? 447 : 40;
      },
    });

    const article = renderArticle(
      `
      <h2>첫 섹션</h2>
      <h3>둘째 섹션</h3>
      <div class="another_category">관련 글</div>
      <div class="ad-slot">광고</div>
    `,
      { tagName: "article" },
    );

    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 900,
      writable: true,
    });

    Object.defineProperty(document.documentElement, "clientHeight", {
      configurable: true,
      value: 900,
    });

    mockRect(article, {
      top: -200,
      left: 240,
      width: 820,
      height: 1800,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3");
    const relatedCategory = getRequiredElement(
      article,
      ".another_category",
      HTMLElement,
    );

    mockRect(headings[0], { top: -120 });
    mockRect(headings[1], { top: 80 });
    mockRect(relatedCategory, { top: 12, height: 500 });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    expect(root.hidden).toBe(false);
    expect(root.style.getPropertyValue("--rp-toc-top")).toBe("41px");
  });

  it("moves with the article until it can settle at the viewport center", async () => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 960,
      writable: true,
    });

    Object.defineProperty(document.documentElement, "clientHeight", {
      configurable: true,
      value: 960,
    });

    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get() {
        return this.classList.contains("rp-toc") ? 447 : 40;
      },
    });

    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return this.classList.contains("rp-toc") ? 447 : 40;
      },
    });

    const article = renderArticle(
      `
      <h2>첫 섹션</h2>
      <h2>둘째 섹션</h2>
      <h3>셋째 섹션</h3>
      `,
      { tagName: "article" },
    );

    mockRect(article, {
      top: 320,
      left: 240,
      width: 820,
      height: 2400,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3");
    mockRect(headings[0], { top: 520 });
    mockRect(headings[1], { top: 860 });
    mockRect(headings[2], { top: 1240 });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    expect(root.hidden).toBe(false);
    expect(root.style.getPropertyValue("--rp-toc-top")).toBe("320px");
  });
});
