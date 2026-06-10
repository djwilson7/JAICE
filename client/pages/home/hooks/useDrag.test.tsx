import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDrag } from "./useDrag";
import { DragContext } from "@/pages/home/contexts/DragContext";
import React from "react";

describe("useDrag", () => {
  it("throws error when used outside DragProvider", () => {
    // Suppress console error from React error boundary
    const consoleError = console.error;
    console.error = () => {};
    expect(() => renderHook(() => useDrag())).toThrow("useDrag must be used within a DragProvider");
    console.error = consoleError;
  });

  it("returns context value when used within DragProvider", () => {
    const mockContextValue = { isDragging: true, dragId: "123" } as any;
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DragContext.Provider value={mockContextValue}>{children}</DragContext.Provider>
    );

    const { result } = renderHook(() => useDrag(), { wrapper });
    expect(result.current).toEqual(mockContextValue);
  });
});
