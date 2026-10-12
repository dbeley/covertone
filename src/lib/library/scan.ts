import type { ScanStatus } from "$lib/api/types";

export interface ScanWatchHandlers {
  /** Called on every poll with the latest server scan status. */
  onStatus: (status: ScanStatus) => void;
  /** Called once, when the scan is no longer running. */
  onFinished: (status: ScanStatus) => void;
  /** Called when a status request fails; watching stops afterwards. */
  onError: (error: unknown) => void;
}

export interface ScanWatchOptions {
  /** Delay between two status polls. */
  intervalMs?: number;
  /** Grace period during which a "not scanning" answer is not trusted. */
  settleMs?: number;
  /** Injectable clock, for tests. */
  now?: () => number;
}

const DEFAULT_INTERVAL_MS = 2000;
const DEFAULT_SETTLE_MS = 3000;

/**
 * Poll the server until the library scan it just started is over.
 *
 * `startScan` returns as soon as the scan is queued, and some servers report
 * stale status for a moment afterwards, so a "not scanning" answer is only
 * trusted once `settleMs` has elapsed since watching started.
 *
 * Returns a function that stops the polling.
 */
export function watchScan(
  fetchStatus: () => Promise<ScanStatus>,
  handlers: ScanWatchHandlers,
  options: ScanWatchOptions = {},
): () => void {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const settleMs = options.settleMs ?? DEFAULT_SETTLE_MS;
  const now = options.now ?? Date.now;
  const startedAt = now();

  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const stop = () => {
    stopped = true;
    if (timer !== undefined) clearTimeout(timer);
  };

  const poll = async () => {
    if (stopped) return;
    timer = undefined;

    let status: ScanStatus;
    try {
      status = await fetchStatus();
    } catch (error) {
      if (stopped) return;
      stop();
      handlers.onError(error);
      return;
    }
    if (stopped) return;

    handlers.onStatus(status);

    if (!status.scanning && now() - startedAt >= settleMs) {
      stop();
      handlers.onFinished(status);
      return;
    }

    timer = setTimeout(() => void poll(), intervalMs);
  };

  timer = setTimeout(() => void poll(), intervalMs);

  return stop;
}
