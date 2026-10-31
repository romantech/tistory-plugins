import * as matchers from "@testing-library/jest-dom/matchers";
import { afterEach, beforeEach, expect, vi } from "vitest";

// jest-dom의 Vitest 어댑터는 아직 Vitest 5의 matcher 타입을 지원하지 않습니다.
declare module "vitest" {
  interface Matchers<R, T> extends matchers.TestingLibraryMatchers<T, R> {}
}

expect.extend(matchers);

const RESET_GLOBAL_KEYS = [
  "RPPlugins",
  "__tistoryPluginsKatexLoadPromise",
  "__tistoryPluginsPeleLoadPromise",
  "katex",
  "renderMathInElement",
  "pele",
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
