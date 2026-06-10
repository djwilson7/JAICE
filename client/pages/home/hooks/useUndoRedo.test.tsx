import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUndoRedo } from "./useUndoRedo";
import { UndoRedoContext } from "@/pages/home/contexts/UndoRedoContext";
import React from "react";

describe("useUndoRedo", () => {
  it("throws error when used outside UndoRedoProvider", () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useUndoRedo())).toThrow(
      "useUndoRedo must be used within an UndoRedoProvider"
    );
    consoleSpy.mockRestore();
  });

  it("returns context value when used within UndoRedoProvider", () => {
    const mockContextValue = { hasUndo: true, hasRedo: false } as any;
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UndoRedoContext.Provider value={mockContextValue}>{children}</UndoRedoContext.Provider>
    );

    const { result } = renderHook(() => useUndoRedo(), { wrapper });
    expect(result.current).toEqual(mockContextValue);
  });
});
