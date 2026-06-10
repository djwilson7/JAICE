import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useDeleteConfirm } from "./useDeleteConfirm";

const TestComponent = ({ onConfirm }: { onConfirm: () => Promise<void> }) => {
  const { open, processing, requestDelete, cancel, confirm } = useDeleteConfirm(onConfirm);
  
  return (
    <div>
      <span data-testid="open">{open.toString()}</span>
      <span data-testid="processing">{processing.toString()}</span>
      <button data-testid="request" onClick={() => requestDelete(vi.fn())}>Request</button>
      <button data-testid="cancel" onClick={cancel}>Cancel</button>
      <button data-testid="confirm" onClick={confirm}>Confirm</button>
    </div>
  );
};

describe("useDeleteConfirm", () => {
  it("handles state correctly for confirming", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<TestComponent onConfirm={onConfirm} />);
    
    expect(screen.getByTestId("open").textContent).toBe("false");
    
    act(() => {
      screen.getByTestId("request").click();
    });
    
    expect(screen.getByTestId("open").textContent).toBe("true");

    await act(async () => {
      screen.getByTestId("confirm").click();
    });
    
    expect(onConfirm).toHaveBeenCalled();
    expect(screen.getByTestId("open").textContent).toBe("false");
  });

  it("handles state correctly for canceling", () => {
    const onConfirm = vi.fn();
    render(<TestComponent onConfirm={onConfirm} />);
    
    act(() => {
      screen.getByTestId("request").click();
    });
    
    expect(screen.getByTestId("open").textContent).toBe("true");

    act(() => {
      screen.getByTestId("cancel").click();
    });
    
    expect(screen.getByTestId("open").textContent).toBe("false");
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
