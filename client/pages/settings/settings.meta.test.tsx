import { describe, it, expect, vi } from "vitest";

vi.mock("@/pages/settings/SettingsPage", () => ({
  SettingsPage: () => null,
}));

import { SettingsRoute } from "./settings.meta";

describe("settings.meta", () => {
  it("exports SettingsRoute with path /settings", () => {
    expect(SettingsRoute.path).toBe("/settings");
  });

  it("exports SettingsRoute with an element", () => {
    expect(SettingsRoute.element).toBeDefined();
  });
});
