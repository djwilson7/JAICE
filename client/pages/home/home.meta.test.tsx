import { describe, it, expect, vi } from "vitest";

vi.mock("@/pages/home/HomePage", () => ({
  HomePage: () => null,
}));

import { HomeRoute } from "./home.meta";

describe("home.meta", () => {
  it("exports HomeRoute with path /home", () => {
    expect(HomeRoute.path).toBe("/home");
  });

  it("exports HomeRoute with an element", () => {
    expect(HomeRoute.element).toBeDefined();
  });
});
