import { loadPlugin } from "@test/load-plugin";
import { waitFor } from "@testing-library/dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("focus-guard plugin", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("prevents focus on sidebar toggle buttons on pointerdown", async () => {
    document.body.innerHTML = `
      <button data-func="open-sidebar">Open</button>
      <button data-func="close-sidebar">Close</button>
    `;

    await loadPlugin(() => import("@/plugins/focus-guard"));

    const openButton = document.querySelector<HTMLButtonElement>(
      'button[data-func="open-sidebar"]',
    );
    const closeButton = document.querySelector<HTMLButtonElement>(
      'button[data-func="close-sidebar"]',
    );

    expect(openButton).not.toBeNull();
    expect(closeButton).not.toBeNull();

    const openEvent = new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
    });
    const closeEvent = new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
    });

    openButton?.dispatchEvent(openEvent);
    closeButton?.dispatchEvent(closeEvent);

    expect(openEvent.defaultPrevented).toBe(true);
    expect(closeEvent.defaultPrevented).toBe(true);
  });

  it("does not prevent pointerdown for unrelated elements", async () => {
    document.body.innerHTML = `
      <button data-func="other-action">Other</button>
    `;

    await loadPlugin(() => import("@/plugins/focus-guard"));

    const otherButton = document.querySelector<HTMLButtonElement>(
      'button[data-func="other-action"]',
    );

    expect(otherButton).not.toBeNull();

    const event = new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
    });

    otherButton?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it("blurs the sidebar toggle button when it is clicked while focused", async () => {
    document.body.innerHTML = `
      <button data-func="open-sidebar">Open</button>
    `;

    await loadPlugin(() => import("@/plugins/focus-guard"));

    const button = document.querySelector<HTMLButtonElement>(
      'button[data-func="open-sidebar"]',
    );

    expect(button).not.toBeNull();

    const blurSpy = vi.spyOn(HTMLButtonElement.prototype, "blur");

    button?.focus();
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(blurSpy).toHaveBeenCalledTimes(1);
  });

  it("does not blur when clicking a sidebar toggle button that is not focused", async () => {
    document.body.innerHTML = `
      <button data-func="open-sidebar">Open</button>
      <button data-func="close-sidebar">Close</button>
    `;

    await loadPlugin(() => import("@/plugins/focus-guard"));

    const openButton = document.querySelector<HTMLButtonElement>(
      'button[data-func="open-sidebar"]',
    );
    const closeButton = document.querySelector<HTMLButtonElement>(
      'button[data-func="close-sidebar"]',
    );

    expect(openButton).not.toBeNull();
    expect(closeButton).not.toBeNull();

    const blurSpy = vi.spyOn(HTMLButtonElement.prototype, "blur");

    closeButton?.focus();
    openButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(document.activeElement).toBe(closeButton);
    expect(blurSpy).not.toHaveBeenCalled();
  });

  it("blurs the active element when an ancestor becomes aria-hidden", async () => {
    document.body.innerHTML = `
      <div id="sidebar">
        <button id="inside" data-func="open-sidebar">Open</button>
      </div>
    `;

    await loadPlugin(() => import("@/plugins/focus-guard"));

    const sidebar = document.getElementById("sidebar");
    const insideButton = document.getElementById("inside");

    expect(sidebar).not.toBeNull();
    expect(insideButton).not.toBeNull();

    const blurSpy = vi.spyOn(HTMLButtonElement.prototype, "blur");

    (insideButton as HTMLButtonElement | null)?.focus();
    sidebar?.setAttribute("aria-hidden", "true");

    await waitFor(() => {
      expect(blurSpy).toHaveBeenCalledTimes(1);
    });
  });

  it("does not blur when aria-hidden changes on an unrelated element", async () => {
    document.body.innerHTML = `
      <div id="sidebar">
        <button id="inside" data-func="open-sidebar">Open</button>
      </div>
      <div id="other"></div>
    `;

    await loadPlugin(() => import("@/plugins/focus-guard"));

    const insideButton = document.getElementById("inside");
    const other = document.getElementById("other");

    expect(insideButton).not.toBeNull();
    expect(other).not.toBeNull();

    const blurSpy = vi.spyOn(HTMLButtonElement.prototype, "blur");

    (insideButton as HTMLButtonElement | null)?.focus();
    other?.setAttribute("aria-hidden", "true");

    await Promise.resolve();

    expect(document.activeElement).toBe(insideButton);
    expect(blurSpy).not.toHaveBeenCalled();
  });
});
