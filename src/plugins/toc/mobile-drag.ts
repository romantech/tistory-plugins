type BindMobileDraggingOptions = {
  getHeaderOffset: () => number;
  getViewportHeight: () => number;
  root: HTMLElement;
  toggleButtonClass: string;
};

const MOBILE_DRAG_THRESHOLD = 6;
const MOBILE_DRAG_GUTTER = 12;

function getMobileOffset(root: HTMLElement, property: string): number {
  const value = root.style.getPropertyValue(property).trim();
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function setMobileOffset(root: HTMLElement, x: number, y: number): void {
  root.style.setProperty("--rp-toc-mobile-offset-x", `${Math.round(x)}px`);
  root.style.setProperty("--rp-toc-mobile-offset-y", `${Math.round(y)}px`);
}

export function bindMobileDragging({
  getHeaderOffset,
  getViewportHeight,
  root,
  toggleButtonClass,
}: BindMobileDraggingOptions): void {
  const toggleButton = root.querySelector(`.${toggleButtonClass}`);
  if (
    !(toggleButton instanceof HTMLButtonElement) ||
    toggleButton.dataset.dragBound === "true"
  ) {
    return;
  }

  const dragState = {
    active: false,
    pointerId: -1,
    moved: false,
    startClientY: 0,
    startOffsetY: 0,
    baseTop: 0,
    height: 0,
  };

  const clearDrag = (): void => {
    dragState.active = false;
    dragState.pointerId = -1;
    root.dataset.mobilePressed = "false";
    root.dataset.mobileDragging = "false";
  };

  toggleButton.dataset.dragBound = "true";
  toggleButton.addEventListener(
    "click",
    (event) => {
      if (toggleButton.dataset.dragSuppressed !== "true") return;

      toggleButton.dataset.dragSuppressed = "false";
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    { capture: true },
  );
  toggleButton.addEventListener("pointerdown", (event) => {
    if (root.hidden || root.dataset.layout !== "mobile" || event.button !== 0) {
      return;
    }

    const rect = root.getBoundingClientRect();
    dragState.active = true;
    dragState.pointerId = "pointerId" in event ? event.pointerId : -1;
    dragState.moved = false;
    dragState.startClientY = event.clientY;
    dragState.startOffsetY = getMobileOffset(root, "--rp-toc-mobile-offset-y");
    dragState.baseTop = rect.top;
    dragState.height = rect.height;
    root.dataset.mobilePressed = "true";
    root.dataset.mobileDragging = "false";

    if ("setPointerCapture" in toggleButton && dragState.pointerId >= 0) {
      try {
        toggleButton.setPointerCapture(dragState.pointerId);
      } catch {
        // Pointer capture is best-effort.
      }
    }
  });
  toggleButton.addEventListener("pointermove", (event) => {
    if (!dragState.active || root.hidden || root.dataset.layout !== "mobile") {
      return;
    }

    const deltaY = event.clientY - dragState.startClientY;
    if (!dragState.moved && Math.abs(deltaY) < MOBILE_DRAG_THRESHOLD) {
      return;
    }

    dragState.moved = true;
    root.dataset.mobilePressed = "false";
    root.dataset.mobileDragging = "true";

    const visualViewport = window.visualViewport;
    const viewportHeight = Math.max(
      visualViewport?.height ?? 0,
      getViewportHeight(),
    );
    const viewportTopInset = Math.max(0, visualViewport?.offsetTop ?? 0);
    const minTopBoundary = Math.max(
      MOBILE_DRAG_GUTTER,
      viewportTopInset + getHeaderOffset(),
    );
    const nextTop = dragState.baseTop + deltaY;
    const clampedTop = Math.min(
      Math.max(minTopBoundary, nextTop),
      Math.max(
        minTopBoundary,
        viewportHeight - dragState.height - MOBILE_DRAG_GUTTER,
      ),
    );

    setMobileOffset(
      root,
      0,
      dragState.startOffsetY + (clampedTop - dragState.baseTop),
    );
  });

  const finishDragging = (): void => {
    if (!dragState.active) return;

    const didMove = dragState.moved;
    clearDrag();

    if (!didMove) return;

    toggleButton.dataset.dragSuppressed = "true";
    window.setTimeout(() => {
      toggleButton.dataset.dragSuppressed = "false";
    }, 0);
  };

  toggleButton.addEventListener("pointerup", finishDragging);
  toggleButton.addEventListener("pointercancel", finishDragging);
  toggleButton.addEventListener("lostpointercapture", finishDragging);
}
