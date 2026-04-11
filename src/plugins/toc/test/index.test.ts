import {
  getRequiredElement,
  getRequiredElements,
  renderArticle,
  setBodyHtml,
} from "@test/dom";
import { describe, expect, it } from "vitest";
import {
  flushAll,
  getTocTestMocks,
  loadTocPlugin,
  mockRect,
  setupTocTest,
} from "./test-helpers";

describe("toc plugin", () => {
  setupTocTest();

  it("renders a desktop toc with generated heading ids", async () => {
    const article = renderArticle(
      `
      <h2>소개</h2>
      <h2>소개</h2>
      <h3>세부 항목</h3>
      <h4>더 깊은 항목</h4>
    `,
      { tagName: "article" },
    );

    mockRect(article, {
      top: 120,
      left: 260,
      width: 820,
      height: 1800,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3, h4");
    mockRect(headings[0], { top: 120 });
    mockRect(headings[1], { top: 420 });
    mockRect(headings[2], { top: 640 });
    mockRect(headings[3], { top: 860 });

    await loadTocPlugin();
    await flushAll();

    expect(headings[0].id).toBe("rp-소개");
    expect(headings[1].id).toBe("rp-소개-2");
    expect(headings[2].id).toBe("rp-세부-항목");
    expect(headings[3].id).toBe("rp-더-깊은-항목");

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    const links = getRequiredElements<HTMLAnchorElement>(root, ".rp-toc-link");
    const stylesheet = document.head.querySelector("#tistory-plugins-toc-css");

    expect(root.hidden).toBe(false);
    expect(root.parentElement).toBe(document.body);
    expect(stylesheet).toBeInstanceOf(HTMLLinkElement);
    expect(stylesheet).toHaveAttribute("rel", "stylesheet");
    expect(stylesheet).toHaveAttribute(
      "href",
      "https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/toc/index.min.css",
    );
    expect(links).toHaveLength(4);
    expect(links[0].getAttribute("href")).toBe("#rp-소개");
    expect(links[0].dataset.tooltip).toBe("소개");
    expect(links[0].getAttribute("aria-label")).toBe("소개");
    expect(links[1].dataset.level).toBe("2");
    expect(links[2].dataset.level).toBe("3");
    expect(links[3].dataset.level).toBe("4");
  });

  it("prefixes generated toc ids to avoid skin id collisions", async () => {
    const article = renderArticle(
      `
      <h2>PAGINATION</h2>
      <h2>다음 섹션</h2>
    `,
      { tagName: "article" },
    );
    const pagination = document.createElement("nav");
    pagination.id = "pagination";
    document.body.append(pagination);

    mockRect(article, {
      top: 120,
      left: 260,
      width: 820,
      height: 1200,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2");
    mockRect(headings[0], { top: 120 });
    mockRect(headings[1], { top: 420 });

    await loadTocPlugin();
    await flushAll();

    const links = getRequiredElements<HTMLAnchorElement>(
      document,
      ".rp-toc-link",
    );

    expect(document.getElementById("pagination")).toBe(pagination);
    expect(headings[0].id).toBe("rp-pagination");
    expect(links[0].getAttribute("href")).toBe("#rp-pagination");
  });

  it("does not add duplicate toc containers when loaded again", async () => {
    const article = renderArticle(
      `
      <h2>첫 번째</h2>
      <h3>두 번째</h3>
    `,
      { tagName: "article" },
    );

    mockRect(article, {
      top: 100,
      left: 240,
      width: 840,
      height: 1200,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3");
    mockRect(headings[0], { top: 120 });
    mockRect(headings[1], { top: 360 });

    await loadTocPlugin();
    await flushAll();
    await loadTocPlugin();
    await flushAll();

    expect(document.querySelectorAll(".rp-toc")).toHaveLength(1);
    expect(document.querySelectorAll(".rp-toc-link")).toHaveLength(2);
    expect(document.querySelectorAll("#tistory-plugins-toc-css")).toHaveLength(
      1,
    );
  });

  it("does not bind duplicate click handlers when loaded again", async () => {
    const { replaceStateSpy, scrollToMock } = getTocTestMocks();
    const article = renderArticle(
      `
      <h2>첫 번째</h2>
      <h3>두 번째</h3>
    `,
      { tagName: "article" },
    );

    mockRect(article, {
      top: 100,
      left: 240,
      width: 820,
      height: 1500,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3");
    mockRect(headings[0], { top: 80 });
    mockRect(headings[1], { top: 180 });

    await loadTocPlugin();
    await flushAll();
    await loadTocPlugin();
    await flushAll();

    scrollToMock.mockClear();
    replaceStateSpy.mockClear();

    const links = getRequiredElements<HTMLAnchorElement>(
      document,
      ".rp-toc-link",
    );

    links[1].dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        detail: 1,
      }),
    );

    expect(replaceStateSpy).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 396,
      behavior: "smooth",
    });
  });

  it("keeps the toc invisible until the load event settles the initial layout", async () => {
    Object.defineProperty(document, "readyState", {
      configurable: true,
      value: "interactive",
    });

    const article = renderArticle(
      `
      <h2>첫 섹션</h2>
      <h3>둘째 섹션</h3>
      `,
      { tagName: "article" },
    );

    mockRect(article, {
      top: 120,
      left: 260,
      width: 820,
      height: 1800,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3");
    mockRect(headings[0], { top: 220 });
    mockRect(headings[1], { top: 560 });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    expect(root.hidden).toBe(false);
    expect(root.classList.contains("rp-toc--pending")).toBe(true);
    expect(root.style.visibility).toBe("hidden");
    expect(root.style.pointerEvents).toBe("none");
    expect(root.style.getPropertyValue("--rp-toc-top")).not.toBe("");

    window.dispatchEvent(new Event("load"));
    await flushAll();

    expect(root.classList.contains("rp-toc--pending")).toBe(false);
    expect(root.style.visibility).toBe("");
    expect(root.style.pointerEvents).toBe("");
  });

  it("preselects the hashed entry while keeping the toc pending until load", async () => {
    Object.defineProperty(document, "readyState", {
      configurable: true,
      value: "interactive",
    });

    location.hash = "#둘째-섹션";

    const article = renderArticle(
      `
      <h2>첫 섹션</h2>
      <h2>둘째 섹션</h2>
      <h3>셋째 섹션</h3>
      `,
      { tagName: "article" },
    );

    mockRect(article, {
      top: 120,
      left: 260,
      width: 820,
      height: 1800,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3");
    mockRect(headings[0], { top: 220 });
    mockRect(headings[1], { top: 560 });
    mockRect(headings[2], { top: 900 });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    const links = getRequiredElements<HTMLAnchorElement>(root, ".rp-toc-link");

    expect(root.classList.contains("rp-toc--pending")).toBe(true);
    expect(links[1]).toHaveAttribute("aria-current", "location");
    expect(links[0]).not.toHaveAttribute("aria-current");

    window.dispatchEvent(new Event("load"));
    await flushAll();

    expect(root.classList.contains("rp-toc--pending")).toBe(false);
  });

  it("prefers an exact hashed id over a generated prefixed fallback", async () => {
    Object.defineProperty(document, "readyState", {
      configurable: true,
      value: "interactive",
    });

    location.hash = "#대상";

    const article = renderArticle(
      `
      <h2>대상</h2>
      <h2 id="대상">명시 대상</h2>
      `,
      { tagName: "article" },
    );

    mockRect(article, {
      top: 120,
      left: 260,
      width: 820,
      height: 1200,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2");
    mockRect(headings[0], { top: 220 });
    mockRect(headings[1], { top: 560 });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    const links = getRequiredElements<HTMLAnchorElement>(root, ".rp-toc-link");

    expect(headings[0].id).toBe("rp-대상");
    expect(headings[1].id).toBe("대상");
    expect(links[1]).toHaveAttribute("aria-current", "location");
    expect(links[0]).not.toHaveAttribute("aria-current");
  });

  it("rebuilds the toc when the initial article container is replaced after load", async () => {
    setBodyHtml(`
      <div id="mount">
        <div class="tt_article_useless_p_margin contents_style">
          <h2>초기 섹션</h2>
          <h3>초기 하위 섹션</h3>
        </div>
      </div>
    `);

    const initialArticle = getRequiredElement(
      document,
      ".contents_style",
      HTMLElement,
    );
    mockRect(initialArticle, {
      top: 120,
      left: 240,
      width: 820,
      height: 1600,
    });

    const initialHeadings = getRequiredElements<HTMLElement>(
      initialArticle,
      "h2, h3",
    );
    mockRect(initialHeadings[0], { top: 120 });
    mockRect(initialHeadings[1], { top: 420 });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    expect(root.hidden).toBe(false);

    const mount = getRequiredElement(document, "#mount", HTMLElement);
    mount.innerHTML = `
      <div id="article">
        <h2>교체된 섹션</h2>
        <h3>교체된 하위 섹션</h3>
      </div>
    `;

    const replacedArticle = getRequiredElement(
      document,
      "#article",
      HTMLElement,
    );
    mockRect(replacedArticle, {
      top: 160,
      left: 360,
      width: 820,
      height: 1700,
    });

    const replacedHeadings = getRequiredElements<HTMLElement>(
      replacedArticle,
      "h2, h3",
    );
    mockRect(replacedHeadings[0], { top: 180 });
    mockRect(replacedHeadings[1], { top: 520 });

    window.dispatchEvent(new Event("load"));
    await flushAll();

    const links = getRequiredElements<HTMLAnchorElement>(root, ".rp-toc-link");

    expect(root.hidden).toBe(false);
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute("href")).toBe("#rp-교체된-섹션");
    expect(links[1].getAttribute("href")).toBe("#rp-교체된-하위-섹션");
    expect(replacedHeadings[0].id).toBe("rp-교체된-섹션");
    expect(replacedHeadings[1].id).toBe("rp-교체된-하위-섹션");
  });

  it("strips heading-anchor markers and ignores related-post headings", async () => {
    const article = renderArticle(
      `
      <h2 class="rp-heading-target">
        <a class="rp-heading-anchor" href="#적용-방법">
          적용 방법
          <span class="rp-heading-anchor-marker" aria-hidden="true">#</span>
        </a>
      </h2>
      <h4 class="rp-heading-target">
        <a class="rp-heading-anchor" href="#세부-설정">
          세부 설정
          <span class="rp-heading-anchor-marker" aria-hidden="true">#</span>
        </a>
      </h4>
      <div class="another-category">
        <h4>관련 글 제목</h4>
      </div>
    `,
      { tagName: "article" },
    );

    mockRect(article, {
      top: 100,
      left: 260,
      width: 820,
      height: 1500,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h4");
    mockRect(headings[0], { top: 120 });
    mockRect(headings[1], { top: 420 });
    mockRect(headings[2], { top: 720 });

    await loadTocPlugin();
    await flushAll();

    const links = getRequiredElements<HTMLAnchorElement>(
      document,
      ".rp-toc-link",
    );

    expect(links).toHaveLength(2);
    expect(links[0].textContent).toBe("적용 방법");
    expect(links[1].textContent).toBe("세부 설정");
  });
});
