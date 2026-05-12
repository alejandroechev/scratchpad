import { describe, it, expect } from "vitest";
import { getLabelColor } from "../../src/domain/services/label-color.js";
import type { LabelColor } from "../../src/domain/services/label-color.js";

describe("getLabelColor", () => {
  it("returns the same color for the same label (deterministic)", () => {
    const a = getLabelColor("work");
    const b = getLabelColor("work");
    expect(a).toEqual(b);
  });

  it("returns different colors for different labels", () => {
    const a = getLabelColor("work");
    const b = getLabelColor("personal");
    expect(a.bg).not.toBe(b.bg);
    expect(a.text).not.toBe(b.text);
  });

  it("returns valid HSL strings for bg and text", () => {
    const color = getLabelColor("urgent");
    expect(color.bg).toMatch(/^hsl\(\d{1,3}, 55%, 88%\)$/);
    expect(color.text).toMatch(/^hsl\(\d{1,3}, 45%, 35%\)$/);
  });

  it("handles empty string without crashing", () => {
    const color = getLabelColor("");
    expect(color.bg).toBeDefined();
    expect(color.text).toBeDefined();
  });

  it("handles unicode labels", () => {
    const color = getLabelColor("日本語ラベル");
    expect(color.bg).toMatch(/^hsl\(\d{1,3}, 55%, 88%\)$/);
    expect(color.text).toMatch(/^hsl\(\d{1,3}, 45%, 35%\)$/);
  });

  it("produces pastel background (lightness 88%)", () => {
    const color = getLabelColor("test");
    expect(color.bg).toContain("88%");
  });

  it("produces darker text (lightness 35%)", () => {
    const color = getLabelColor("test");
    expect(color.text).toContain("35%");
  });

  it("spreads hues across the spectrum for sequential labels", () => {
    const hues = ["a", "b", "c", "d", "e"].map((l) => {
      const match = getLabelColor(l).bg.match(/^hsl\((\d+)/);
      return Number(match![1]);
    });
    const uniqueHues = new Set(hues);
    expect(uniqueHues.size).toBe(5);
  });
});
