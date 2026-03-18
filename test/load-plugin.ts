import { vi } from "vitest";

type ImportModule = () => Promise<unknown>;
type LoadPluginOptions = {
  microtaskCount?: number;
};

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

export function createPluginLoader(
  importModule: ImportModule,
  options: LoadPluginOptions = {},
): () => Promise<void> {
  const { microtaskCount = 1 } = options;

  return () => loadPlugin(importModule, microtaskCount);
}
