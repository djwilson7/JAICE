import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIsMultiSelecting } from "./useIsMultiSelecting";
import { MultiSelectContext } from "../contexts/MultiSelectContext";
import React from "react";

describe("useIsMultiSelecting", () => {
  it("throws error when used outside MultiSelectProvider", () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useIsMultiSelecting())).toThrow(
      "useIsMultiSelecting must be used within a MultiSelectProvider"
    );
    consoleSpy.mockRestore();
  });

  it("returns context value when used within MultiSelectProvider", () => {
    const mockContextValue = { isMultiSelecting: true } as any;
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MultiSelectContext.Provider value={mockContextValue}>{children}</MultiSelectContext.Provider>
    );

    const { result } = renderHook(() => useIsMultiSelecting(), { wrapper });
    expect(result.current).toEqual(mockContextValue);
  });
});
