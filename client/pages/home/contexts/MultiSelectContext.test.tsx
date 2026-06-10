import { describe, it, expect } from "vitest";
import { MultiSelectContext } from "./MultiSelectContext";

describe("MultiSelectContext", () => {
  it("exports a context object", () => {
    expect(MultiSelectContext).toBeTruthy();
  });

  it("default value is null", () => {
    expect(MultiSelectContext._currentValue).toBeNull();
  });
});
