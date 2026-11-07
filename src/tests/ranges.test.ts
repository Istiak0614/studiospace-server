import { describe, expect, it } from "vitest";
import { rangesOverlap } from "../utils/ranges.js";

const t = (hour: number) => new Date(Date.UTC(2026, 11, 5, hour));

describe("rangesOverlap (Challenge 2 rule)", () => {
  it("detects a partial overlap", () => {
    expect(rangesOverlap(t(10), t(14), t(12), t(15))).toBe(true);
  });
  it("detects a range fully inside another", () => {
    expect(rangesOverlap(t(9), t(18), t(11), t(12))).toBe(true);
  });
  it("detects identical ranges", () => {
    expect(rangesOverlap(t(10), t(12), t(10), t(12))).toBe(true);
  });
  it("allows back-to-back slots", () => {
    expect(rangesOverlap(t(10), t(12), t(12), t(14))).toBe(false);
    expect(rangesOverlap(t(12), t(14), t(10), t(12))).toBe(false);
  });
  it("allows completely separate slots", () => {
    expect(rangesOverlap(t(8), t(9), t(15), t(17))).toBe(false);
  });
});