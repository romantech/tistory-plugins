import {
  getRequiredElement,
  getRequiredElements,
  renderArticle,
} from "@test/dom";
import { beforeEach, describe, expect, it } from "vitest";
import {
  flushAll,
  flushAnimationFrame,
  getTocTestMocks,
  loadTocPlugin,
  mockRect,
  setupTocTest,
  setViewportWidth,
  setVisualViewport,
} from "./test-helpers";

describe("toc plugin mobile layout", () => {
  let replaceStateSpy: ReturnType<typeof getTocTestMocks>["replaceStateSpy"];

  setupTocTest();

  beforeEach(() => {
    ({ replaceStateSpy } = getTocTestMocks());
  });

  it("switches to a mobile toc on narrower viewports and respects configured levels", async () => {
    const article = renderArticle(
      `
      <h2>숨겨질 제목</h2>
      <h3>보일 제목</h3>
      <h4>또 다른 제목</h4>
    `,
      { tagName: "article" },
    );

    (
      window as typeof window & {
        RPPlugins?: Record<string, unknown>;
      }
    ).RPPlugins = {
      toc: {
        levels: [3, 4],
        headerOffset: 40,
      },
    };

    setViewportWidth(1180);

    mockRect(article, {
      top: 100,
      left: 200,
      width: 760,
      height: 1200,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3, h4");
    mockRect(headings[0], { top: 120 });
    mockRect(headings[1], { top: 360 });
    mockRect(headings[2], { top: 620 });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    const toggle = getRequiredElement(
      root,
      ".rp-toc-toggle",
      HTMLButtonElement,
    );
    const panel = getRequiredElement(root, ".rp-toc-panel", HTMLElement);
    const links = getRequiredElements<HTMLAnchorElement>(root, ".rp-toc-link");

    expect(root.hidden).toBe(false);
    expect(root.dataset.layout).toBe("mobile");
    expect(toggle.hidden).toBe(false);
    expect(root.dataset.mobileExpanded).toBe("false");
    expect(root.dataset.scrollFade).toBeUndefined();
    expect(panel.hidden).toBe(false);
    expect(panel.getAttribute("aria-hidden")).toBe("true");
    expect(toggle.textContent).toContain("보일 제목");
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute("href")).toBe("#rp-보일-제목");
    expect(links[1].getAttribute("href")).toBe("#rp-또-다른-제목");
  });

  it("expands the mobile toc from the bottom button and closes it after selecting a section", async () => {
    const article = renderArticle(
      `
      <h2>소개</h2>
      <h3>설치</h3>
      <h3>설정</h3>
    `,
      { tagName: "article" },
    );

    setViewportWidth(1180);

    mockRect(article, {
      top: 100,
      left: 200,
      width: 760,
      height: 1200,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3");
    mockRect(headings[0], { top: 120 });
    mockRect(headings[1], { top: 360 });
    mockRect(headings[2], { top: 620 });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    const toggle = getRequiredElement(
      root,
      ".rp-toc-toggle",
      HTMLButtonElement,
    );
    const panel = getRequiredElement(root, ".rp-toc-panel", HTMLElement);
    const links = getRequiredElements<HTMLAnchorElement>(root, ".rp-toc-link");

    expect(root.dataset.layout).toBe("mobile");
    expect(panel.hidden).toBe(false);
    expect(panel.getAttribute("aria-hidden")).toBe("true");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    toggle.click();
    await flushAnimationFrame();

    expect(panel.hidden).toBe(false);
    expect(panel.getAttribute("aria-hidden")).toBe("false");
    expect(root.dataset.mobileExpanded).toBe("true");
    expect(root.dataset.scrollFade).toBeUndefined();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");

    links[1].dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        detail: 1,
      }),
    );

    expect(panel.hidden).toBe(false);
    expect(panel.getAttribute("aria-hidden")).toBe("true");
    expect(root.dataset.mobileExpanded).toBe("false");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(replaceStateSpy).toHaveBeenLastCalledWith(null, "", "#rp-설치");
  });

  it("opens the mobile toc panel below the button when there is not enough room above", async () => {
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
      <h2>소개</h2>
      <h3>설치</h3>
      <h3>설정</h3>
    `,
      { tagName: "article" },
    );

    setViewportWidth(390);

    mockRect(article, {
      top: 100,
      left: 20,
      width: 350,
      height: 1200,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3");
    mockRect(headings[0], { top: 120 });
    mockRect(headings[1], { top: 360 });
    mockRect(headings[2], { top: 620 });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    const toggle = getRequiredElement(
      root,
      ".rp-toc-toggle",
      HTMLButtonElement,
    );
    const panel = getRequiredElement(root, ".rp-toc-panel", HTMLElement);

    mockRect(toggle, {
      top: 80,
      left: 330,
      width: 44,
      height: 44,
    });

    Object.defineProperty(panel, "offsetHeight", {
      configurable: true,
      value: 240,
    });
    Object.defineProperty(panel, "scrollHeight", {
      configurable: true,
      value: 240,
    });
    Object.defineProperty(panel, "clientHeight", {
      configurable: true,
      value: 240,
    });

    toggle.click();
    await flushAnimationFrame();

    expect(root.dataset.mobileExpanded).toBe("true");
    expect(root.dataset.mobilePanelDirection).toBe("down");
    expect(panel.getAttribute("aria-hidden")).toBe("false");
  });

  it("clamps the mobile toc panel height to fit the available downward space", async () => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 220,
      writable: true,
    });

    Object.defineProperty(document.documentElement, "clientHeight", {
      configurable: true,
      value: 220,
    });

    const article = renderArticle(
      `
      <h2>소개</h2>
      <h3>설치</h3>
      <h3>설정</h3>
    `,
      { tagName: "article" },
    );

    setViewportWidth(390);

    mockRect(article, {
      top: 0,
      left: 20,
      width: 350,
      height: 1200,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3");
    mockRect(headings[0], { top: 120 });
    mockRect(headings[1], { top: 360 });
    mockRect(headings[2], { top: 620 });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    const toggle = getRequiredElement(
      root,
      ".rp-toc-toggle",
      HTMLButtonElement,
    );
    const panel = getRequiredElement(root, ".rp-toc-panel", HTMLElement);

    mockRect(toggle, {
      top: 80,
      left: 330,
      width: 44,
      height: 44,
    });

    Object.defineProperty(panel, "offsetHeight", {
      configurable: true,
      value: 240,
    });
    Object.defineProperty(panel, "scrollHeight", {
      configurable: true,
      value: 240,
    });
    Object.defineProperty(panel, "clientHeight", {
      configurable: true,
      value: 240,
    });

    toggle.click();
    await flushAnimationFrame();

    expect(root.dataset.mobilePanelDirection).toBe("down");
    expect(
      panel.style.getPropertyValue("--rp-toc-mobile-panel-max-height"),
    ).toBe("min(50px, 39vh, 292px)");
  });

  it("prefers the visual viewport height when placing the mobile toc panel", async () => {
    setVisualViewport({
      height: 240,
      offsetTop: 0,
      width: 390,
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
      <h2>소개</h2>
      <h3>설치</h3>
      <h3>설정</h3>
    `,
      { tagName: "article" },
    );

    setViewportWidth(390);

    mockRect(article, {
      top: 0,
      left: 20,
      width: 350,
      height: 1200,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3");
    mockRect(headings[0], { top: 120 });
    mockRect(headings[1], { top: 360 });
    mockRect(headings[2], { top: 620 });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    const toggle = getRequiredElement(
      root,
      ".rp-toc-toggle",
      HTMLButtonElement,
    );
    const panel = getRequiredElement(root, ".rp-toc-panel", HTMLElement);

    mockRect(toggle, {
      top: 120,
      left: 330,
      width: 44,
      height: 44,
    });

    Object.defineProperty(panel, "offsetHeight", {
      configurable: true,
      value: 240,
    });
    Object.defineProperty(panel, "scrollHeight", {
      configurable: true,
      value: 240,
    });
    Object.defineProperty(panel, "clientHeight", {
      configurable: true,
      value: 240,
    });

    toggle.click();
    await flushAnimationFrame();

    expect(root.dataset.mobilePanelDirection).toBe("up");
    expect(
      panel.style.getPropertyValue("--rp-toc-mobile-panel-max-height"),
    ).toBe("min(74px, 39vh, 292px)");
  });

  it("lets the mobile toc button move vertically without toggling the panel after a drag", async () => {
    const article = renderArticle(
      `
      <h2>소개</h2>
      <h3>설치</h3>
      <h3>설정</h3>
    `,
      { tagName: "article" },
    );

    setViewportWidth(390);

    mockRect(article, {
      top: 100,
      left: 20,
      width: 350,
      height: 1200,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3");
    mockRect(headings[0], { top: 120 });
    mockRect(headings[1], { top: 360 });
    mockRect(headings[2], { top: 620 });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    const toggle = getRequiredElement(
      root,
      ".rp-toc-toggle",
      HTMLButtonElement,
    );
    const panel = getRequiredElement(root, ".rp-toc-panel", HTMLElement);

    mockRect(root, {
      top: 680,
      left: 98,
      width: 280,
      height: 64,
    });

    toggle.dispatchEvent(
      new MouseEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: 350,
        clientY: 720,
      }),
    );
    toggle.dispatchEvent(
      new MouseEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        clientX: 320,
        clientY: 664,
      }),
    );
    toggle.dispatchEvent(
      new MouseEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        clientX: 320,
        clientY: 664,
      }),
    );

    expect(root.style.getPropertyValue("--rp-toc-mobile-offset-x")).toBe("0px");
    expect(root.style.getPropertyValue("--rp-toc-mobile-offset-y")).toBe(
      "-56px",
    );

    toggle.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        detail: 1,
      }),
    );

    expect(panel.getAttribute("aria-hidden")).toBe("true");
    expect(root.dataset.mobileExpanded).toBe("false");
  });

  it("does not treat horizontal-only movement as a drag", async () => {
    const article = renderArticle(
      `
      <h2>소개</h2>
      <h3>설치</h3>
      <h3>설정</h3>
    `,
      { tagName: "article" },
    );

    setViewportWidth(390);

    mockRect(article, {
      top: 100,
      left: 20,
      width: 350,
      height: 1200,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3");
    mockRect(headings[0], { top: 120 });
    mockRect(headings[1], { top: 360 });
    mockRect(headings[2], { top: 620 });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    const toggle = getRequiredElement(
      root,
      ".rp-toc-toggle",
      HTMLButtonElement,
    );
    const panel = getRequiredElement(root, ".rp-toc-panel", HTMLElement);

    mockRect(root, {
      top: 680,
      left: 98,
      width: 280,
      height: 64,
    });

    toggle.dispatchEvent(
      new MouseEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: 350,
        clientY: 720,
      }),
    );
    toggle.dispatchEvent(
      new MouseEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        clientX: 280,
        clientY: 720,
      }),
    );
    toggle.dispatchEvent(
      new MouseEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        clientX: 280,
        clientY: 720,
      }),
    );

    expect(root.style.getPropertyValue("--rp-toc-mobile-offset-x")).toBe("0px");
    expect(root.style.getPropertyValue("--rp-toc-mobile-offset-y")).toBe("");

    toggle.click();
    await flushAnimationFrame();

    expect(panel.getAttribute("aria-hidden")).toBe("false");
    expect(root.dataset.mobileExpanded).toBe("true");
  });

  it("resets stale horizontal mobile offset on resize", async () => {
    const article = renderArticle(
      `
      <h2>소개</h2>
      <h3>설치</h3>
      <h3>설정</h3>
    `,
      { tagName: "article" },
    );

    setViewportWidth(390);

    mockRect(article, {
      top: 100,
      left: 20,
      width: 350,
      height: 1200,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3");
    mockRect(headings[0], { top: 120 });
    mockRect(headings[1], { top: 360 });
    mockRect(headings[2], { top: 620 });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);

    expect(root.dataset.layout).toBe("mobile");

    root.style.setProperty("--rp-toc-mobile-offset-x", "-120px");

    setViewportWidth(360);
    window.dispatchEvent(new Event("resize"));
    await flushAll();

    expect(root.dataset.layout).toBe("mobile");
    expect(root.style.getPropertyValue("--rp-toc-mobile-offset-x")).toBe("0px");
  });

  it("does not let the mobile toc button enter the header area while dragging", async () => {
    const article = renderArticle(
      `
      <h2>소개</h2>
      <h3>설치</h3>
      <h3>설정</h3>
    `,
      { tagName: "article" },
    );

    (
      window as typeof window & {
        RPPlugins?: Record<string, unknown>;
      }
    ).RPPlugins = {
      toc: {
        headerOffset: 72,
      },
    };

    setViewportWidth(390);

    mockRect(article, {
      top: 100,
      left: 20,
      width: 350,
      height: 1200,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3");
    mockRect(headings[0], { top: 120 });
    mockRect(headings[1], { top: 360 });
    mockRect(headings[2], { top: 620 });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    const toggle = getRequiredElement(
      root,
      ".rp-toc-toggle",
      HTMLButtonElement,
    );

    mockRect(root, {
      top: 140,
      left: 98,
      width: 280,
      height: 64,
    });

    toggle.dispatchEvent(
      new MouseEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: 350,
        clientY: 200,
      }),
    );
    toggle.dispatchEvent(
      new MouseEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        clientX: 350,
        clientY: 80,
      }),
    );
    toggle.dispatchEvent(
      new MouseEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        clientX: 350,
        clientY: 80,
      }),
    );

    expect(root.style.getPropertyValue("--rp-toc-mobile-offset-y")).toBe(
      "-68px",
    );
  });

  it("restores the desktop toc position and interactivity after resizing up from mobile", async () => {
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
        if (!this.classList.contains("rp-toc")) {
          return 40;
        }

        return (this as HTMLElement).dataset.layout === "mobile" ? 56 : 447;
      },
    });

    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        if (!this.classList.contains("rp-toc")) {
          return 40;
        }

        return (this as HTMLElement).dataset.layout === "mobile" ? 56 : 447;
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

    setViewportWidth(1180);

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
    const panel = getRequiredElement(root, ".rp-toc-panel", HTMLElement);

    expect(root.dataset.layout).toBe("mobile");

    setViewportWidth(1600);
    window.dispatchEvent(new Event("resize"));
    await flushAll();

    expect(root.dataset.layout).toBe("desktop");
    expect(panel.hasAttribute("inert")).toBe(false);
    expect(panel.getAttribute("aria-hidden")).toBe("false");
    expect(root.style.getPropertyValue("--rp-toc-top")).toBe("320px");
  });

  it("hides the mobile toc when the related-category boundary reaches the button zone", async () => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 900,
      writable: true,
    });

    Object.defineProperty(document.documentElement, "clientHeight", {
      configurable: true,
      value: 900,
    });

    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get() {
        if (!this.classList.contains("rp-toc")) {
          return 40;
        }

        return (this as HTMLElement).dataset.layout === "mobile" ? 56 : 447;
      },
    });

    const article = renderArticle(
      `
      <h2>첫 섹션</h2>
      <h3>둘째 섹션</h3>
      <div class="another-category">관련 글</div>
    `,
      { tagName: "article" },
    );

    setViewportWidth(390);

    mockRect(article, {
      top: -180,
      left: 20,
      width: 350,
      height: 1800,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3");
    const relatedCategory = getRequiredElement(
      article,
      ".another-category",
      HTMLElement,
    );

    mockRect(headings[0], { top: -120 });
    mockRect(headings[1], { top: 120 });
    mockRect(relatedCategory, {
      top: 980,
      left: 20,
      width: 350,
      height: 220,
    });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    expect(root.hidden).toBe(false);
    expect(root.dataset.layout).toBe("mobile");

    mockRect(relatedCategory, {
      top: 900,
      left: 20,
      width: 350,
      height: 220,
    });

    window.dispatchEvent(new Event("scroll"));
    await flushAll();

    expect(root.hidden).toBe(true);
    expect(root.dataset.layout).toBe("mobile");

    window.dispatchEvent(new Event("scroll"));
    await flushAll();

    expect(root.hidden).toBe(true);
    expect(root.dataset.layout).toBe("mobile");
  });

  it("updates the mobile boundary threshold after dragging the toc button", async () => {
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
    `,
      { tagName: "article" },
    );

    setViewportWidth(390);

    mockRect(article, {
      top: -180,
      left: 20,
      width: 350,
      height: 1800,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3");
    const relatedCategory = getRequiredElement(
      article,
      ".another-category",
      HTMLElement,
    );

    mockRect(headings[0], { top: -120 });
    mockRect(headings[1], { top: 120 });
    mockRect(relatedCategory, {
      top: 940,
      left: 20,
      width: 350,
      height: 220,
    });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    const toggle = getRequiredElement(
      root,
      ".rp-toc-toggle",
      HTMLButtonElement,
    );

    mockRect(root, {
      top: 812,
      left: 98,
      width: 280,
      height: 44,
    });

    toggle.dispatchEvent(
      new MouseEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: 350,
        clientY: 840,
      }),
    );
    toggle.dispatchEvent(
      new MouseEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        clientX: 350,
        clientY: 784,
      }),
    );
    toggle.dispatchEvent(
      new MouseEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        clientX: 350,
        clientY: 784,
      }),
    );

    window.dispatchEvent(new Event("scroll"));
    await flushAll();

    expect(root.style.getPropertyValue("--rp-toc-mobile-offset-y")).toBe(
      "-56px",
    );
    expect(root.hidden).toBe(false);
  });
});
