import { describe, it, expect } from "vitest";
import { SelectedJobsContext } from "./SelectedJobsContext";

describe("SelectedJobsContext", () => {
  it("exports a context object", () => {
    expect(SelectedJobsContext).toBeTruthy();
  });

  it("default value is null", () => {
    expect(SelectedJobsContext._currentValue).toBeNull();
  });
});
