import { describe, it, expect } from "vitest";
import { NavigationBarRoute } from "./navigation.meta";

describe("navigation.meta", () => {
  it("exports NavigationBarRoute correctly", () => {
    expect(NavigationBarRoute.path).toBe("/");
    expect(NavigationBarRoute.element).toBeTruthy();
  });
});
