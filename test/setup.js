import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";

const RESET_GLOBAL_KEYS = [
  "__tistoryPluginsKatexLoadPromise",
  "katex",
  "renderMathInElement",
];

function resetDom() {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
}

function resetGlobals() {
  for (const key of RESET_GLOBAL_KEYS) {
    delete globalThis[key];
  }
}

beforeEach(() => {
  resetDom();
  resetGlobals();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resetDom();
  resetGlobals();
});
