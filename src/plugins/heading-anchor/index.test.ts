import {
  appendPluginScript,
  getRequiredElement,
  getRequiredElements,
  renderArticle,
} from "@test/dom";
import { createPluginLoader } from "@test/load-plugin";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("heading-anchor plugin", () => {
  const loadHeadingAnchorPlugin = createPluginLoader(
    () => import("@/plugins/heading-anchor"),
  );

  let originalReadyState: PropertyDescriptor | undefined;
  let originalFonts: PropertyDescriptor | undefined;
  let originalVisualViewport: PropertyDescriptor | undefined;

  let scrollToMock: ReturnType<typeof vi.fn>;
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;
  let requestAnimationFrameMock: ReturnType<typeof vi.fn>;
  let cancelAnimationFrameMock: ReturnType<typeof vi.fn>;

  let visualViewportListeners: Record<string, EventListener[]>;
  let visualViewportListenerMap: WeakMap<
    EventListenerOrEventListenerObject,
    EventListener
  >;

  async function flushMicrotasks(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
  }

  async function flushAll(cycles = 6): Promise<void> {
    for (let index = 0; index < cycles; index += 1) {
      await flushMicrotasks();
      vi.runOnlyPendingTimers();
    }
    await flushMicrotasks();
  }

  function setDocumentReadyState(state: DocumentReadyState): void {
    Object.defineProperty(document, "readyState", {
      configurable: true,
      value: state,
    });
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
    visualViewportListeners = {};
    visualViewportListenerMap = new WeakMap();

    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: {
        addEventListener: vi.fn(
          (type: string, listener: EventListenerOrEventListenerObject) => {
            const callback =
              typeof listener === "function"
                ? listener
                : (visualViewportListenerMap.get(listener) ??
                  (() => {
                    const bound = listener.handleEvent.bind(listener);
                    visualViewportListenerMap.set(listener, bound);
                    return bound;
                  })());

            visualViewportListeners[type] ??= [];
            visualViewportListeners[type].push(callback);
          },
        ),
        removeEventListener: vi.fn(
          (type: string, listener: EventListenerOrEventListenerObject) => {
            const callback =
              typeof listener === "function"
                ? listener
                : visualViewportListenerMap.get(listener);

            visualViewportListeners[type] = (
              visualViewportListeners[type] ?? []
            ).filter((registered) => registered !== callback);
          },
        ),
      },
    });
  }

  function mockHeadingTop(heading: HTMLElement, top: number): void {
    Object.defineProperty(heading, "getBoundingClientRect", {
      configurable: true,
      value: vi.fn(() => ({
        top,
        bottom: top + 40,
        left: 0,
        right: 0,
        width: 100,
        height: 40,
        x: 0,
        y: top,
        toJSON: () => ({}),
      })),
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    appendPluginScript("heading-anchor");

    originalReadyState = Object.getOwnPropertyDescriptor(
      document,
      "readyState",
    );
    originalFonts = Object.getOwnPropertyDescriptor(document, "fonts");
    originalVisualViewport = Object.getOwnPropertyDescriptor(
      window,
      "visualViewport",
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

    setDocumentReadyState("complete");
    setFontsReady();
    setVisualViewport();
  });

  afterEach(() => {
    document.documentElement.style.removeProperty("--header-height");

    if (originalReadyState) {
      Object.defineProperty(document, "readyState", originalReadyState);
    }

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
  });

  it("adds anchor links and unique ids to h2~h4 headings in the article", async () => {
    const article = renderArticle(
      `
      <h2>첫 번째 섹션</h2>
      <h2>첫 번째 섹션</h2>
      <h3 id="custom-id">직접 지정한 제목</h3>
      <h4>마지막 제목</h4>
    `,
      { tagName: "article" },
    );

    await loadHeadingAnchorPlugin();

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3, h4");
    const stylesheet = document.head.querySelector(
      "#tistory-plugins-heading-anchor-css",
    );

    expect(headings).toHaveLength(4);
    expect(stylesheet).toBeInstanceOf(HTMLLinkElement);
    expect(stylesheet).toHaveAttribute("rel", "stylesheet");
    expect(stylesheet).toHaveAttribute(
      "href",
      "https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/heading-anchor/index.min.css",
    );

    expect(headings[0].id).toBe("rp-첫-번째-섹션");
    expect(headings[1].id).toBe("rp-첫-번째-섹션-2");
    expect(headings[2].id).toBe("custom-id");
    expect(headings[3].id).toBe("rp-마지막-제목");

    for (const heading of headings) {
      const anchor = getRequiredElement(
        heading,
        ".rp-heading-anchor",
        HTMLAnchorElement,
      );
      const marker = getRequiredElement(
        heading,
        ".rp-heading-anchor-marker",
        HTMLElement,
      );

      expect(marker.textContent).toBe("#");
      expect(anchor.getAttribute("href")).toBe(`#${heading.id}`);
    }
  });

  it("prefixes generated heading ids to avoid skin id collisions", async () => {
    const article = renderArticle("<h2>PAGINATION</h2>", {
      tagName: "article",
    });
    const pagination = document.createElement("div");
    pagination.id = "pagination";
    document.body.append(pagination);

    await loadHeadingAnchorPlugin();

    const heading = getRequiredElement(article, "h2", HTMLElement);
    const anchor = getRequiredElement(
      heading,
      ".rp-heading-anchor",
      HTMLAnchorElement,
    );

    expect(document.getElementById("pagination")).toBe(pagination);
    expect(heading.id).toBe("rp-pagination");
    expect(anchor.getAttribute("href")).toBe("#rp-pagination");
  });

  it("preserves headings that already contain links and only prepares the id", async () => {
    const article = renderArticle(
      `
      <h2><a href="/existing">기존 링크 제목</a></h2>
      <h3>일반 제목</h3>
    `,
      { tagName: "article" },
    );

    await loadHeadingAnchorPlugin();

    const linkedHeading = getRequiredElement(article, "h2", HTMLElement);
    const normalHeading = getRequiredElement(article, "h3", HTMLElement);

    expect(linkedHeading.id).toBe("rp-기존-링크-제목");
    expect(linkedHeading.querySelectorAll(".rp-heading-anchor")).toHaveLength(
      0,
    );

    expect(normalHeading.querySelector(".rp-heading-anchor")).not.toBeNull();
  });

  it("does not add duplicate anchors when the plugin is loaded again", async () => {
    const article = renderArticle(
      `
      <h2>중복 방지 제목</h2>
      <h3>두 번째 제목</h3>
    `,
      { tagName: "article" },
    );

    await loadHeadingAnchorPlugin();
    await loadHeadingAnchorPlugin();

    const headings = getRequiredElements<HTMLElement>(article, "h2, h3");
    const stylesheets = document.head.querySelectorAll(
      "#tistory-plugins-heading-anchor-css",
    );

    for (const heading of headings) {
      expect(heading.querySelectorAll(".rp-heading-anchor")).toHaveLength(1);
      expect(
        heading.querySelectorAll(".rp-heading-anchor-marker"),
      ).toHaveLength(1);
    }

    expect(stylesheets).toHaveLength(1);
  });

  it("updates the hash and scrolls using the header offset when an anchor is clicked", async () => {
    const article = renderArticle("<h2>클릭 테스트</h2>", {
      tagName: "article",
    });

    await loadHeadingAnchorPlugin();

    const heading = getRequiredElement(article, "h2", HTMLElement);
    mockHeadingTop(heading, 180);

    const anchor = getRequiredElement(
      heading,
      ".rp-heading-anchor",
      HTMLAnchorElement,
    );

    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });

    anchor.dispatchEvent(clickEvent);

    expect(clickEvent.defaultPrevented).toBe(true);
    expect(replaceStateSpy).toHaveBeenCalledWith(null, "", `#${heading.id}`);
    expect(scrollToMock).toHaveBeenLastCalledWith({
      top: 396,
      behavior: "smooth",
    });
  });

  it("corrects the initial hash target position after fonts are ready", async () => {
    const article = renderArticle(
      `
      <h2>소개</h2>
      <h2>목표 제목</h2>
    `,
      { tagName: "article" },
    );

    location.hash = "#목표-제목";

    const target = getRequiredElements<HTMLElement>(article, "h2")[1];
    mockHeadingTop(target, 160);

    await loadHeadingAnchorPlugin();
    await flushAll();

    expect(scrollToMock).toHaveBeenCalled();
    expect(scrollToMock).toHaveBeenLastCalledWith({
      top: 376,
      behavior: "auto",
    });
  });

  it("does not scroll again when the initial hash target is already correctly positioned", async () => {
    const article = renderArticle(
      `
      <h2>소개</h2>
      <h2>정확한 위치</h2>
    `,
      { tagName: "article" },
    );

    location.hash = "#정확한-위치";

    const target = getRequiredElements<HTMLElement>(article, "h2")[1];
    mockHeadingTop(target, 84);

    await loadHeadingAnchorPlugin();
    await flushAll();

    expect(scrollToMock).not.toHaveBeenCalled();
  });

  it("does not attempt to scroll when the initial hash target does not exist", async () => {
    renderArticle(
      `
      <h2>소개</h2>
      <h2>다른 제목</h2>
    `,
      { tagName: "article" },
    );

    location.hash = "#없는-제목";

    await loadHeadingAnchorPlugin();
    await flushAll();

    expect(scrollToMock).not.toHaveBeenCalled();
  });

  it("exits without errors even when the article has no headings", async () => {
    const article = renderArticle(
      `
      <p>일반 문단</p>
      <div>제목 아님</div>
    `,
      { tagName: "article" },
    );

    await expect(loadHeadingAnchorPlugin()).resolves.toBeUndefined();

    expect(article.querySelector(".rp-heading-anchor")).toBeNull();
    expect(scrollToMock).not.toHaveBeenCalled();
  });

  it("re-runs hash scroll correction on bfcache restore via pageshow(persisted=true)", async () => {
    const article = renderArticle(
      `
      <h2>소개</h2>
      <h2>복원 대상</h2>
    `,
      { tagName: "article" },
    );

    location.hash = "#복원-대상";

    const target = getRequiredElements<HTMLElement>(article, "h2")[1];
    mockHeadingTop(target, 200);

    await loadHeadingAnchorPlugin();
    await flushAll();

    scrollToMock.mockClear();

    const pageShowEvent = new Event("pageshow");
    Object.defineProperty(pageShowEvent, "persisted", {
      configurable: true,
      value: true,
    });

    window.dispatchEvent(pageShowEvent);
    await flushAll();

    expect(scrollToMock).toHaveBeenLastCalledWith({
      top: 416,
      behavior: "auto",
    });
  });

  it("uses configured heading levels and header offset", async () => {
    const article = renderArticle(
      `
      <h2>기본 제외</h2>
      <h5>사용자 정의 제목</h5>
    `,
      { tagName: "article" },
    );

    (
      window as typeof window & {
        RPPlugins?: Record<string, unknown>;
      }
    ).RPPlugins = {
      headingAnchor: {
        levels: [5],
        headerOffset: 40,
      },
    };

    const heading = getRequiredElement(article, "h5", HTMLElement);
    mockHeadingTop(heading, 100);

    await loadHeadingAnchorPlugin();

    expect(article.querySelector("h2 .rp-heading-anchor")).toBeNull();

    const anchor = getRequiredElement(
      heading,
      ".rp-heading-anchor",
      HTMLAnchorElement,
    );

    anchor.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(scrollToMock).toHaveBeenLastCalledWith({
      top: 360,
      behavior: "smooth",
    });
  });
});
