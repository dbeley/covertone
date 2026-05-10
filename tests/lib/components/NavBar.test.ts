import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import NavBar from "$lib/components/NavBar.svelte";

const mockRoute = { path: "/", params: {}, matches: () => false };

vi.mock("$lib/stores/tabs", () => ({
  tabsStore: {
    subscribe: vi.fn((cb: (v: any) => void) => {
      cb({ tabs: [], activeTabId: null });
      return vi.fn();
    }),
    createTab: vi.fn(),
  },
}));

vi.mock("$lib/stores/router", () => ({
  router: {
    subscribe: vi.fn((cb: (route: typeof mockRoute) => void) => {
      cb(mockRoute);
      return vi.fn();
    }),
    navigate: vi.fn(),
    reset: vi.fn(),
  },
}));

describe("NavBar", () => {
  it("renders all navigation links", () => {
    render(NavBar);
    expect(screen.getByText("Home")).toBeTruthy();
    expect(screen.getByText("Albums")).toBeTruthy();
    expect(screen.getByText("Artists")).toBeTruthy();
    expect(screen.getByText("Playlists")).toBeTruthy();
    expect(screen.getByText("Favorites")).toBeTruthy();
    expect(screen.getByText("Search")).toBeTruthy();
    expect(screen.getByText("Game")).toBeTruthy();
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("renders create new tab button", () => {
    render(NavBar);
    expect(screen.getByText("Create a new tab")).toBeTruthy();
  });
});
