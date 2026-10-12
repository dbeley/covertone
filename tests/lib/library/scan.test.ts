import { describe, it, expect, vi, afterEach } from "vitest";
import { watchScan } from "$lib/library/scan";
import type { ScanStatus } from "$lib/api/types";

const scanning: ScanStatus = { scanning: true, count: 4 };
const done: ScanStatus = {
  scanning: false,
  count: 42,
  lastScan: "2026-10-12T18:31:00Z",
};

function createHandlers() {
  return {
    onStatus: vi.fn(),
    onFinished: vi.fn(),
    onError: vi.fn(),
  };
}

describe("watchScan", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("polls the status until the scan finishes, then stops", async () => {
    vi.useFakeTimers();
    const fetchStatus = vi
      .fn()
      .mockResolvedValueOnce(scanning)
      .mockResolvedValueOnce(scanning)
      .mockResolvedValue(done);
    const handlers = createHandlers();

    watchScan(fetchStatus, handlers, { intervalMs: 100, settleMs: 0 });

    await vi.advanceTimersByTimeAsync(100);
    expect(fetchStatus).toHaveBeenCalledTimes(1);
    expect(handlers.onStatus).toHaveBeenLastCalledWith(scanning);
    expect(handlers.onFinished).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(100);

    expect(handlers.onStatus).toHaveBeenLastCalledWith(done);
    expect(handlers.onFinished).toHaveBeenCalledTimes(1);
    expect(handlers.onFinished).toHaveBeenCalledWith(done);
    expect(handlers.onError).not.toHaveBeenCalled();

    // Polling stopped: no further status requests.
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchStatus).toHaveBeenCalledTimes(3);
  });

  it("waits for the settle window before trusting a finished scan", async () => {
    vi.useFakeTimers();
    const fetchStatus = vi.fn().mockResolvedValue(done);
    const handlers = createHandlers();

    // simulate a server reporting stale "not scanning" for 500ms
    let clock = 0;
    watchScan(fetchStatus, handlers, {
      intervalMs: 100,
      settleMs: 500,
      now: () => clock,
    });

    await vi.advanceTimersByTimeAsync(100);
    expect(handlers.onStatus).toHaveBeenCalledWith(done);
    expect(handlers.onFinished).not.toHaveBeenCalled();

    clock = 600;
    await vi.advanceTimersByTimeAsync(100);

    expect(handlers.onFinished).toHaveBeenCalledTimes(1);
  });

  it("reports a status request failure once and stops polling", async () => {
    vi.useFakeTimers();
    const error = new Error("HTTP 501: Not Implemented");
    const fetchStatus = vi.fn().mockRejectedValue(error);
    const handlers = createHandlers();

    watchScan(fetchStatus, handlers, { intervalMs: 100, settleMs: 0 });

    await vi.advanceTimersByTimeAsync(150);

    expect(handlers.onError).toHaveBeenCalledTimes(1);
    expect(handlers.onError).toHaveBeenCalledWith(error);
    expect(handlers.onFinished).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchStatus).toHaveBeenCalledTimes(1);
  });

  it("stops polling when the returned function is called", async () => {
    vi.useFakeTimers();
    const fetchStatus = vi.fn().mockResolvedValue(scanning);
    const handlers = createHandlers();

    const stop = watchScan(fetchStatus, handlers, {
      intervalMs: 100,
      settleMs: 0,
    });
    stop();

    await vi.advanceTimersByTimeAsync(1000);

    expect(fetchStatus).not.toHaveBeenCalled();
    expect(handlers.onStatus).not.toHaveBeenCalled();
  });

  it("does not report after being stopped mid-poll", async () => {
    vi.useFakeTimers();
    let resolveStatus: (status: ScanStatus) => void = () => {};
    const fetchStatus = vi.fn(
      () => new Promise<ScanStatus>((resolve) => (resolveStatus = resolve)),
    );
    const handlers = createHandlers();

    const stop = watchScan(fetchStatus, handlers, {
      intervalMs: 100,
      settleMs: 0,
    });

    await vi.advanceTimersByTimeAsync(100);
    expect(fetchStatus).toHaveBeenCalledTimes(1);

    stop();
    resolveStatus(done);
    await vi.advanceTimersByTimeAsync(0);

    expect(handlers.onStatus).not.toHaveBeenCalled();
    expect(handlers.onFinished).not.toHaveBeenCalled();
  });
});
