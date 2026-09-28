import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsProvider } from "./SettingsProvider";
import { useSettings } from "./settingsContext";
import { SETTINGS_KEYS } from "./settingKeys";

vi.mock("@/global-services/projectMode", () => ({ IS_DEMO_MODE: true }));

function ThemeProbe() {
  const { theme, setTheme } = useSettings();
  return (
    <>
      <span data-testid="theme">{theme}</span>
      <button type="button" onClick={() => setTheme("light")}>Set light</button>
    </>
  );
}

describe("SettingsProvider in demo mode", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("forces dark mode despite stored, context, or DOM light-mode requests", () => {
    window.localStorage.setItem(SETTINGS_KEYS.THEME, "light");
    render(
      <SettingsProvider>
        <ThemeProbe />
      </SettingsProvider>
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");

    act(() => screen.getByRole("button", { name: "Set light" }).click());
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");

    act(() => {
      document.documentElement.setAttribute("data-theme", "light");
      window.dispatchEvent(new Event("appearancechange"));
    });
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });
});
