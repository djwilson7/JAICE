import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, render, screen } from "@testing-library/react";
import { useArchiveActions } from "./useArchiveActions";
import { api } from "@/global-services/api";
import { useBannerNotifications } from "@/global-components/bannerNotificationContext";
import { JOB_REALTIME_CHANGE_EVENT } from "@/pages/home/hooks/useRealTimeJobs";

vi.mock("@/global-services/api", () => ({
  api: vi.fn(),
}));

vi.mock("@/global-components/bannerNotificationContext", () => ({
  useBannerNotifications: vi.fn(),
}));

const TestComponent = ({ onRestore }: any) => {
  const { open, close, handleAction, items, isOpen, isLoading } = useArchiveActions({ onRestore });
  
  return (
    <div>
      <span data-testid="isOpen">{isOpen.toString()}</span>
      <span data-testid="isLoading">{isLoading.toString()}</span>
      <span data-testid="itemsCount">{items.length}</span>
      <button data-testid="open" onClick={open}>Open</button>
      <button data-testid="close" onClick={close}>Close</button>
      <button data-testid="unarchive" onClick={() => handleAction("unarchive", ["1"])}>Unarchive</button>
      <button data-testid="delete" onClick={() => handleAction("delete", ["1"])}>Delete</button>
    </div>
  );
};

describe("useArchiveActions", () => {
  const showBanner = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useBannerNotifications as any).mockReturnValue({ showBanner });
  });

  it("handles open and close successfully", async () => {
    (api as any).mockResolvedValue({ status: "success", jobs: [{ provider_message_id: "1", id: "1", title: "Test Job" }] });
    
    render(<TestComponent />);
    
    expect(screen.getByTestId("isOpen").textContent).toBe("false");
    
    await act(async () => {
      screen.getByTestId("open").click();
    });
    
    expect(screen.getByTestId("isOpen").textContent).toBe("true");
    expect(screen.getByTestId("itemsCount").textContent).toBe("1");

    act(() => {
      screen.getByTestId("close").click();
    });

    expect(screen.getByTestId("isOpen").textContent).toBe("false");
  });

  it("handles unarchive action", async () => {
    (api as any).mockResolvedValue({ status: "success", jobs: [{ provider_message_id: "1", id: "1", title: "Test Job" }] });
    const onRestore = vi.fn();
    render(<TestComponent onRestore={onRestore} />);

    await act(async () => {
      screen.getByTestId("open").click();
    });
    
    (api as any).mockResolvedValue({ status: "success" });

    await act(async () => {
      screen.getByTestId("unarchive").click();
    });

    expect(api).toHaveBeenCalledWith("/api/jobs/set-archive", expect.any(Object));
    expect(onRestore).toHaveBeenCalled();
    expect(showBanner).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" }));
    expect(screen.getByTestId("itemsCount").textContent).toBe("0");
  });

  it("handles delete action", async () => {
    (api as any).mockResolvedValue({ status: "success", jobs: [{ provider_message_id: "1", id: "1", title: "Test Job" }] });
    render(<TestComponent />);

    await act(async () => {
      screen.getByTestId("open").click();
    });
    
    (api as any).mockResolvedValue({ status: "success" });

    await act(async () => {
      screen.getByTestId("delete").click();
    });

    expect(api).toHaveBeenCalledWith("/api/jobs/set-archive", expect.any(Object));
    expect(api).toHaveBeenCalledWith("/api/jobs/set-delete", expect.any(Object));
    expect(showBanner).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" }));
    expect(screen.getByTestId("itemsCount").textContent).toBe("0");
  });

  it("handles realtime UPDATE events correctly", async () => {
    (api as any).mockResolvedValue({ status: "success", jobs: [{ provider_message_id: "1", id: "1", title: "Test Job" }] });
    render(<TestComponent />);

    await act(async () => {
      screen.getByTestId("open").click();
    });
    
    expect(screen.getByTestId("itemsCount").textContent).toBe("1");

    act(() => {
      const event = new CustomEvent(JOB_REALTIME_CHANGE_EVENT, {
        detail: { event: "UPDATE", payload: { new: { provider_message_id: "1", is_archived: false } } }
      });
      window.dispatchEvent(event);
    });

    expect(screen.getByTestId("itemsCount").textContent).toBe("0");
  });

  it("handles failure in open gracefully", async () => {
    (api as any).mockResolvedValue({ status: "error" });
    render(<TestComponent />);

    await act(async () => {
      screen.getByTestId("open").click();
    });
    
    expect(showBanner).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" }));
    expect(screen.getByTestId("itemsCount").textContent).toBe("0");
  });

  it("handles exception in open gracefully", async () => {
    (api as any).mockRejectedValue(new Error("Network error"));
    render(<TestComponent />);

    await act(async () => {
      screen.getByTestId("open").click();
    });
    
    expect(showBanner).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" }));
  });

  it("handles exception in handleAction gracefully", async () => {
    (api as any).mockResolvedValueOnce({ status: "success", jobs: [{ id: "1", title: "Test" }] }) // initial open
               .mockRejectedValueOnce(new Error("Action failed")) // unarchive failure
               .mockResolvedValueOnce({ status: "success", jobs: [] }); // recovery open
    
    render(<TestComponent />);

    await act(async () => {
      screen.getByTestId("open").click();
    });

    await act(async () => {
      screen.getByTestId("unarchive").click();
    });

    // unarchive fails, catches error, and calls open() for recovery
    expect(api).toHaveBeenCalledTimes(3); 
  });

  it("does nothing if handleAction is called without ids", async () => {
    const { result } = renderHook(() => useArchiveActions({}));
    
    await act(async () => {
      await result.current.handleAction("unarchive", []);
    });

    expect(api).not.toHaveBeenCalled();
  });
});
