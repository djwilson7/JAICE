import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HomeLoadingSkeleton } from "./HomeLoadingSkeleton";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...rest}>{children}</div>
    ),
  },
}));

// Mock heavy sub-components so we only test HomeLoadingSkeleton logic
vi.mock("@/pages/home/home-components/column/KanBanColumn", () => ({
  kanBanColumns: [
    { id: "applied",   title: "Applied",   bg: "#aaa", visible: true },
    { id: "interview", title: "Interview", bg: "#bbb", visible: true },
    { id: "offer",     title: "Offer",     bg: "#ccc", visible: true },
    { id: "accepted",  title: "Accepted",  bg: "#ddd", visible: true },
    { id: "rejected",  title: "Rejected",  bg: "#eee", visible: true },
    // visible=false column — should be filtered out
    { id: "staging",   title: "Processing", bg: "#fff", visible: false },
    // id not in HOME_LOADING_COLUMN_IDS — should also be filtered out
    { id: "review",    title: "Review",    bg: "#111", visible: true },
  ],
}));

vi.mock("@/pages/home/home-components/control-bar/ControlBar", () => ({
  ControlBar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="control-bar">{children}</div>
  ),
}));

vi.mock("@/pages/home/home-components/page/PageContent", () => ({
  PageContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-content">{children}</div>
  ),
}));

describe("HomeLoadingSkeleton", () => {
  it("renders without crashing", () => {
    render(<HomeLoadingSkeleton />);
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("has correct aria-label", () => {
    render(<HomeLoadingSkeleton />);
    expect(screen.getByLabelText("Loading job applications")).toBeTruthy();
  });

  it("renders only columns in HOME_LOADING_COLUMN_IDS and with visible !== false", () => {
    render(<HomeLoadingSkeleton />);
    // The 5 allowed IDs: applied, interview, offer, accepted, rejected
    expect(screen.getByText("Applied")).toBeTruthy();
    expect(screen.getByText("Interview")).toBeTruthy();
    expect(screen.getByText("Offer")).toBeTruthy();
    expect(screen.getByText("Accepted")).toBeTruthy();
    expect(screen.getByText("Rejected")).toBeTruthy();
    // "Processing" has visible=false — must not appear
    expect(screen.queryByText("Processing")).toBeNull();
    // "Review" is visible but not in the allowed IDs — must not appear
    expect(screen.queryByText("Review")).toBeNull();
  });

  it("renders skeleton cards inside each column", () => {
    render(<HomeLoadingSkeleton />);
    // 5 columns × 3 skeleton cards = 15 .job-card elements
    const cards = document.querySelectorAll(".job-card");
    expect(cards.length).toBe(15);
  });

  it("renders the control bar skeleton", () => {
    render(<HomeLoadingSkeleton />);
    expect(screen.getByTestId("control-bar")).toBeTruthy();
  });
});
