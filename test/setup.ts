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

beforeEach((): void => {
  resetDom();
  resetGlobals();
});

afterEach((): void => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resetDom();
  resetGlobals();
});
