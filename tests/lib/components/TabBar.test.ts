import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import TabBar from "$lib/components/TabBar.svelte";

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

  it("highlights active tab", () => {
    render(TabBar);
    const tabs = screen.getAllByRole("button");
    expect(tabs[0].className).toContain("text-accent");
  });
});
