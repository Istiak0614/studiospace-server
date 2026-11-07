import { describe, expect, it } from "vitest";
import { validateStudioInput } from "../modules/studio/studio.validation.js";
import { escapeRegex } from "../utils/escapeRegex.js";

const valid = {
  title: "Test Loft", category: "Photo Studio", hourlyRate: 40, securityDeposit: 50,
  maxCapacity: 6, location: "Gulshan, Dhaka", images: ["https://i.ibb.co/abc/photo.jpg"],
  amenities: [" Wi-Fi ", ""], overview: "A bright loft used to test the validator.",
};

describe("validateStudioInput", () => {
  it("accepts a valid studio and cleans amenities", () => {
    const { data, errors } = validateStudioInput(valid);
    expect(errors).toEqual([]);
    expect(data?.amenities).toEqual(["Wi-Fi"]);
  });
  it("rejects an unknown category", () => {
    expect(validateStudioInput({ ...valid, category: "Garage" }).errors).toContain("Please choose a valid category");
  });
  it("rejects non-https images and too many images", () => {
    expect(validateStudioInput({ ...valid, images: ["http://x.com/a.jpg"] }).data).toBeUndefined();
    expect(validateStudioInput({ ...valid, images: Array(6).fill(valid.images[0]) }).data).toBeUndefined();
  });
  it("rejects a zero hourly rate and a fractional capacity", () => {
    const { errors } = validateStudioInput({ ...valid, hourlyRate: 0, maxCapacity: 2.5 });
    expect(errors).toHaveLength(2);
  });
});

describe("escapeRegex", () => {
  it("makes special characters literal", () => {
    expect(new RegExp(escapeRegex("C++ (studio)")).test("C++ (studio)")).toBe(true);
    expect(() => new RegExp(escapeRegex("("))).not.toThrow();
  });
});