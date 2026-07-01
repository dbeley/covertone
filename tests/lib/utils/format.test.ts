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

  it("formats hours", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3661)).toBe("1:01:01");
    expect(formatDuration(7384)).toBe("2:03:04");
  });

  it("handles fractional seconds", () => {
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

  it("does not mutate the original", () => {
    const arr = [1, 2, 3];
    const orig = [...arr];
    shuffle(arr);
    expect(arr).toEqual(orig);
  });

  it("handles empty and single-element arrays", () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle([42])).toEqual([42]);
  });
});
