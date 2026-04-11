import { appendPluginScript } from "@test/dom";
import { createPluginLoader } from "@test/load-plugin";
import { afterEach, beforeEach, vi } from "vitest";

export const loadTocPlugin = createPluginLoader(() => import("@/plugins/toc"));

let originalFonts: PropertyDescriptor | undefined;
let originalVisualViewport: PropertyDescriptor | undefined;
let originalOffsetHeight: PropertyDescriptor | undefined;
let originalScrollHeight: PropertyDescriptor | undefined;
let originalReadyState: PropertyDescriptor | undefined;

let scrollToMock: ReturnType<typeof vi.fn> | undefined;
let replaceStateSpy: ReturnType<typeof vi.spyOn> | undefined;
let requestAnimationFrameMock: ReturnType<typeof vi.fn> | undefined;
let cancelAnimationFrameMock: ReturnType<typeof vi.fn> | undefined;

type RectValue = {
  top: number;
  left?: number;
  width?: number;
  height?: number;
};

export async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

export async function flushAnimationFrame(): Promise<void> {
  await flushMicrotasks();
  vi.advanceTimersByTime(0);
  await flushMicrotasks();
}

export async function flushAll(cycles = 6): Promise<void> {
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

export function setVisualViewport(
  overrides: Partial<{
    height: number;
    offsetTop: number;
    offsetLeft: number;
    width: number;
  }> = {},
): void {
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: {
      addEventListener: vi.fn(),
      height: overrides.height ?? 0,
      offsetLeft: overrides.offsetLeft ?? 0,
      offsetTop: overrides.offsetTop ?? 0,
      width: overrides.width ?? 0,
    },
  });
}

export function setViewportWidth(width: number): void {
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

export function mockRect(element: Element, rect: RectValue): void {
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

function requireMock<T>(mock: T | undefined, name: string): T {
  if (!mock) {
    throw new Error(`${name} is not initialized`);
  }

  return mock;
}

export function getTocTestMocks(): {
  scrollToMock: ReturnType<typeof vi.fn>;
  replaceStateSpy: ReturnType<typeof vi.spyOn>;
  requestAnimationFrameMock: ReturnType<typeof vi.fn>;
  cancelAnimationFrameMock: ReturnType<typeof vi.fn>;
} {
  return {
    scrollToMock: requireMock(scrollToMock, "scrollToMock"),
    replaceStateSpy: requireMock(replaceStateSpy, "replaceStateSpy"),
    requestAnimationFrameMock: requireMock(
      requestAnimationFrameMock,
      "requestAnimationFrameMock",
    ),
    cancelAnimationFrameMock: requireMock(
      cancelAnimationFrameMock,
      "cancelAnimationFrameMock",
    ),
  };
}

export function setupTocTest(): void {
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

    scrollToMock = undefined;
    replaceStateSpy = undefined;
    requestAnimationFrameMock = undefined;
    cancelAnimationFrameMock = undefined;
  });
}
