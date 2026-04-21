export type TocViewport = {
  layoutHeight: number;
  layoutWidth: number;
  visibleBottom: number;
  visibleHeight: number;
  visibleTop: number;
};

function getLayoutViewportWidth(): number {
  return Math.max(window.innerWidth, document.documentElement.clientWidth, 0);
}

function getLayoutViewportHeight(): number {
  return Math.max(window.innerHeight, document.documentElement.clientHeight, 0);
}

export function getTocViewport(): TocViewport {
  const visualViewport = window.visualViewport;
  const layoutWidth = getLayoutViewportWidth();
  const layoutHeight = getLayoutViewportHeight();
  const visibleTop = Math.max(0, visualViewport?.offsetTop ?? 0);
  const visibleHeight =
    visualViewport && visualViewport.height > 0
      ? visualViewport.height
      : layoutHeight;

  return {
    layoutHeight,
    layoutWidth,
    visibleBottom: visibleTop + visibleHeight,
    visibleHeight,
    visibleTop,
  };
}
