import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import BackButton from "$lib/components/BackButton.svelte";

describe("BackButton", () => {
  it("renders label and aria-label", () => {
    render(BackButton);
    expect(screen.getByText("Back")).toBeDefined();
    expect(screen.getByLabelText("Go back")).toBeDefined();
  });

  it("calls history.back on click", () => {
    const spy = vi.spyOn(window.history, "back").mockImplementation(() => {});
    render(BackButton);
    fireEvent.click(screen.getByText("Back"));
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
