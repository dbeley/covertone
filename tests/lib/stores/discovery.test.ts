import { describe, it, expect } from "vitest";
import { discoveryDrawerOpen } from "$lib/stores/discovery";
import { get } from "svelte/store";

describe("discoveryDrawerOpen", () => {
  it("starts closed", () => {
    expect(get(discoveryDrawerOpen)).toBe(false);
  });

  it("opens when set to true", () => {
    discoveryDrawerOpen.set(true);
    expect(get(discoveryDrawerOpen)).toBe(true);
  });

  it("toggles when updated", () => {
    discoveryDrawerOpen.set(true);
    discoveryDrawerOpen.update((v) => !v);
    expect(get(discoveryDrawerOpen)).toBe(false);
  });

  it("closes when set to false", () => {
    discoveryDrawerOpen.set(true);
    discoveryDrawerOpen.set(false);
    expect(get(discoveryDrawerOpen)).toBe(false);
  });
});
