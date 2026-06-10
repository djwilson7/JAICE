import { describe, it, expect } from "vitest";
import { AboutRoute, AuthAboutRoute } from "./about.meta";
import React from "react";

describe("about.meta", () => {
  it("should export AboutRoute", () => {
    expect(AboutRoute.path).toBe("/about");
    expect(AboutRoute.element).toBeDefined();
  });

  it("should export AuthAboutRoute", () => {
    expect(AuthAboutRoute.path).toBe("/auth-about");
    expect(AuthAboutRoute.element).toBeDefined();
  });
});
