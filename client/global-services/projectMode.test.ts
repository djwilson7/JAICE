import { describe, expect, it } from "vitest";
import { parseProjectMode } from "./projectMode";

describe("parseProjectMode", () => {
  it("accepts the supported project modes", () => {
    expect(parseProjectMode("dev")).toBe("dev");
    expect(parseProjectMode("demo")).toBe("demo");
  });

  it("normalizes whitespace and casing", () => {
    expect(parseProjectMode(" Demo ")).toBe("demo");
  });

  it("rejects missing or unsupported modes", () => {
    expect(() => parseProjectMode(undefined)).toThrow(/VITE_PROJECT_MODE/);
    expect(() => parseProjectMode("production")).toThrow(/VITE_PROJECT_MODE/);
  });
});
