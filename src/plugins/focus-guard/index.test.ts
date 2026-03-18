import { getRequiredElement, setBodyHtml } from "@test/dom";
import { loadPlugin } from "@test/load-plugin";
import { waitFor } from "@testing-library/dom";
import { describe, expect, it, vi } from "vitest";

describe("focus-guard plugin", () => {
  const loadFocusGuardPlugin = () =>
    loadPlugin(() => import("@/plugins/focus-guard"));

  it("prevents focus on sidebar toggle buttons on pointerdown", async () => {
    setBodyHtml(`
      <button data-func="open-sidebar">Open</button>
      <button data-func="close-sidebar">Close</button>
    `);

    await loadFocusGuardPlugin();

    const openButton = getRequiredElement(
      document,
      'button[data-func="open-sidebar"]',
      HTMLButtonElement,
    );
    const closeButton = getRequiredElement(
      document,
      'button[data-func="close-sidebar"]',
      HTMLButtonElement,
    );

    const openEvent = new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
    });
    const closeEvent = new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
    });

    openButton.dispatchEvent(openEvent);
    closeButton.dispatchEvent(closeEvent);

    expect(openEvent.defaultPrevented).toBe(true);
    expect(closeEvent.defaultPrevented).toBe(true);
  });

  it("does not prevent pointerdown for unrelated elements", async () => {
    setBodyHtml(`
      <button data-func="other-action">Other</button>
    `);

    await loadFocusGuardPlugin();

    const otherButton = getRequiredElement(
      document,
      'button[data-func="other-action"]',
      HTMLButtonElement,
    );

    const event = new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
    });

    otherButton.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it("blurs the sidebar toggle button when it is clicked while focused", async () => {
    setBodyHtml(`
      <button data-func="open-sidebar">Open</button>
    `);

    await loadFocusGuardPlugin();

    const button = getRequiredElement(
      document,
      'button[data-func="open-sidebar"]',
      HTMLButtonElement,
    );

    const blurSpy = vi.spyOn(HTMLButtonElement.prototype, "blur");

    button.focus();
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(blurSpy).toHaveBeenCalledTimes(1);
  });

  it("does not blur when clicking a sidebar toggle button that is not focused", async () => {
    setBodyHtml(`
      <button data-func="open-sidebar">Open</button>
      <button data-func="close-sidebar">Close</button>
    `);

    await loadFocusGuardPlugin();

    const openButton = getRequiredElement(
      document,
      'button[data-func="open-sidebar"]',
      HTMLButtonElement,
    );
    const closeButton = getRequiredElement(
      document,
      'button[data-func="close-sidebar"]',
      HTMLButtonElement,
    );

    const blurSpy = vi.spyOn(HTMLButtonElement.prototype, "blur");

    closeButton.focus();
    openButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(document.activeElement).toBe(closeButton);
    expect(blurSpy).not.toHaveBeenCalled();
  });

  it("blurs the active element when an ancestor becomes aria-hidden", async () => {
    setBodyHtml(`
      <div id="sidebar">
        <button id="inside" data-func="open-sidebar">Open</button>
      </div>
    `);

    await loadFocusGuardPlugin();

    const sidebar = getRequiredElement(document, "#sidebar", HTMLDivElement);
    const insideButton = getRequiredElement(
      document,
      "#inside",
      HTMLButtonElement,
    );

    const blurSpy = vi.spyOn(HTMLButtonElement.prototype, "blur");

    insideButton.focus();
    sidebar.setAttribute("aria-hidden", "true");

    await waitFor(() => {
      expect(blurSpy).toHaveBeenCalledTimes(1);
    });
  });

  it("does not blur when aria-hidden changes on an unrelated element", async () => {
    setBodyHtml(`
      <div id="sidebar">
        <button id="inside" data-func="open-sidebar">Open</button>
      </div>
      <div id="other"></div>
    `);

    await loadFocusGuardPlugin();

    const insideButton = getRequiredElement(
      document,
      "#inside",
      HTMLButtonElement,
    );
    const other = getRequiredElement(document, "#other", HTMLDivElement);

    const blurSpy = vi.spyOn(HTMLButtonElement.prototype, "blur");

    insideButton.focus();
    other.setAttribute("aria-hidden", "true");

    await Promise.resolve();

    expect(document.activeElement).toBe(insideButton);
    expect(blurSpy).not.toHaveBeenCalled();
  });
});
