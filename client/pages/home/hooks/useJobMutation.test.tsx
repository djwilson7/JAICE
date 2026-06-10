import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useJobMutation } from "./useJobMutation";
import { writeJobsToDB } from "@/global-services/writeJobsToDB";
import { useUndoRedo } from "@/pages/home/hooks/useUndoRedo";
import { useBannerNotifications } from "@/global-components/bannerNotificationContext";

vi.mock("@/global-services/writeJobsToDB", () => ({
  writeJobsToDB: vi.fn(),
}));

vi.mock("@/pages/home/hooks/useUndoRedo", () => ({
  useUndoRedo: vi.fn(),
}));

vi.mock("@/global-components/bannerNotificationContext", () => ({
  useBannerNotifications: vi.fn(),
}));

const TestComponent = ({ job, intent, onError }: any) => {
  const { mutateJob } = useJobMutation();
  
  return (
    <button data-testid="mutate" onClick={async () => {
      try {
        await mutateJob(job, intent);
      } catch (e) {
        if (onError) onError(e);
      }
    }}>Mutate</button>
  );
};

describe("useJobMutation", () => {
  const pushUndo = vi.fn();
  const showBanner = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useUndoRedo as any).mockReturnValue({ pushUndo });
    (useBannerNotifications as any).mockReturnValue({ showBanner });
  });

  it("skips mutation if move to same column", async () => {
    render(<TestComponent job={{ column: "applied" }} intent={{ type: "move", targetColumn: "applied" }} />);
    await act(async () => {
      screen.getByTestId("mutate").click();
    });
    expect(writeJobsToDB).not.toHaveBeenCalled();
  });

  it("handles successful move", async () => {
    (writeJobsToDB as any).mockResolvedValue(undefined);
    render(<TestComponent job={{ id: "1", title: "Job", column: "applied" }} intent={{ type: "move", targetColumn: "interview" }} />);
    
    await act(async () => {
      screen.getByTestId("mutate").click();
    });
    
    expect(writeJobsToDB).toHaveBeenCalled();
    expect(pushUndo).toHaveBeenCalled();
    expect(showBanner).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" }));
  });

  it("handles successful archive", async () => {
    (writeJobsToDB as any).mockResolvedValue(undefined);
    render(<TestComponent job={{ id: "1", title: "Job", isArchived: false }} intent={{ type: "archive" }} />);
    
    await act(async () => {
      screen.getByTestId("mutate").click();
    });
    
    expect(writeJobsToDB).toHaveBeenCalled();
    expect(showBanner).toHaveBeenCalledWith(expect.objectContaining({ tone: "success", message: "Job archived successfully." }));
  });

  it("handles DB write failure", async () => {
    (writeJobsToDB as any).mockRejectedValue(new Error("DB Error"));
    const onError = vi.fn();
    render(<TestComponent job={{ id: "1", title: "Job", column: "applied" }} intent={{ type: "move", targetColumn: "interview" }} onError={onError} />);
    
    await act(async () => {
      screen.getByTestId("mutate").click();
    });
    
    expect(onError).toHaveBeenCalled();
    expect(showBanner).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" }));
    expect(pushUndo).not.toHaveBeenCalled(); // Failed mutation doesn't push undo
  });

  it("handles successful delete", async () => {
    (writeJobsToDB as any).mockResolvedValue(undefined);
    render(<TestComponent job={{ id: "1", title: "Job", isDeleted: false }} intent={{ type: "delete" }} />);
    
    await act(async () => {
      screen.getByTestId("mutate").click();
    });
    
    expect(writeJobsToDB).toHaveBeenCalled();
    expect(showBanner).toHaveBeenCalledWith(expect.objectContaining({ tone: "success", message: "Job deleted successfully." }));
  });

  it("handles archive failure message", async () => {
    (writeJobsToDB as any).mockRejectedValue(new Error("Fail"));
    render(<TestComponent job={{ id: "1", title: "Job" }} intent={{ type: "archive" }} />);
    
    await act(async () => {
      try { screen.getByTestId("mutate").click(); } catch {}
    });
    
    expect(showBanner).toHaveBeenCalledWith(expect.objectContaining({ tone: "error", message: "Failed to archive job. Try again." }));
  });

  it("handles delete failure message", async () => {
    (writeJobsToDB as any).mockRejectedValue(new Error("Fail"));
    render(<TestComponent job={{ id: "1", title: "Job" }} intent={{ type: "delete" }} />);
    
    await act(async () => {
      try { screen.getByTestId("mutate").click(); } catch {}
    });
    
    expect(showBanner).toHaveBeenCalledWith(expect.objectContaining({ tone: "error", message: "Failed to delete job. Try again." }));
  });

  it("handles unknown intent failure message", async () => {
    (writeJobsToDB as any).mockRejectedValue(new Error("Fail"));
    // 'review' intent is not explicitly handled in getJobMutationFailureMessage, so it falls to default
    render(<TestComponent job={{ id: "1", title: "Job", reviewNeeded: true }} intent={{ type: "review" }} />);
    
    await act(async () => {
      try { screen.getByTestId("mutate").click(); } catch {}
    });
    
    expect(showBanner).toHaveBeenCalledWith(expect.objectContaining({ tone: "error", message: "Failed to update job. Try again." }));
  });
});
