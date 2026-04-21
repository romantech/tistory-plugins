import type { TocEntry } from "./runtime";

const LAYOUT_SHIFT_RESOURCE_SELECTOR = "img, iframe, video, embed, object";

function primeInitialNavigationResource(resource: HTMLElement): void {
  if (
    (resource instanceof HTMLImageElement ||
      resource instanceof HTMLIFrameElement) &&
    resource.loading === "lazy"
  ) {
    resource.loading = "eager";
  }

  if (
    resource instanceof HTMLVideoElement &&
    (!resource.preload || resource.preload === "none")
  ) {
    resource.preload = "metadata";
  }

  if (
    resource instanceof HTMLImageElement &&
    typeof resource.decode === "function"
  ) {
    void resource.decode().catch(() => undefined);
  }
}

function resourceNeedsInitialNavigationWait(resource: HTMLElement): boolean {
  if (resource instanceof HTMLImageElement) {
    return !resource.complete;
  }

  if (resource instanceof HTMLIFrameElement) {
    return resource.loading === "lazy";
  }

  if (resource instanceof HTMLVideoElement) {
    return resource.readyState < HTMLMediaElement.HAVE_METADATA;
  }

  return false;
}

export function getLayoutShiftResourcesBeforeEntry(
  article: HTMLElement,
  entry: TocEntry,
): HTMLElement[] {
  return Array.from(
    article.querySelectorAll(LAYOUT_SHIFT_RESOURCE_SELECTOR),
  ).filter((element): element is HTMLElement => {
    if (!(element instanceof HTMLElement) || !element.isConnected) {
      return false;
    }

    return Boolean(
      element.compareDocumentPosition(entry.heading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
}

export function getUnsettledLayoutShiftResourcesBeforeEntry(
  article: HTMLElement,
  entry: TocEntry,
): HTMLElement[] {
  return getLayoutShiftResourcesBeforeEntry(article, entry).filter(
    resourceNeedsInitialNavigationWait,
  );
}

export function primeInitialNavigationResources(
  resources: Iterable<HTMLElement>,
): void {
  for (const resource of resources) {
    primeInitialNavigationResource(resource);
  }
}

export function bindInitialNavigationResourceSettle(
  resource: HTMLElement,
  onSettled: () => void,
): () => void {
  const settleEventName =
    resource instanceof HTMLVideoElement ? "loadeddata" : "load";

  resource.addEventListener(settleEventName, onSettled, { once: true });
  resource.addEventListener("error", onSettled, { once: true });

  return () => {
    resource.removeEventListener(settleEventName, onSettled);
    resource.removeEventListener("error", onSettled);
  };
}
