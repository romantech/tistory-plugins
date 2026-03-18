import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";

const RESET_GLOBAL_KEYS = [
  "__tistoryPluginsKatexLoadPromise",
  "katex",
  "renderMathInElement",
] as const;

function resetDom(): void {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
}

function resetGlobals(): void {
  for (const key of RESET_GLOBAL_KEYS) {
    delete (globalThis as Record<string, unknown>)[key];
  }
}

function resetLocation(): void {
  location.hash = "";
}

function resetTestEnvironment(): void {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resetDom();
  resetGlobals();
  resetLocation();
}

beforeEach((): void => {
  resetTestEnvironment();
});

afterEach((): void => {
  resetTestEnvironment();
});
