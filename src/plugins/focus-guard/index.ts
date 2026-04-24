import { runOnDocumentReady } from "@/shared/dom-ready";

type FocusGuardState = typeof globalThis & {
  __tistoryPluginsFocusGuardReady?: boolean;
};

(() => {
  const SELECTOR =
    'button[data-func="close-sidebar"], button[data-func="open-sidebar"]';

  function getTargetButton(
    target: EventTarget | null,
  ): HTMLButtonElement | null {
    if (!(target instanceof Element)) return null;

    const button = target.closest(SELECTOR);
    return button instanceof HTMLButtonElement ? button : null;
  }

  function blurActiveElementInside(hiddenElement: Element): void {
    const active = document.activeElement;

    if (
      active instanceof HTMLElement &&
      (hiddenElement === active || hiddenElement.contains(active))
    ) {
      active.blur();
    }
  }

  function handlePointerDown(e: PointerEvent): void {
    const button = getTargetButton(e.target);
    if (!button) return;

    e.preventDefault();
  }

  function handleClick(e: MouseEvent): void {
    const button = getTargetButton(e.target);
    if (!button) return;

    if (document.activeElement === button) {
      button.blur();
    }
  }

  function handleAriaHiddenMutations(mutations: MutationRecord[]): void {
    for (const mutation of mutations) {
      if (mutation.attributeName !== "aria-hidden") continue;

      const element = mutation.target;
      if (!(element instanceof Element)) continue;
      if (element.getAttribute("aria-hidden") !== "true") continue;

      blurActiveElementInside(element);
    }
  }

  function init(): void {
    const state = globalThis as FocusGuardState;
    if (state.__tistoryPluginsFocusGuardReady) return;

    state.__tistoryPluginsFocusGuardReady = true;

    window.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
      passive: false,
    });

    window.addEventListener("click", handleClick, {
      capture: true,
    });

    const observer = new MutationObserver(handleAriaHiddenMutations);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["aria-hidden"],
      subtree: true,
    });
  }

  runOnDocumentReady(init);
})();
