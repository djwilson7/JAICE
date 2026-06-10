import { describe, it, expect } from "vitest";
import { DashboardRoute } from "./dashboard.meta";

describe("DashboardRoute", () => {
  it("should have correct path and element", () => {
    expect(DashboardRoute.path).toBe("/dashboard");
    expect(DashboardRoute.element).toBeDefined();
  });
});
