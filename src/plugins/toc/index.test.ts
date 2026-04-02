import {
  appendPluginScript,
  getRequiredElement,
  getRequiredElements,
  renderArticle,
  setBodyHtml,
} from "@test/dom";
import { createPluginLoader } from "@test/load-plugin";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("toc plugin", () => {
  const loadTocPlugin = createPluginLoader(() => import("@/plugins/toc"));

  let originalFonts: PropertyDescriptor | undefined;
  let originalVisualViewport: PropertyDescriptor | undefined;
  let originalOffsetHeight: PropertyDescriptor | undefined;
  let originalScrollHeight: PropertyDescriptor | undefined;
  let originalReadyState: PropertyDescriptor | undefined;

  let scrollToMock: ReturnType<typeof vi.fn>;
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;
  let requestAnimationFrameMock: ReturnType<typeof vi.fn>;
  let cancelAnimationFrameMock: ReturnType<typeof vi.fn>;

  type RectValue = {
    top: number;
    left?: number;
    width?: number;
    height?: number;
  };

  async function flushMicrotasks(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
  }

  async function flushAnimationFrame(): Promise<void> {
    await flushMicrotasks();
    vi.advanceTimersByTime(0);
    await flushMicrotasks();
  }

  async function flushAll(cycles = 6): Promise<void> {
    for (let index = 0; index < cycles; index += 1) {
      await flushMicrotasks();
      vi.runOnlyPendingTimers();
    }
    await flushMicrotasks();
  }

  function setFontsReady(): void {
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: {
        ready: Promise.resolve(),
      },
    });
  }

  function setVisualViewport(): void {
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: {
        addEventListener: vi.fn(),
      },
    });
  }

  function setViewportWidth(width: number): void {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: width,
      writable: true,
    });

    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      value: width,
    });
  }

  function mockRect(element: Element, rect: RectValue): void {
    const left = rect.left ?? 0;
    const width = rect.width ?? 100;
    const top = rect.top;
    const height = rect.height ?? 40;

    Object.defineProperty(element, "getBoundingClientRect", {
      configurable: true,
      value: vi.fn(() => ({
        top,
        bottom: top + height,
        left,
        right: left + width,
        width,
        height,
        x: left,
        y: top,
        toJSON: () => ({}),
      })),
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    appendPluginScript("toc");

    originalFonts = Object.getOwnPropertyDescriptor(document, "fonts");
    originalVisualViewport = Object.getOwnPropertyDescriptor(
      window,
      "visualViewport",
    );
    originalOffsetHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "offsetHeight",
    );
    originalScrollHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollHeight",
    );
    originalReadyState = Object.getOwnPropertyDescriptor(
      document,
      "readyState",
    );

    scrollToMock = vi.fn();

    requestAnimationFrameMock = vi.fn((callback: FrameRequestCallback) => {
      return window.setTimeout(() => callback(performance.now()), 0);
    });

    cancelAnimationFrameMock = vi.fn((id: number) => {
      window.clearTimeout(id);
    });

    vi.stubGlobal("scrollTo", scrollToMock);
    vi.stubGlobal("requestAnimationFrame", requestAnimationFrameMock);
    vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrameMock);

    replaceStateSpy = vi
      .spyOn(history, "replaceState")
      .mockImplementation(() => undefined);

    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 300,
      writable: true,
    });

    document.documentElement.style.setProperty("--header-height", "84px");

    setViewportWidth(1600);
    setFontsReady();
    setVisualViewport();
  });

  afterEach(() => {
    document.documentElement.style.removeProperty("--header-height");

    if (originalFonts) {
      Object.defineProperty(document, "fonts", originalFonts);
    } else {
      Reflect.deleteProperty(document, "fonts");
    }

    if (originalVisualViewport) {
      Object.defineProperty(window, "visualViewport", originalVisualViewport);
    } else {
      Reflect.deleteProperty(window, "visualViewport");
    }

    if (originalOffsetHeight) {
      Object.defineProperty(
        HTMLElement.prototype,
        "offsetHeight",
        originalOffsetHeight,
      );
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, "offsetHeight");
    }

    if (originalScrollHeight) {
      Object.defineProperty(
        HTMLElement.prototype,
        "scrollHeight",
        originalScrollHeight,
      );
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, "scrollHeight");
    }

    if (originalReadyState) {
      Object.defineProperty(document, "readyState", originalReadyState);
    } else {
      Reflect.deleteProperty(document, "readyState");
    }
  });

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

    expect(headings[0].id).toBe("소개");
    expect(headings[1].id).toBe("소개-2");
    expect(headings[2].id).toBe("세부-항목");
    expect(headings[3].id).toBe("더-깊은-항목");

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
    expect(links[0].getAttribute("href")).toBe("#소개");
    expect(links[0].dataset.tooltip).toBe("소개");
    expect(links[0].getAttribute("aria-label")).toBe("소개");
    expect(links[1].dataset.level).toBe("2");
    expect(links[2].dataset.level).toBe("3");
    expect(links[3].dataset.level).toBe("4");
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

  it("updates the hash and scroll position when a toc item is clicked", async () => {
    const article = renderArticle(
      `
      <h2>소개</h2>
      <h3>클릭 대상</h3>
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

    const links = getRequiredElements<HTMLAnchorElement>(
      document,
      ".rp-toc-link",
    );

    links[1].focus();
    links[1].dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        detail: 1,
      }),
    );

    expect(replaceStateSpy).toHaveBeenCalledWith(null, "", "#클릭-대상");
    expect(scrollToMock).toHaveBeenLastCalledWith({
      top: 396,
      behavior: "smooth",
    });
    expect(links[0]).toHaveAttribute("aria-current", "location");
    expect(links[1]).not.toHaveAttribute("aria-current");
    expect(document.activeElement).not.toBe(links[1]);
  });

  it("waits for incomplete images above the first target before scrolling", async () => {
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 0,
      writable: true,
    });

    const article = renderArticle(
      `
      <h2>첫 섹션</h2>
      <img src="/above.jpg" alt="위쪽 이미지" loading="lazy" />
      <h3>둘째 섹션</h3>
      <img src="/below.jpg" alt="아래쪽 이미지" loading="lazy" />
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
    const images = getRequiredElements<HTMLImageElement>(article, "img");
    mockRect(headings[0], { top: 220 });
    mockRect(headings[1], { top: 760 });

    let isAboveImageLoaded = false;
    const isBelowImageLoaded = false;

    Object.defineProperty(images[0], "complete", {
      configurable: true,
      get: () => isAboveImageLoaded,
    });
    Object.defineProperty(images[1], "complete", {
      configurable: true,
      get: () => isBelowImageLoaded,
    });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
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

    expect(scrollToMock).not.toHaveBeenCalled();
    expect(root.classList.contains("is-navigation-pending")).toBe(true);
    expect(links[1].classList.contains("is-active")).toBe(true);
    expect(links[1].classList.contains("is-pending-navigation")).toBe(true);
    expect(links[1]).toHaveAttribute("aria-busy", "true");
    expect(images[0].loading).toBe("eager");
    expect(images[1].loading).toBe("lazy");

    isAboveImageLoaded = true;
    images[0].dispatchEvent(new Event("load"));
    await flushAll();

    expect(root.classList.contains("is-navigation-pending")).toBe(false);
    expect(links[1].classList.contains("is-pending-navigation")).toBe(false);
    expect(links[1]).not.toHaveAttribute("aria-busy");
    expect(replaceStateSpy).toHaveBeenCalledWith(null, "", "#둘째-섹션");
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 676,
      behavior: "smooth",
    });
  });

  it("cancels delayed first navigation after the user scrolls manually", async () => {
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 0,
      writable: true,
    });

    const article = renderArticle(
      `
      <h2>첫 섹션</h2>
      <img src="/above.jpg" alt="위쪽 이미지" loading="lazy" />
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
    const images = getRequiredElements<HTMLImageElement>(article, "img");
    mockRect(headings[0], { top: 220 });
    mockRect(headings[1], { top: 760 });

    let isAboveImageLoaded = false;
    Object.defineProperty(images[0], "complete", {
      configurable: true,
      get: () => isAboveImageLoaded,
    });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
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

    expect(scrollToMock).not.toHaveBeenCalled();

    window.scrollY = 120;
    window.dispatchEvent(new Event("scroll"));
    await flushAll();

    expect(root.classList.contains("is-navigation-pending")).toBe(false);
    expect(links[1].classList.contains("is-pending-navigation")).toBe(false);
    expect(links[1]).not.toHaveAttribute("aria-busy");

    isAboveImageLoaded = true;
    images[0].dispatchEvent(new Event("load"));
    await flushAll();

    expect(replaceStateSpy).not.toHaveBeenCalledWith(null, "", "#둘째-섹션");
    expect(scrollToMock).not.toHaveBeenCalled();
  });

  it("keeps the toc expanded briefly after pointer navigation", async () => {
    const article = renderArticle(
      `
      <h2>소개</h2>
      <h3>클릭 대상</h3>
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

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    const links = getRequiredElements<HTMLAnchorElement>(root, ".rp-toc-link");

    links[1].dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        detail: 1,
      }),
    );

    expect(root.classList.contains("is-navigation-locked")).toBe(true);

    vi.advanceTimersByTime(1500);
    await flushMicrotasks();

    expect(root.classList.contains("is-navigation-locked")).toBe(false);
  });

  it("stops rescheduling sync frames when the toc becomes hidden mid-navigation", async () => {
    const article = renderArticle(
      `
      <h2>소개</h2>
      <h3>클릭 대상</h3>
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

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    const links = getRequiredElements<HTMLAnchorElement>(root, ".rp-toc-link");

    links[1].dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        detail: 1,
      }),
    );

    requestAnimationFrameMock.mockClear();

    setViewportWidth(280);
    window.dispatchEvent(new Event("resize"));
    await flushAnimationFrame();

    expect(root.hidden).toBe(true);
    expect(root.classList.contains("is-navigation-locked")).toBe(false);

    const syncFrameCount = requestAnimationFrameMock.mock.calls.length;

    await flushAll(4);

    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(syncFrameCount);
  });

  it("does not recenter the toc rail when a clicked item is already visible", async () => {
    const article = renderArticle(
      `
      <h2>소개</h2>
      <h3>클릭 대상</h3>
      <h3>다음 섹션</h3>
    `,
      { tagName: "article" },
    );

    mockRect(article, {
      top: 100,
      left: 240,
      width: 820,
      height: 1800,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3");
    mockRect(headings[0], { top: 80 });
    mockRect(headings[1], { top: 180 });
    mockRect(headings[2], { top: 520 });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    const links = getRequiredElements<HTMLAnchorElement>(root, ".rp-toc-link");

    Object.defineProperty(root, "clientHeight", {
      configurable: true,
      value: 120,
    });
    Object.defineProperty(root, "scrollHeight", {
      configurable: true,
      value: 280,
    });

    Object.defineProperty(links[0], "offsetTop", {
      configurable: true,
      value: 0,
    });
    Object.defineProperty(links[1], "offsetTop", {
      configurable: true,
      value: 66,
    });
    Object.defineProperty(links[2], "offsetTop", {
      configurable: true,
      value: 220,
    });

    for (const link of links) {
      Object.defineProperty(link, "offsetHeight", {
        configurable: true,
        value: 20,
      });
    }

    root.scrollTop = 40;

    links[1].dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        detail: 1,
      }),
    );

    expect(root.scrollTop).toBe(40);
    expect(links[0]).toHaveAttribute("aria-current", "location");
    expect(links[1]).not.toHaveAttribute("aria-current");
  });

  it("nudges the toc rail down when a clicked item is clipped by the bottom fade", async () => {
    const article = renderArticle(
      `
      <h2>소개</h2>
      <h3>중간 섹션</h3>
      <h3>클릭 대상</h3>
    `,
      { tagName: "article" },
    );

    mockRect(article, {
      top: 100,
      left: 240,
      width: 820,
      height: 1800,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3");
    mockRect(headings[0], { top: 80 });
    mockRect(headings[1], { top: 180 });
    mockRect(headings[2], { top: 520 });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    const links = getRequiredElements<HTMLAnchorElement>(root, ".rp-toc-link");

    Object.defineProperty(root, "clientHeight", {
      configurable: true,
      value: 120,
    });
    Object.defineProperty(root, "scrollHeight", {
      configurable: true,
      value: 280,
    });

    Object.defineProperty(links[0], "offsetTop", {
      configurable: true,
      value: 0,
    });
    Object.defineProperty(links[1], "offsetTop", {
      configurable: true,
      value: 54,
    });
    Object.defineProperty(links[2], "offsetTop", {
      configurable: true,
      value: 130,
    });

    for (const link of links) {
      Object.defineProperty(link, "offsetHeight", {
        configurable: true,
        value: 20,
      });
    }

    root.scrollTop = 40;

    links[2].dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        detail: 1,
      }),
    );

    expect(root.scrollTop).toBe(54);
  });

  it("nudges the toc rail up when a clicked item is clipped by the top fade", async () => {
    const article = renderArticle(
      `
      <h2>소개</h2>
      <h3>클릭 대상</h3>
      <h3>다음 섹션</h3>
    `,
      { tagName: "article" },
    );

    mockRect(article, {
      top: 100,
      left: 240,
      width: 820,
      height: 1800,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3");
    mockRect(headings[0], { top: 80 });
    mockRect(headings[1], { top: 180 });
    mockRect(headings[2], { top: 520 });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    const links = getRequiredElements<HTMLAnchorElement>(root, ".rp-toc-link");

    Object.defineProperty(root, "clientHeight", {
      configurable: true,
      value: 120,
    });
    Object.defineProperty(root, "scrollHeight", {
      configurable: true,
      value: 280,
    });

    Object.defineProperty(links[0], "offsetTop", {
      configurable: true,
      value: 0,
    });
    Object.defineProperty(links[1], "offsetTop", {
      configurable: true,
      value: 90,
    });
    Object.defineProperty(links[2], "offsetTop", {
      configurable: true,
      value: 220,
    });

    for (const link of links) {
      Object.defineProperty(link, "offsetHeight", {
        configurable: true,
        value: 20,
      });
    }

    root.scrollTop = 80;

    links[1].dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        detail: 1,
      }),
    );

    expect(root.scrollTop).toBe(66);
  });

  it("keeps the toc rail stable while active steps toward a lower target", async () => {
    const article = renderArticle(
      `
      <h2>소개</h2>
      <h3>중간 섹션</h3>
      <h3>클릭 대상</h3>
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
    const topMap = new Map<HTMLElement, number>([
      [headings[0], 40],
      [headings[1], 320],
      [headings[2], 640],
    ]);

    for (const heading of headings) {
      Object.defineProperty(heading, "getBoundingClientRect", {
        configurable: true,
        value: vi.fn(() => {
          const top = topMap.get(heading) ?? 0;
          return {
            top,
            bottom: top + 40,
            left: 0,
            right: 100,
            width: 100,
            height: 40,
            x: 0,
            y: top,
            toJSON: () => ({}),
          };
        }),
      });
    }

    await loadTocPlugin();
    await flushAll();

    const links = getRequiredElements<HTMLAnchorElement>(
      document,
      ".rp-toc-link",
    );

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);

    Object.defineProperty(root, "clientHeight", {
      configurable: true,
      value: 120,
    });
    Object.defineProperty(root, "scrollHeight", {
      configurable: true,
      value: 320,
    });

    Object.defineProperty(links[0], "offsetTop", {
      configurable: true,
      value: 0,
    });
    Object.defineProperty(links[1], "offsetTop", {
      configurable: true,
      value: 54,
    });
    Object.defineProperty(links[2], "offsetTop", {
      configurable: true,
      value: 214,
    });

    for (const link of links) {
      Object.defineProperty(link, "offsetHeight", {
        configurable: true,
        value: 20,
      });
    }

    root.scrollTop = 138;

    links[2].dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(links[0]).toHaveAttribute("aria-current", "location");
    expect(links[2]).not.toHaveAttribute("aria-current");
    expect(root.scrollTop).toBe(138);

    topMap.set(headings[0], -40);
    topMap.set(headings[1], 72);
    topMap.set(headings[2], 320);

    window.dispatchEvent(new Event("scroll"));
    await flushAnimationFrame();

    expect(links[0]).toHaveAttribute("aria-current", "location");
    expect(links[2]).not.toHaveAttribute("aria-current");
    expect(root.scrollTop).toBe(138);

    vi.advanceTimersByTime(250);
    window.dispatchEvent(new Event("scroll"));
    await flushAnimationFrame();

    expect(links[1]).toHaveAttribute("aria-current", "location");
    expect(links[2]).not.toHaveAttribute("aria-current");
    expect(root.scrollTop).toBe(138);

    topMap.set(headings[0], -280);
    topMap.set(headings[1], -40);
    topMap.set(headings[2], 72);

    window.dispatchEvent(new Event("scroll"));
    await flushAnimationFrame();

    expect(links[2]).toHaveAttribute("aria-current", "location");
    expect(root.scrollTop).toBe(138);
  });

  it("keeps the toc rail stable while active steps toward an upper target", async () => {
    const article = renderArticle(
      `
      <h2>목표 섹션</h2>
      <h3>중간 섹션</h3>
      <h3>현재 섹션</h3>
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
    const topMap = new Map<HTMLElement, number>([
      [headings[0], -280],
      [headings[1], -40],
      [headings[2], 72],
    ]);

    for (const heading of headings) {
      Object.defineProperty(heading, "getBoundingClientRect", {
        configurable: true,
        value: vi.fn(() => {
          const top = topMap.get(heading) ?? 0;
          return {
            top,
            bottom: top + 40,
            left: 0,
            right: 100,
            width: 100,
            height: 40,
            x: 0,
            y: top,
            toJSON: () => ({}),
          };
        }),
      });
    }

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    const links = getRequiredElements<HTMLAnchorElement>(
      document,
      ".rp-toc-link",
    );

    Object.defineProperty(root, "clientHeight", {
      configurable: true,
      value: 120,
    });
    Object.defineProperty(root, "scrollHeight", {
      configurable: true,
      value: 320,
    });

    Object.defineProperty(links[0], "offsetTop", {
      configurable: true,
      value: 0,
    });
    Object.defineProperty(links[1], "offsetTop", {
      configurable: true,
      value: 54,
    });
    Object.defineProperty(links[2], "offsetTop", {
      configurable: true,
      value: 220,
    });

    for (const link of links) {
      Object.defineProperty(link, "offsetHeight", {
        configurable: true,
        value: 20,
      });
    }

    root.scrollTop = 0;

    links[0].dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(links[2]).toHaveAttribute("aria-current", "location");
    expect(root.scrollTop).toBe(0);
    expect(root.classList.contains("is-navigation-locked")).toBe(true);

    topMap.set(headings[0], -280);
    topMap.set(headings[1], -40);
    topMap.set(headings[2], 72);

    window.dispatchEvent(new Event("scroll"));
    await flushAnimationFrame();

    expect(links[2]).toHaveAttribute("aria-current", "location");
    expect(root.scrollTop).toBe(0);
    expect(root.classList.contains("is-navigation-locked")).toBe(true);

    vi.advanceTimersByTime(250);
    window.dispatchEvent(new Event("scroll"));
    await flushAnimationFrame();

    expect(links[2]).toHaveAttribute("aria-current", "location");
    expect(links[0]).not.toHaveAttribute("aria-current");
    expect(root.scrollTop).toBe(0);
    expect(root.classList.contains("is-navigation-locked")).toBe(true);

    topMap.set(headings[0], -40);
    topMap.set(headings[1], 72);
    topMap.set(headings[2], 360);

    window.dispatchEvent(new Event("scroll"));
    await flushAnimationFrame();

    expect(links[1]).toHaveAttribute("aria-current", "location");
    expect(root.scrollTop).toBe(0);
    expect(root.classList.contains("is-navigation-locked")).toBe(true);

    topMap.set(headings[0], 72);
    topMap.set(headings[1], 360);
    topMap.set(headings[2], 640);

    window.dispatchEvent(new Event("scroll"));
    await flushAnimationFrame();

    expect(links[0]).toHaveAttribute("aria-current", "location");
    expect(root.scrollTop).toBe(0);
    expect(root.classList.contains("is-navigation-locked")).toBe(true);

    vi.advanceTimersByTime(120);
    await flushMicrotasks();

    expect(root.classList.contains("is-navigation-locked")).toBe(false);
  });

  it("tracks the currently visible heading while scrolling", async () => {
    const article = renderArticle(
      `
      <h2>첫 섹션</h2>
      <h2>둘째 섹션</h2>
      <h3>셋째 섹션</h3>
    `,
      { tagName: "article" },
    );

    mockRect(article, {
      top: 100,
      left: 240,
      width: 820,
      height: 1800,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3");
    const topMap = new Map<HTMLElement, number>([
      [headings[0], 120],
      [headings[1], 420],
      [headings[2], 760],
    ]);

    for (const heading of headings) {
      Object.defineProperty(heading, "getBoundingClientRect", {
        configurable: true,
        value: vi.fn(() => {
          const top = topMap.get(heading) ?? 0;
          return {
            top,
            bottom: top + 40,
            left: 0,
            right: 100,
            width: 100,
            height: 40,
            x: 0,
            y: top,
            toJSON: () => ({}),
          };
        }),
      });
    }

    await loadTocPlugin();
    await flushAll();

    const links = getRequiredElements<HTMLAnchorElement>(
      document,
      ".rp-toc-link",
    );
    expect(links[0]).toHaveAttribute("aria-current", "location");

    topMap.set(headings[0], -220);
    topMap.set(headings[1], 72);
    topMap.set(headings[2], 360);

    window.dispatchEvent(new Event("scroll"));
    await flushAll();

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
    expect(links[0].getAttribute("href")).toBe("#교체된-섹션");
    expect(links[1].getAttribute("href")).toBe("#교체된-하위-섹션");
    expect(replacedHeadings[0].id).toBe("교체된-섹션");
    expect(replacedHeadings[1].id).toBe("교체된-하위-섹션");
  });

  it("auto-scrolls the toc rail when the active item moves below the visible list", async () => {
    const article = renderArticle(
      `
      <h2>첫 섹션</h2>
      <h2>둘째 섹션</h2>
      <h2>셋째 섹션</h2>
    `,
      { tagName: "article" },
    );

    mockRect(article, {
      top: 100,
      left: 240,
      width: 820,
      height: 2200,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2");
    const topMap = new Map<HTMLElement, number>([
      [headings[0], 120],
      [headings[1], 420],
      [headings[2], 760],
    ]);

    for (const heading of headings) {
      Object.defineProperty(heading, "getBoundingClientRect", {
        configurable: true,
        value: vi.fn(() => {
          const top = topMap.get(heading) ?? 0;
          return {
            top,
            bottom: top + 40,
            left: 0,
            right: 100,
            width: 100,
            height: 40,
            x: 0,
            y: top,
            toJSON: () => ({}),
          };
        }),
      });
    }

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    const links = getRequiredElements<HTMLAnchorElement>(root, ".rp-toc-link");

    Object.defineProperty(root, "clientHeight", {
      configurable: true,
      value: 120,
    });
    Object.defineProperty(root, "scrollHeight", {
      configurable: true,
      value: 320,
    });

    Object.defineProperty(links[0], "offsetTop", {
      configurable: true,
      value: 0,
    });
    Object.defineProperty(links[1], "offsetTop", {
      configurable: true,
      value: 54,
    });
    Object.defineProperty(links[2], "offsetTop", {
      configurable: true,
      value: 220,
    });

    for (const link of links) {
      Object.defineProperty(link, "offsetHeight", {
        configurable: true,
        value: 20,
      });
    }

    root.scrollTop = 0;

    topMap.set(headings[0], -280);
    topMap.set(headings[1], -40);
    topMap.set(headings[2], 72);

    window.dispatchEvent(new Event("scroll"));
    await flushAnimationFrame();

    expect(links[2]).toHaveAttribute("aria-current", "location");
    expect(root.scrollTop).toBe(170);
  });

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
    expect(links[0].getAttribute("href")).toBe("#보일-제목");
    expect(links[1].getAttribute("href")).toBe("#또-다른-제목");
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
    expect(replaceStateSpy).toHaveBeenLastCalledWith(null, "", "#설치");
  });

  it("lets the mobile toc button move without toggling the panel after a drag", async () => {
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

    expect(root.style.getPropertyValue("--rp-toc-mobile-offset-x")).toBe(
      "-30px",
    );
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

  it("updates top and bottom scroll fades as the toc rail scrolls", async () => {
    const article = renderArticle(
      `
      <h2>첫 섹션</h2>
      <h2>둘째 섹션</h2>
      <h2>셋째 섹션</h2>
    `,
      { tagName: "article" },
    );

    mockRect(article, {
      top: 100,
      left: 240,
      width: 820,
      height: 2200,
    });

    const headings = getRequiredElements<HTMLElement>(article, "h2");
    mockRect(headings[0], { top: 120 });
    mockRect(headings[1], { top: 420 });
    mockRect(headings[2], { top: 760 });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);

    Object.defineProperty(root, "clientHeight", {
      configurable: true,
      value: 120,
    });
    Object.defineProperty(root, "scrollHeight", {
      configurable: true,
      value: 320,
    });

    root.scrollTop = 0;
    window.dispatchEvent(new Event("scroll"));
    await flushAnimationFrame();

    expect(root.dataset.scrollFade).toBe("bottom");

    root.scrollTop = 80;
    root.dispatchEvent(new Event("scroll"));

    expect(root.dataset.scrollFade).toBe("both");

    root.scrollTop = 200;
    root.dispatchEvent(new Event("scroll"));

    expect(root.dataset.scrollFade).toBe("top");
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
