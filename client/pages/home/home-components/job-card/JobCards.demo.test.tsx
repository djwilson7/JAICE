import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JobCard } from "./JobCards";
import { openGmailMessage } from "@/pages/home/hooks/useOpenGmailMessage";

vi.mock("@/global-services/projectMode", () => ({
  IS_DEMO_MODE: true,
}));
vi.mock("@/pages/home/hooks/useIsMultiSelecting", () => ({
  useIsMultiSelecting: () => ({ isMultiSelecting: false }),
}));
vi.mock("@/pages/home/hooks/useJobMutation", () => ({
  useJobMutation: () => ({ mutateJob: vi.fn() }),
}));
vi.mock("@/pages/home/hooks/useJobCard", () => ({
  useJobCard: () => ({ expandAll: false }),
}));
vi.mock("@/pages/home/hooks/useDeleteConfirm", () => ({
  useDeleteConfirm: () => ({
    open: false,
    processing: false,
    requestDelete: vi.fn(),
    confirm: vi.fn(),
    cancel: vi.fn(),
  }),
}));
vi.mock("@/pages/home/hooks/useOpenGmailMessage", () => ({
  openGmailMessage: vi.fn(),
}));
vi.mock("@/pages/home/hooks/useDrag", () => ({
  useDrag: () => ({ isDragging: false }),
}));
vi.mock("@/pages/home/hooks/useJobCardDrag", () => ({
  useJobCardDrag: () => ({ onPointerDown: vi.fn() }),
}));
vi.mock("@/pages/home/hooks/useSelectedJobs", () => ({
  useSelectedJobs: () => ({ selectedJobs: [] }),
}));

describe("JobCard email links in demo mode", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["applied", "interview", "offer", "accepted"])(
    "explains the %s card email action without opening Gmail",
    (column) => {
      render(
        <JobCard
          job={{
            id: `demo-${column}`,
            title: `${column} role`,
            column,
            applicationStage: column,
            providerSource: "gmail",
            reviewNeeded: false,
          }}
          dimmed={false}
          openJobAppModal={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTitle("Open Email"));

      expect(
        screen.getByRole("dialog", { name: "Email links in the demo" })
      ).toHaveTextContent(
        "This button would typically take you to your inbox and open the email represented by this job card"
      );
      expect(openGmailMessage).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "Got it" }));
      expect(
        screen.queryByRole("dialog", { name: "Email links in the demo" })
      ).not.toBeInTheDocument();
    }
  );
});
