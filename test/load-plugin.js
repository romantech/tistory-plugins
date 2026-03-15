import { vi } from "vitest";

export async function loadPlugin(importModule, microtaskCount = 1) {
  vi.resetModules();
  await importModule();
  document.dispatchEvent(new Event("DOMContentLoaded"));

  for (let index = 0; index < microtaskCount; index += 1) {
    await Promise.resolve();
  }
}
