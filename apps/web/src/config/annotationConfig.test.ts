import { describe, expect, it } from "bun:test";

import {
  ANNOTATION_COLORS,
  DEFAULT_ANNOTATION_COLOR,
  getAnnotationColor,
  getCategoryLabel,
  isColorMatchingFilter,
} from "./annotationConfig";

describe("annotationConfig", () => {
  it("defines 5 semantic highlight colors with unique ids and hex values", () => {
    expect(ANNOTATION_COLORS).toHaveLength(5);
    const ids = ANNOTATION_COLORS.map((c) => c.id);
    const values = ANNOTATION_COLORS.map((c) => c.value);

    expect(new Set(ids).size).toBe(5);
    expect(new Set(values).size).toBe(5);
    expect(ids).toEqual(["amber", "emerald", "indigo", "rose", "purple"]);
  });

  it("resolves default color when undefined or empty", () => {
    expect(getAnnotationColor()).toBe(DEFAULT_ANNOTATION_COLOR);
    expect(getAnnotationColor("")).toBe(DEFAULT_ANNOTATION_COLOR);
  });

  it("resolves legacy yellow #facc15 to amber default", () => {
    const color = getAnnotationColor("#facc15");
    expect(color.id).toBe("amber");
    expect(color.name).toBe("Key Insight");
  });

  it("resolves by hex value case-insensitively", () => {
    const emerald = getAnnotationColor("#10B981");
    expect(emerald.id).toBe("emerald");
    expect(emerald.name).toBe("Actionable");

    const rose = getAnnotationColor("#f43f5e");
    expect(rose.id).toBe("rose");
    expect(rose.name).toBe("Critique");
  });

  it("resolves by color id", () => {
    const indigo = getAnnotationColor("indigo");
    expect(indigo.value).toBe("#6366f1");
    expect(indigo.name).toBe("Question / Research");

    const purple = getAnnotationColor("purple");
    expect(purple.value).toBe("#a855f7");
    expect(purple.name).toBe("Style / Prose");
  });

  it("returns human-readable category labels", () => {
    expect(getCategoryLabel("#f59e0b")).toBe("Key Insight");
    expect(getCategoryLabel("#6366f1")).toBe("Question / Research");
    expect(getCategoryLabel("#f43f5e")).toBe("Critique");
    expect(getCategoryLabel("unknown-color")).toBe("Key Insight");
  });

  it("matches colors correctly against filter ids", () => {
    expect(isColorMatchingFilter("#f59e0b", "all")).toBe(true);
    expect(isColorMatchingFilter("#f59e0b", "amber")).toBe(true);
    expect(isColorMatchingFilter("#f59e0b", "emerald")).toBe(false);
    expect(isColorMatchingFilter("#10b981", "emerald")).toBe(true);
  });
});
