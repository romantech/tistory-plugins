import type { TocState } from "./runtime";

type PendingNavigation = {
  expiresAt: number;
  targetFreezeExpiresAt: number;
  frozenActiveId: string;
  destinationId: string;
  destinationScrollTop: number;
};

type CreateNavigationLockControllerOptions = {
  activeOffset: number;
  getHeaderOffset: () => number;
  getState: () => TocState;
  navigationLockClass: string;
  root: HTMLElement;
  scheduleSync: () => void;
  settleDelayMs: number;
  targetFreezeMs: number;
  timeoutMs: number;
};

export type NavigationLockController = {
  clear: (options?: { resync?: boolean }) => void;
  getFrozenActiveId: () => string | undefined;
  isActive: () => boolean;
  lock: (destinationId: string, destinationScrollTop: number) => void;
  touchSettle: () => void;
};

export function createNavigationLockController({
  activeOffset,
  getHeaderOffset,
  getState,
  navigationLockClass,
  root,
  scheduleSync,
  settleDelayMs,
  targetFreezeMs,
  timeoutMs,
}: CreateNavigationLockControllerOptions): NavigationLockController {
  let pendingNavigation: PendingNavigation | null = null;
  let pendingNavigationTimer = 0;
  let pendingNavigationSettleTimer = 0;

  function clearTimers(): void {
    if (pendingNavigationTimer) {
      window.clearTimeout(pendingNavigationTimer);
      pendingNavigationTimer = 0;
    }

    if (pendingNavigationSettleTimer) {
      window.clearTimeout(pendingNavigationSettleTimer);
      pendingNavigationSettleTimer = 0;
    }
  }

  function clear(options: { resync?: boolean } = {}): void {
    clearTimers();
    pendingNavigation = null;
    root.classList.remove(navigationLockClass);

    if (options.resync) {
      scheduleSync();
    }
  }

  function hasReachedNavigationTarget(): boolean {
    if (!pendingNavigation) return false;
    const navigation = pendingNavigation;

    const targetEntry = getState().entries.find(
      (entry) => entry.id === navigation.destinationId,
    );
    if (!targetEntry) return false;

    const headerOffset = getHeaderOffset();
    const targetTop = targetEntry.heading.getBoundingClientRect().top;

    return (
      Math.abs(window.scrollY - navigation.destinationScrollTop) <=
        activeOffset || Math.abs(targetTop - headerOffset) <= activeOffset
    );
  }

  function scheduleSettleCheck(): void {
    if (pendingNavigationSettleTimer) {
      window.clearTimeout(pendingNavigationSettleTimer);
    }

    pendingNavigationSettleTimer = window.setTimeout(() => {
      if (hasReachedNavigationTarget()) {
        clear({ resync: true });
        return;
      }

      pendingNavigationSettleTimer = 0;
    }, settleDelayMs);
  }

  function isActive(): boolean {
    if (!pendingNavigation) return false;

    if (performance.now() > pendingNavigation.expiresAt) {
      clear();
      return false;
    }

    return true;
  }

  return {
    clear,
    getFrozenActiveId(): string | undefined {
      if (!isActive() || !pendingNavigation) return undefined;

      return performance.now() <= pendingNavigation.targetFreezeExpiresAt
        ? pendingNavigation.frozenActiveId
        : undefined;
    },
    isActive,
    lock(destinationId: string, destinationScrollTop: number): void {
      clearTimers();

      pendingNavigation = {
        expiresAt: performance.now() + timeoutMs,
        targetFreezeExpiresAt: performance.now() + targetFreezeMs,
        frozenActiveId: getState().currentActiveId,
        destinationId,
        destinationScrollTop,
      };
      root.classList.add(navigationLockClass);

      pendingNavigationTimer = window.setTimeout(() => {
        clear({ resync: true });
      }, timeoutMs);

      scheduleSettleCheck();
    },
    touchSettle(): void {
      if (!pendingNavigation) return;
      scheduleSettleCheck();
    },
  };
}
