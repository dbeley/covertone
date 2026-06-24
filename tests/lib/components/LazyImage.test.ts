import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/svelte";
import LazyImage from "$lib/components/LazyImage.svelte";

describe("LazyImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders an image with src and alt", () => {
    render(LazyImage, {
      src: "https://example.com/image.jpg",
      alt: "Test image",
    });
    const img = screen.getByAltText("Test image") as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toBe("https://example.com/image.jpg");
  });

  it("applies custom class", () => {
    const { container } = render(LazyImage, {
      src: "https://example.com/image.jpg",
      alt: "test",
      class: "custom-class",
    });
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("class")).toContain("custom-class");
  });

  it("sets loading attribute", () => {
    const { container } = render(LazyImage, {
      src: "https://example.com/image.jpg",
      alt: "test",
      loading: "lazy",
    });
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("loading")).toBe("lazy");
  });

  it("sets decoding attribute", () => {
    const { container } = render(LazyImage, {
      src: "https://example.com/image.jpg",
      alt: "test",
      decoding: "async",
    });
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("decoding")).toBe("async");
  });
});
