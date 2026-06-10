import { renderHook } from "@testing-library/react";
import { useSettings } from "./settingsContext";
import { describe, it, expect } from "vitest";

describe("useSettings", () => {
  it("should throw an error if used outside of SettingsProvider", () => {
    // Suppress console.error as we expect an error to be thrown and logged by React/Vitest
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => renderHook(() => useSettings())).toThrow(
      "useSettings must be used inside <SettingsProvider>"
    );
    
    consoleSpy.mockRestore();
  });
});
