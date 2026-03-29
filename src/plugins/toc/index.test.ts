import {
  getRequiredElement,
  getRequiredElements,
  renderArticle,
} from "@test/dom";
import { createPluginLoader } from "@test/load-plugin";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("toc plugin", () => {
  const loadTocPlugin = createPluginLoader(() => import("@/plugins/toc"));

  let originalFonts: PropertyDescriptor | undefined;
  let originalVisualViewport: PropertyDescriptor | undefined;

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

    expect(root.hidden).toBe(false);
    expect(root.parentElement).toBe(document.body);
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
    expect(links[1]).toHaveAttribute("aria-current", "location");
    expect(document.activeElement).not.toBe(links[1]);
  });

  it("updates the active toc item as smooth scrolling crosses headings", async () => {
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
    const topMap = new Map<HTMLElement, number>([
      [headings[0], 40],
      [headings[1], 320],
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

    links[1].dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(links[1]).toHaveAttribute("aria-current", "location");
    expect(links[0]).not.toHaveAttribute("aria-current");

    topMap.set(headings[0], -40);
    topMap.set(headings[1], 72);

    window.dispatchEvent(new Event("scroll"));
    await flushAnimationFrame();

    expect(links[1]).toHaveAttribute("aria-current", "location");
    expect(links[0]).not.toHaveAttribute("aria-current");

    topMap.set(headings[1], 320);

    window.dispatchEvent(new Event("scroll"));
    await flushAnimationFrame();

    expect(links[0]).toHaveAttribute("aria-current", "location");
    expect(links[1]).not.toHaveAttribute("aria-current");
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

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    expect(root.hidden).toBe(false);
    expect(root.style.getPropertyValue("--rp-toc-left")).toBe("1328px");
    expect(root.style.getPropertyValue("--rp-toc-width")).toBe("240px");
  });

  it("uses the first revenue boundary after the last heading as the bottom clamp", async () => {
    const article = renderArticle(
      `
      <h2>첫 섹션</h2>
      <h3>둘째 섹션</h3>
      <div class="revenue_unit_wrap"></div>
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
    const revenue = getRequiredElement(
      article,
      ".revenue_unit_wrap",
      HTMLElement,
    );

    mockRect(headings[0], { top: -120 });
    mockRect(headings[1], { top: 80 });
    mockRect(revenue, { top: 12, height: 0 });

    await loadTocPlugin();
    await flushAll();

    const root = getRequiredElement(document, ".rp-toc", HTMLElement);
    expect(root.hidden).toBe(true);
  });

  it("stays hidden on narrower viewports and respects configured levels", async () => {
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
    const links = getRequiredElements<HTMLAnchorElement>(root, ".rp-toc-link");

    expect(root.hidden).toBe(true);
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute("href")).toBe("#보일-제목");
    expect(links[1].getAttribute("href")).toBe("#또-다른-제목");
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
