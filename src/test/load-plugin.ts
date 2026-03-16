import { vi } from "vitest";

type ImportModule = () => Promise<unknown>;

export async function loadPlugin(
  importModule: ImportModule,
  microtaskCount = 1,
): Promise<void> {
  vi.resetModules();
  await importModule();
  document.dispatchEvent(new Event("DOMContentLoaded"));

  for (let index = 0; index < microtaskCount; index += 1) {
    await Promise.resolve();
  }
}
