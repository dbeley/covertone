import { describe, it, expect } from "vitest";
import { formatDuration, shuffle } from "$lib/utils/format";

describe("formatDuration", () => {
  it("formats seconds-only durations", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(59)).toBe("0:59");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(60)).toBe("1:00");
    expect(formatDuration(90)).toBe("1:30");
    expect(formatDuration(3599)).toBe("59:59");
  });

  it("formats hours, minutes, and seconds", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3661)).toBe("1:01:01");
    expect(formatDuration(7384)).toBe("2:03:04");
  });

  it("handles edge cases", () => {
    expect(formatDuration(0.5)).toBe("0:00");
    expect(formatDuration(59.9)).toBe("0:59");
  });
});

describe("shuffle", () => {
  it("returns all elements", () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle(arr);
    expect(result).toHaveLength(arr.length);
    expect(result.sort()).toEqual(arr.sort());
  });

  it("does not mutate original array", () => {
    const arr = [1, 2, 3, 4, 5];
    const original = [...arr];
    shuffle(arr);
    expect(arr).toEqual(original);
  });

  it("handles empty array", () => {
    expect(shuffle([])).toEqual([]);
  });

  it("handles single element", () => {
    expect(shuffle([42])).toEqual([42]);
  });

  it("produces variations (probabilistic)", () => {
    // Run shuffle many times; expect at least some different orderings
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      results.add(shuffle(arr).join(","));
    }
    // With 8 elements, 20 shuffles should produce at least a few distinct orders
    expect(results.size).toBeGreaterThan(1);
  });
});
