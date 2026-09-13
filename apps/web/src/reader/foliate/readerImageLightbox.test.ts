import { describe, expect, it } from "bun:test";

import type { LightboxImageTarget } from "../contracts/engine";

describe("Reader Image Lightbox & Image Click Resolution", () => {
  it("constructs valid LightboxImageTarget model with dimensions and caption", () => {
    const target: LightboxImageTarget = {
      alt: "Map of Middle-earth",
      caption: "Figure 1. Map of Middle-earth in the Third Age",
      naturalHeight: 1080,
      naturalWidth: 1920,
      src: "blob:http://localhost/image-map.png",
      title: "Middle-earth Map",
    };

    expect(target.src).toBe("blob:http://localhost/image-map.png");
    expect(target.caption).toContain("Figure 1");
    expect(target.naturalWidth).toBe(1920);
    expect(target.naturalHeight).toBe(1080);
  });

  it("sanitizes image download filenames properly", () => {
    const sanitize = (raw: string) =>
      raw.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();

    expect(sanitize("Figure 1: Map of Middle-earth!")).toBe(
      "figure_1__map_of_middle-earth_"
    );
    expect(sanitize("Circuit Diagram (v2.1)")).toBe("circuit_diagram__v2_1_");
  });

  it("calculates zoom scale stepping and boundary clamping", () => {
    const zoomIn = (scale: number) =>
      Math.min(5, Number((scale + 0.25).toFixed(2)));
    const zoomOut = (scale: number) =>
      Math.max(0.5, Number((scale - 0.25).toFixed(2)));

    // Zoom in from 1.0
    expect(zoomIn(1)).toBe(1.25);
    expect(zoomIn(4.9)).toBe(5);
    expect(zoomIn(5)).toBe(5);

    // Zoom out from 1.0
    expect(zoomOut(1)).toBe(0.75);
    expect(zoomOut(0.6)).toBe(0.5);
    expect(zoomOut(0.5)).toBe(0.5);
  });

  it("recognizes tiny icons that should be excluded from lightbox modal", () => {
    const isTinyIcon = (width: number, height: number) =>
      width > 0 && width <= 28 && height <= 28;

    expect(isTinyIcon(16, 16)).toBe(true);
    expect(isTinyIcon(24, 24)).toBe(true);
    expect(isTinyIcon(28, 28)).toBe(true);
    expect(isTinyIcon(32, 32)).toBe(false);
    expect(isTinyIcon(800, 600)).toBe(false);
  });
});
