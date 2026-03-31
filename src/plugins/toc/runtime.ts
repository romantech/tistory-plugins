export type TocEntry = {
  heading: HTMLElement;
  id: string;
  level: number;
  link: HTMLAnchorElement;
  label: HTMLSpanElement;
  text: string;
};

export type TocState = {
  article: HTMLElement;
  scope: HTMLElement;
  bottomBoundary: HTMLElement;
  entries: TocEntry[];
  currentActiveId: string;
};

export type RootLayout = {
  hidden: boolean;
  left?: number;
  top?: number;
  width?: number;
  safeTop?: number;
};

type ResolveActiveIdOptions = {
  activeId: string;
  hashedId?: string;
  isInitialLayoutPending: boolean;
  lockedTargetId?: string;
};

type RootLayoutMetrics = {
  bottomBoundaryRect: DOMRect;
  headerOffset: number;
  rootHeight: number;
  scopeRect: DOMRect;
  useScopeBottomBoundary: boolean;
  viewportHeight: number;
  viewportWidth: number;
};

type RootLayoutConstraints = {
  defaultPanelWidth: number;
  minDesktopWidth: number;
  minPanelWidth: number;
  minScopeWidth: number;
  panelGap: number;
  rightRailGutter: number;
  safeTopGap: number;
  viewportGutter: number;
};

export function resolveActiveId({
  activeId,
  hashedId,
  isInitialLayoutPending,
  lockedTargetId,
}: ResolveActiveIdOptions): string {
  if (isInitialLayoutPending) {
    return hashedId || activeId;
  }

  return lockedTargetId || activeId;
}

export function hasDetachedTargets(state: TocState): boolean {
  if (!state.article.isConnected || !state.scope.isConnected) {
    return true;
  }

  if (!state.bottomBoundary.isConnected) {
    return true;
  }

  return state.entries.some(({ heading }) => !heading.isConnected);
}

export function resolveRootLayout(
  {
    bottomBoundaryRect,
    headerOffset,
    rootHeight,
    scopeRect,
    useScopeBottomBoundary,
    viewportHeight,
    viewportWidth,
  }: RootLayoutMetrics,
  {
    defaultPanelWidth,
    minDesktopWidth,
    minPanelWidth,
    minScopeWidth,
    panelGap,
    rightRailGutter,
    safeTopGap,
    viewportGutter,
  }: RootLayoutConstraints,
): RootLayout {
  const maxPanelWidth = viewportWidth - rightRailGutter - viewportGutter;
  const panelWidth = Math.min(defaultPanelWidth, maxPanelWidth);
  const left = viewportWidth - rightRailGutter - panelWidth;
  const articleGap = left - scopeRect.right;
  const safeTop = headerOffset + safeTopGap;
  const shouldShow =
    viewportWidth >= minDesktopWidth &&
    scopeRect.width >= minScopeWidth &&
    scopeRect.right > 0 &&
    scopeRect.bottom > 0 &&
    scopeRect.top < viewportHeight &&
    panelWidth >= minPanelWidth &&
    articleGap >= panelGap;

  if (!shouldShow) {
    return { hidden: true };
  }

  const desiredTop = Math.max(
    safeTop,
    Math.round(viewportHeight / 2 - rootHeight / 2),
  );
  const clampEdge = useScopeBottomBoundary
    ? scopeRect.bottom
    : bottomBoundaryRect.bottom;
  const maxTop = Math.round(clampEdge - rootHeight - safeTopGap);
  const revealTop = Math.max(safeTop, Math.round(scopeRect.top));
  const centeredTop = Math.min(desiredTop, maxTop);
  const resolvedTop =
    maxTop < revealTop ? maxTop : Math.max(revealTop, centeredTop);

  if (resolvedTop + rootHeight <= 0) {
    return { hidden: true };
  }

  return {
    hidden: false,
    left: Math.round(left),
    top: resolvedTop,
    width: Math.round(panelWidth),
    safeTop: Math.round(safeTop),
  };
}
