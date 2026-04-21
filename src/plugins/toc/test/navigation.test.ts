import {
  getRequiredElement,
  getRequiredElements,
  renderArticle,
} from "@test/dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  flushAll,
  flushAnimationFrame,
  flushMicrotasks,
  getTocTestMocks,
  loadTocPlugin,
  mockElementMetrics,
  mockRect,
  setupTocTest,
  setViewportWidth,
} from "./test-helpers";

describe("toc plugin navigation", () => {
  let scrollToMock: ReturnType<typeof getTocTestMocks>["scrollToMock"];
  let replaceStateSpy: ReturnType<typeof getTocTestMocks>["replaceStateSpy"];
  let requestAnimationFrameMock: ReturnType<
    typeof getTocTestMocks
  >["requestAnimationFrameMock"];

  setupTocTest();

  beforeEach(() => {
    ({ scrollToMock, replaceStateSpy, requestAnimationFrameMock } =
      getTocTestMocks());
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

    expect(replaceStateSpy).toHaveBeenCalledWith(null, "", "#rp-클릭-대상");
    expect(scrollToMock).toHaveBeenLastCalledWith({
      top: 396,
      behavior: "smooth",
    });
    expect(links[0]).toHaveAttribute("aria-current", "location");
    expect(links[1]).not.toHaveAttribute("aria-current");
    expect(document.activeElement).not.toBe(links[1]);
  });

  it("starts a single smooth scroll after a short warmup for incomplete images above the first target", async () => {
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
    const secondHeadingTop = 760;
    Object.defineProperty(headings[1], "getBoundingClientRect", {
      configurable: true,
      value: vi.fn(() => ({
        top: secondHeadingTop,
        bottom: secondHeadingTop + 40,
        left: 0,
        right: 100,
        width: 100,
        height: 40,
        x: 0,
        y: secondHeadingTop,
        toJSON: () => ({}),
      })),
    });

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

    const links = getRequiredElements<HTMLAnchorElement>(
      document,
      ".rp-toc-link",
    );
    const root = getRequiredElement(document, ".rp-toc", HTMLElement);

    links[1].dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        detail: 1,
      }),
    );

    expect(scrollToMock).not.toHaveBeenCalled();
    expect(images[0].loading).toBe("eager");
    expect(images[1].loading).toBe("lazy");
    expect(root.classList.contains("is-navigation-pending")).toBe(true);
    expect(links[1].classList.contains("is-pending-navigation")).toBe(true);
    expect(links[1]).toHaveAttribute("aria-busy", "true");

    vi.advanceTimersByTime(80);
    await flushMicrotasks();

    expect(scrollToMock).not.toHaveBeenCalled();

    isAboveImageLoaded = true;
    images[0].dispatchEvent(new Event("load"));
    await flushAll();

    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 676,
      behavior: "smooth",
    });
    expect(root.classList.contains("is-navigation-pending")).toBe(false);
    expect(links[1].classList.contains("is-pending-navigation")).toBe(false);
    expect(links[1]).not.toHaveAttribute("aria-busy");
  });

  it("does not add an extra correction when resources above the target are already settled", async () => {
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 0,
      writable: true,
    });

    const article = renderArticle(
      `
      <h2>첫 섹션</h2>
      <img src="/ready.jpg" alt="준비된 이미지" loading="lazy" />
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
    let secondHeadingTop = 760;
    Object.defineProperty(headings[1], "getBoundingClientRect", {
      configurable: true,
      value: vi.fn(() => ({
        top: secondHeadingTop,
        bottom: secondHeadingTop + 40,
        left: 0,
        right: 100,
        width: 100,
        height: 40,
        x: 0,
        y: secondHeadingTop,
        toJSON: () => ({}),
      })),
    });

    Object.defineProperty(images[0], "complete", {
      configurable: true,
      get: () => true,
    });

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
        detail: 1,
      }),
    );

    expect(scrollToMock).toHaveBeenCalledWith({
      top: 676,
      behavior: "smooth",
    });

    window.scrollY = 676;
    secondHeadingTop = 84;
    vi.advanceTimersByTime(400);
    await flushAll();

    expect(scrollToMock).toHaveBeenCalledTimes(1);
  });

  it("corrects the scroll when the probe observes a one-time heading shift", async () => {
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 0,
      writable: true,
    });

    const article = renderArticle(
      `
      <h2>첫 섹션</h2>
      <img src="/ready.jpg" alt="준비된 이미지" loading="lazy" />
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
    let secondHeadingTop = 760;
    Object.defineProperty(headings[1], "getBoundingClientRect", {
      configurable: true,
      value: vi.fn(() => ({
        top: secondHeadingTop,
        bottom: secondHeadingTop + 40,
        left: 0,
        right: 100,
        width: 100,
        height: 40,
        x: 0,
        y: secondHeadingTop,
        toJSON: () => ({}),
      })),
    });

    Object.defineProperty(images[0], "complete", {
      configurable: true,
      get: () => true,
    });

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
        detail: 1,
      }),
    );

    expect(scrollToMock).toHaveBeenNthCalledWith(1, {
      top: 676,
      behavior: "smooth",
    });

    window.scrollY = 676;
    secondHeadingTop = 164;
    await flushAll(10);

    expect(scrollToMock).toHaveBeenNthCalledWith(2, {
      top: 756,
      behavior: "smooth",
    });
  });

  it("cancels a queued correction when another toc entry is clicked first", async () => {
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 0,
      writable: true,
    });

    const article = renderArticle(
      `
      <h2>첫 섹션</h2>
      <img src="/ready.jpg" alt="준비된 이미지" loading="lazy" />
      <h3>둘째 섹션</h3>
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
    const images = getRequiredElements<HTMLImageElement>(article, "img");
    mockRect(headings[0], { top: 220 });
    let secondHeadingTop = 760;
    const thirdHeadingTop = 1120;

    Object.defineProperty(headings[1], "getBoundingClientRect", {
      configurable: true,
      value: vi.fn(() => ({
        top: secondHeadingTop,
        bottom: secondHeadingTop + 40,
        left: 0,
        right: 100,
        width: 100,
        height: 40,
        x: 0,
        y: secondHeadingTop,
        toJSON: () => ({}),
      })),
    });
    Object.defineProperty(headings[2], "getBoundingClientRect", {
      configurable: true,
      value: vi.fn(() => ({
        top: thirdHeadingTop,
        bottom: thirdHeadingTop + 40,
        left: 0,
        right: 100,
        width: 100,
        height: 40,
        x: 0,
        y: thirdHeadingTop,
        toJSON: () => ({}),
      })),
    });

    Object.defineProperty(images[0], "complete", {
      configurable: true,
      get: () => true,
    });

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
        detail: 1,
      }),
    );

    expect(scrollToMock).toHaveBeenNthCalledWith(1, {
      top: 676,
      behavior: "smooth",
    });

    window.scrollY = 676;
    secondHeadingTop = 164;
    await flushAnimationFrame();
    vi.advanceTimersByTime(300);
    await flushMicrotasks();

    links[2].dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        detail: 1,
      }),
    );

    expect(scrollToMock).toHaveBeenNthCalledWith(2, {
      top: 1712,
      behavior: "smooth",
    });

    await flushAll(10);

    expect(scrollToMock).toHaveBeenCalledTimes(2);
  });

  it("starts a single smooth scroll after a short warmup for a lazy iframe above the first target", async () => {
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 0,
      writable: true,
    });

    const article = renderArticle(
      `
      <h2>첫 섹션</h2>
      <iframe src="about:blank" title="임베드" loading="lazy"></iframe>
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
    const frame = getRequiredElement(article, "iframe", HTMLIFrameElement);
    mockRect(headings[0], { top: 220 });
    const secondHeadingTop = 760;
    Object.defineProperty(headings[1], "getBoundingClientRect", {
      configurable: true,
      value: vi.fn(() => ({
        top: secondHeadingTop,
        bottom: secondHeadingTop + 40,
        left: 0,
        right: 100,
        width: 100,
        height: 40,
        x: 0,
        y: secondHeadingTop,
        toJSON: () => ({}),
      })),
    });
    Object.defineProperty(frame, "loading", {
      configurable: true,
      writable: true,
      value: "lazy",
    });

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
        detail: 1,
      }),
    );

    expect(scrollToMock).not.toHaveBeenCalled();
    expect(frame.loading).toBe("eager");

    vi.advanceTimersByTime(80);
    await flushMicrotasks();

    expect(scrollToMock).not.toHaveBeenCalled();

    frame.dispatchEvent(new Event("load"));
    await flushAll();

    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 676,
      behavior: "smooth",
    });
  });

  it("corrects the scroll after resources above the target shift the heading down", async () => {
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
    let secondHeadingTop = 760;
    Object.defineProperty(headings[1], "getBoundingClientRect", {
      configurable: true,
      value: vi.fn(() => ({
        top: secondHeadingTop,
        bottom: secondHeadingTop + 40,
        left: 0,
        right: 100,
        width: 100,
        height: 40,
        x: 0,
        y: secondHeadingTop,
        toJSON: () => ({}),
      })),
    });

    let isAboveImageLoaded = false;
    Object.defineProperty(images[0], "complete", {
      configurable: true,
      get: () => isAboveImageLoaded,
    });

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
        detail: 1,
      }),
    );

    expect(scrollToMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(120);
    await flushMicrotasks();

    expect(scrollToMock).toHaveBeenNthCalledWith(1, {
      top: 676,
      behavior: "smooth",
    });

    window.scrollY = 676;
    secondHeadingTop = 164;
    isAboveImageLoaded = true;
    images[0].dispatchEvent(new Event("load"));
    await flushAll();

    expect(scrollToMock).toHaveBeenNthCalledWith(2, {
      top: 756,
      behavior: "smooth",
    });
  });

  it("starts a single smooth scroll after a short warmup even after the user has scrolled a little", async () => {
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 40,
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
    const secondHeadingTop = 720;
    Object.defineProperty(headings[1], "getBoundingClientRect", {
      configurable: true,
      value: vi.fn(() => ({
        top: secondHeadingTop,
        bottom: secondHeadingTop + 40,
        left: 0,
        right: 100,
        width: 100,
        height: 40,
        x: 0,
        y: secondHeadingTop,
        toJSON: () => ({}),
      })),
    });

    let isAboveImageLoaded = false;
    Object.defineProperty(images[0], "complete", {
      configurable: true,
      get: () => isAboveImageLoaded,
    });

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
        detail: 1,
      }),
    );

    expect(scrollToMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(80);
    await flushMicrotasks();

    expect(scrollToMock).not.toHaveBeenCalled();

    isAboveImageLoaded = true;
    images[0].dispatchEvent(new Event("load"));
    await flushAll();

    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 676,
      behavior: "smooth",
    });
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

    mockElementMetrics(root, { clientHeight: 120, scrollHeight: 280 });
    [0, 66, 220].forEach((offsetTop, index) => {
      mockElementMetrics(links[index], { offsetHeight: 20, offsetTop });
    });

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

    mockElementMetrics(root, { clientHeight: 120, scrollHeight: 280 });
    [0, 54, 130].forEach((offsetTop, index) => {
      mockElementMetrics(links[index], { offsetHeight: 20, offsetTop });
    });

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

    mockElementMetrics(root, { clientHeight: 120, scrollHeight: 280 });
    [0, 90, 220].forEach((offsetTop, index) => {
      mockElementMetrics(links[index], { offsetHeight: 20, offsetTop });
    });

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
});
