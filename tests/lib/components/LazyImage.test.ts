import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import LazyImage from "$lib/components/LazyImage.svelte";

describe("LazyImage", () => {
  it("renders with src and alt", () => {
    render(LazyImage, { src: "https://ex.com/img.jpg", alt: "desc" });
    const img = screen.getByAltText("desc") as HTMLImageElement;
    expect(img.src).toBe("https://ex.com/img.jpg");
  });

  it("applies custom class", () => {
    const { container } = render(LazyImage, { src: "https://ex.com/img.jpg", alt: "t", class: "my-class" });
    expect(container.querySelector("img")?.getAttribute("class")).toContain("my-class");
  });

  it("sets loading attribute", () => {
    const { container } = render(LazyImage, { src: "https://ex.com/img.jpg", alt: "t", loading: "lazy" });
    expect(container.querySelector("img")?.getAttribute("loading")).toBe("lazy");
  });

  it("sets decoding attribute", () => {
    const { container } = render(LazyImage, { src: "https://ex.com/img.jpg", alt: "t", decoding: "async" });
    expect(container.querySelector("img")?.getAttribute("decoding")).toBe("async");
  });
});
