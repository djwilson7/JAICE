import { renderHook } from "@testing-library/react";
import { useJobCard } from "./useJobCard";
import { JobCardContext } from "../contexts/JobCardContext";
import { describe, it, expect, vi } from "vitest";
import React from 'react';

describe("useJobCard", () => {
  it("should throw error if used outside of JobCardProvider", () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useJobCard())).toThrow("useJobCard must be used inside JobCardProvider");
    consoleSpy.mockRestore();
  });

  it("should return context value if used inside JobCardProvider", () => {
    const mockCtx = { job: { id: '1' } } as any;
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <JobCardContext.Provider value={mockCtx}>{children}</JobCardContext.Provider>
    );
    const { result } = renderHook(() => useJobCard(), { wrapper });
    expect(result.current).toBe(mockCtx);
  });
});
