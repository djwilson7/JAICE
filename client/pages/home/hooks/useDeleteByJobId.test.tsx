import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, renderHook } from "@testing-library/react";
import { useDeleteByJobId } from "./useDeleteByJobId";
import { api } from "@/global-services/api";
import { useIsMultiSelecting } from "./useIsMultiSelecting";
import { useUndoRedo } from "./useUndoRedo";

vi.mock("@/global-services/api", () => ({
  api: vi.fn(),
}));

vi.mock("./useIsMultiSelecting", () => ({
  useIsMultiSelecting: vi.fn(),
}));

vi.mock("./useUndoRedo", () => ({
  useUndoRedo: vi.fn(),
}));

const TestComponent = ({ onResult }: { onResult: (res: boolean) => void }) => {
  const { deleteJob } = useDeleteByJobId();
  
  return (
    <button data-testid="delete" onClick={async () => {
      const res = await deleteJob({ id: "job1" } as any);
      onResult(res);
    }}>Delete</button>
  );
};

describe("useDeleteByJobId", () => {
  const setIsMultiSelecting = vi.fn();
  const pushUndo = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useIsMultiSelecting as any).mockReturnValue({ setIsMultiSelecting });
    (useUndoRedo as any).mockReturnValue({ pushUndo });
  });

  it("deletes job successfully", async () => {
    (api as any).mockResolvedValue({ status: "success", count: 1 });
    const onResult = vi.fn();
    
    render(<TestComponent onResult={onResult} />);
    
    await act(async () => {
      screen.getByTestId("delete").click();
    });
    
    expect(api).toHaveBeenCalledWith("/api/jobs/set-delete", expect.any(Object));
    expect(setIsMultiSelecting).toHaveBeenCalledWith(false);
    expect(pushUndo).toHaveBeenCalled();
    expect(onResult).toHaveBeenCalledWith(true);
  });

  it("handles api failure", async () => {
    (api as any).mockResolvedValue({ status: "error" });
    const onResult = vi.fn();
    
    render(<TestComponent onResult={onResult} />);
    
    await act(async () => {
      screen.getByTestId("delete").click();
    });
    
    expect(onResult).toHaveBeenCalledWith(false);
    expect(setIsMultiSelecting).not.toHaveBeenCalled();
  });

  it("handles network error", async () => {
    (api as any).mockRejectedValue(new Error("Network"));
    const onResult = vi.fn();
    
    render(<TestComponent onResult={onResult} />);
    
    await act(async () => {
      screen.getByTestId("delete").click();
    });
    
    expect(onResult).toHaveBeenCalledWith(false);
  });
});
