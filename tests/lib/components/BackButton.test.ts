import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import BackButton from "$lib/components/BackButton.svelte";

describe("BackButton", () => {
  it("renders the back button", () => {
    render(BackButton);
    expect(screen.getByText("Back")).toBeDefined();
  });

  it("has correct aria-label", () => {
    render(BackButton);
    expect(screen.getByLabelText("Go back")).toBeDefined();
  });

  it("calls window.history.back on click", () => {
    const backSpy = vi
      .spyOn(window.history, "back")
      .mockImplementation(() => {});
    render(BackButton);
    fireEvent.click(screen.getByText("Back"));
    expect(backSpy).toHaveBeenCalledTimes(1);
    backSpy.mockRestore();
  });
});
