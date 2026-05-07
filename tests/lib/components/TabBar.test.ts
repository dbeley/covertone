import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import TabBar from "$lib/components/TabBar.svelte";

vi.mock("$lib/stores/router", () => ({
  router: {
    subscribe: vi.fn((cb: (v: any) => void) => {
      cb({ path: "/", params: {}, matches: () => false, extractParams: () => ({}) });
      return vi.fn();
    }),
    navigate: vi.fn(),
    reset: vi.fn(),
  },
}));

vi.mock("$lib/stores/tabs", () => ({
  tabsStore: {
    subscribe: vi.fn((cb: (v: any) => void) => {
      cb({
        tabs: [
          { id: "t1", route: "/", title: "Home", scrollY: 0 },
          { id: "t2", route: "/albums", title: "Albums", scrollY: 100 },
        ],
        activeTabId: "t1",
      });
      return vi.fn();
    }),
    createTab: vi.fn(),
    closeTab: vi.fn(),
    activateTab: vi.fn(),
  },
}));

describe("TabBar", () => {
  it("renders tab titles", () => {
    render(TabBar);
    expect(screen.getByText("Home")).toBeTruthy();
    expect(screen.getByText("Albums")).toBeTruthy();
  });

  it("renders new tab button", () => {
    render(TabBar);
    expect(screen.getByLabelText("Create new tab")).toBeTruthy();
  });

  it("mounts without error", () => {
    const { container } = render(TabBar);
    expect(container.querySelector('[class*="flex"]')).toBeTruthy();
  });
});
