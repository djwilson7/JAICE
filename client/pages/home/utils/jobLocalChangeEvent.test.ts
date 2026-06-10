import { describe, it, expect, vi } from "vitest";
import { dispatchJobLocalChange, JOB_LOCAL_CHANGE_EVENT } from "./jobLocalChangeEvent";
import type { JobCardType } from "@/types/jobCardType";

describe("jobLocalChangeEvent", () => {
  it("dispatches custom event on window", () => {
    const mockDispatch = vi.spyOn(window, "dispatchEvent");
    
    const before = { id: "1", column: "inbox" } as JobCardType;
    const after = { id: "1", column: "applied" } as JobCardType;
    
    dispatchJobLocalChange({ before, after });
    
    expect(mockDispatch).toHaveBeenCalledOnce();
    const event = mockDispatch.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe(JOB_LOCAL_CHANGE_EVENT);
    expect(event.detail).toEqual({ before, after });
    
    mockDispatch.mockRestore();
  });
});
