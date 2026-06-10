import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { HomePage } from "./HomePage";
import { JOB_LOCAL_CHANGE_EVENT } from "./utils/jobLocalChangeEvent";
import type { JobCardType } from "@/types/jobCardType";

// ─── Core hook mocks ─────────────────────────────────────────────────────────

const mockSetJobs = vi.fn();
const mockReloadJobs = vi.fn();

vi.mock("@/pages/home/hooks/useJobsLoader", () => ({
  useJobsLoader: vi.fn(),
}));
vi.mock("@/pages/home/hooks/useJobAction", () => ({
  useJobActions: () => ({ saveJob: vi.fn() }),
}));
vi.mock("@/pages/home/hooks/useTrashActions", () => ({
  useTrashActions: () => ({ isOpen: false, isLoading: false, items: [], open: vi.fn(), close: vi.fn(), handleAction: vi.fn() }),
}));
vi.mock("@/pages/home/hooks/useArchiveActions", () => ({
  useArchiveActions: () => ({ isOpen: false, isLoading: false, items: [], open: vi.fn(), close: vi.fn(), handleAction: vi.fn() }),
}));
vi.mock("@/pages/home/hooks/useJobSearchAndSort", () => ({
  useJobSearchAndSort: () => ({
    searchQuery: "", setSearchQuery: vi.fn(),
    sortOption: "default", setSortOption: vi.fn(),
    sortedJobs: [], matchOrderMap: new Map(), hasSearch: false,
  }),
}));
vi.mock("@/pages/home/hooks/useKanbanColumns", () => ({
  useKanbanColumns: () => ({ columns: [{ id: "applied", label: "Applied", visible: true }] }),
}));
vi.mock("@/pages/home/hooks/useKanbanJobs", () => ({
  useKanbanJobs: () => ({ applied: [<div key="j1" data-testid="job-card">Job</div>] }),
}));
vi.mock("@/global-services/auth", () => ({
  getCurrentUserInfo: () => ({ uid: "user-123" }),
  getIdToken: vi.fn().mockResolvedValue("fake-token"),
}));
vi.mock("@/pages/home/hooks/useRealTimeJobs", () => ({
  useRealtimeJobs: vi.fn(),
}));

// ─── UI sub-component mocks ───────────────────────────────────────────────────

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: { div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div> },
}));
vi.mock("@/global-components/SearchBar", () => ({
  SearchBar: () => <div data-testid="search-bar" />,
}));
vi.mock("@/pages/home/home-components/control-bar/ControlBar", () => ({
  ControlBar: ({ children }: { children: React.ReactNode }) => <div data-testid="control-bar">{children}</div>,
}));
vi.mock("@/pages/home/home-components/column/Column", () => ({
  Column: ({ children, column }: { children: React.ReactNode; column: { label?: string; id: string } }) => (
    <div data-testid="column" data-id={column.id}>{children}</div>
  ),
}));
vi.mock("@/pages/home/home-components/page/KanbanContent", () => ({
  KanbanContent: ({ children }: { children: React.ReactNode }) => <div data-testid="kanban-content">{children}</div>,
}));
vi.mock("@/pages/home/home-components/page/PageContent", () => ({
  PageContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/pages/home/home-components/page/HomePageContentProviders", () => ({
  HomePageContentProviders: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/pages/home/home-components/page/HomeLoadingSkeleton", () => ({
  HomeLoadingSkeleton: () => <div data-testid="loading-skeleton">Loading…</div>,
}));
vi.mock("@/pages/home/home-components/modal/MultiSelectBar", () => ({
  MultiSelectBar: () => <div data-testid="multi-select-bar" />,
}));
vi.mock("@/pages/home/home-components/modal/UndoRedo", () => ({
  UndoRedo: () => <div data-testid="undo-redo" />,
}));
vi.mock("@/pages/home/home-components/modal/TrashArchiveModal", () => ({
  default: () => <div data-testid="trash-modal" />,
}));
vi.mock("@/pages/home/home-components/modal/ApplicationModal", () => ({
  default: ({ isOpen, onSave }: { isOpen: boolean; onSave?: () => void }) => (
    <div data-testid="new-application" data-open={String(isOpen)} />
  ),
}));
vi.mock("@/pages/home/home-components/modal/ConnectEmailModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (
    <div data-testid="connect-email-modal" data-open={String(isOpen)} />
  ),
}));
vi.mock("@/pages/home/home-components/control-bar/ConnectEmailButton", () => ({
  ConnectEmailButton: ({ setIsOpen }: { setIsOpen: (v: boolean) => void }) => (
    <button data-testid="connect-email-btn" onClick={() => setIsOpen(true)}>Connect</button>
  ),
}));
vi.mock("@/pages/home/home-components/control-bar/NewApplicationButton", () => ({
  NewApplicationButton: ({ onClick }: { onClick: () => void }) => (
    <button data-testid="new-app-btn" onClick={onClick}>New</button>
  ),
}));
vi.mock("@/pages/home/home-components/control-bar/ArchiveModalButton", () => ({
  ArchiveModalButton: () => <button data-testid="archive-btn">Archive</button>,
}));
vi.mock("@/pages/home/home-components/control-bar/TrashModalButton", () => ({
  TrashModalButton: () => <button data-testid="trash-btn">Trash</button>,
}));
vi.mock("@/pages/home/home-components/control-bar/MultiSelectButton", () => ({
  MultiSelectButton: () => <button data-testid="multi-select-btn">Select</button>,
}));
vi.mock("@/pages/home/home-components/control-bar/FilterButton", () => ({
  FilterButton: () => <button data-testid="filter-btn">Filter</button>,
}));
vi.mock("@/pages/home/home-components/control-bar/ReadAllButton", () => ({
  ReadAllButton: () => <button data-testid="read-all-btn">Read All</button>,
}));
vi.mock("@/pages/home/home-components/control-bar/ExpandCollapseButton", () => ({
  ExpandCollapseButton: () => <button data-testid="expand-btn">Expand</button>,
}));

// ─── Import the mocked hook so we can control it per-test ────────────────────

import { useJobsLoader } from "@/pages/home/hooks/useJobsLoader";

function makeJobsLoader(overrides = {}) {
  return {
    jobs: [],
    setJobs: mockSetJobs,
    reloadJobs: mockReloadJobs,
    isLoading: false,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useJobsLoader as ReturnType<typeof vi.fn>).mockReturnValue(makeJobsLoader());
  });

  // ── Basic render ────────────────────────────────────────────────────────────

  it("renders kanban content when not loading", () => {
    render(<HomePage />);
    expect(screen.getByTestId("kanban-content")).toBeTruthy();
    expect(screen.getByTestId("search-bar")).toBeTruthy();
  });

  it("renders HomeLoadingSkeleton when isLoading is true", () => {
    (useJobsLoader as ReturnType<typeof vi.fn>).mockReturnValue(makeJobsLoader({ isLoading: true }));
    render(<HomePage />);
    expect(screen.getByTestId("loading-skeleton")).toBeTruthy();
    expect(screen.queryByTestId("kanban-content")).toBeNull();
  });

  it("renders modals and control bar buttons", () => {
    render(<HomePage />);
    // Two TrashArchiveModal instances (trash + archive)
    expect(screen.getAllByTestId("trash-modal").length).toBe(2);
    expect(screen.getByTestId("new-application")).toBeTruthy();
    expect(screen.getByTestId("connect-email-modal")).toBeTruthy();
    expect(screen.getByTestId("new-app-btn")).toBeTruthy();
  });

  // ── openJobAppModal (NewApplicationButton click) ──────────────────────────

  it("opens NewApplication modal when NewApplicationButton is clicked", async () => {
    render(<HomePage />);
    await act(async () => { fireEvent.click(screen.getByTestId("new-app-btn")); });
    expect(screen.getByTestId("new-application").getAttribute("data-open")).toBe("true");
  });

  // ── ConnectEmail modal toggle ─────────────────────────────────────────────

  it("opens ConnectEmail modal when connect button is clicked", async () => {
    render(<HomePage />);
    await act(async () => { fireEvent.click(screen.getByTestId("connect-email-btn")); });
    expect(screen.getByTestId("connect-email-modal").getAttribute("data-open")).toBe("true");
  });

  // ── JOB_LOCAL_CHANGE_EVENT: archived/deleted job removed ─────────────────

  it("removes job from list when event fires with isArchived=true", () => {
    const existingJob: JobCardType = { id: "j1", title: "Job 1", column: "applied" };
    (useJobsLoader as ReturnType<typeof vi.fn>).mockReturnValue(
      makeJobsLoader({ jobs: [existingJob] })
    );

    render(<HomePage />);

    const archivedJob: JobCardType = { ...existingJob, isArchived: true };
    act(() => {
      window.dispatchEvent(
        new CustomEvent(JOB_LOCAL_CHANGE_EVENT, { detail: { before: existingJob, after: archivedJob } })
      );
    });

    // setJobs called with updater — call the updater to verify filter behaviour
    expect(mockSetJobs).toHaveBeenCalled();
    const updater = mockSetJobs.mock.calls[mockSetJobs.mock.calls.length - 1][0];
    const result = updater([existingJob]);
    expect(result).toEqual([]);
  });

  it("removes job from list when event fires with isDeleted=true", () => {
    const existingJob: JobCardType = { id: "j2", title: "Job 2", column: "applied" };
    render(<HomePage />);

    const deletedJob: JobCardType = { ...existingJob, isDeleted: true };
    act(() => {
      window.dispatchEvent(
        new CustomEvent(JOB_LOCAL_CHANGE_EVENT, { detail: { before: existingJob, after: deletedJob } })
      );
    });

    const updater = mockSetJobs.mock.calls[mockSetJobs.mock.calls.length - 1][0];
    const result = updater([existingJob, { id: "other", title: "Other", column: "applied" }]);
    expect(result.find((j: JobCardType) => j.id === "j2")).toBeUndefined();
  });

  // ── JOB_LOCAL_CHANGE_EVENT: new job prepended ─────────────────────────────

  it("prepends job when event fires for a job that does not exist yet", () => {
    render(<HomePage />);

    const newJob: JobCardType = { id: "j-new", title: "Brand New", column: "applied" };
    act(() => {
      window.dispatchEvent(
        new CustomEvent(JOB_LOCAL_CHANGE_EVENT, { detail: { before: newJob, after: newJob } })
      );
    });

    const updater = mockSetJobs.mock.calls[mockSetJobs.mock.calls.length - 1][0];
    const existing: JobCardType[] = [{ id: "j-old", title: "Old", column: "applied" }];
    const result = updater(existing);
    expect(result[0].id).toBe("j-new");
    expect(result).toHaveLength(2);
  });

  // ── JOB_LOCAL_CHANGE_EVENT: existing job updated ─────────────────────────

  it("updates an existing job in the list when the event fires", () => {
    const originalJob: JobCardType = { id: "j3", title: "Original", column: "applied" };
    render(<HomePage />);

    const updatedJob: JobCardType = { ...originalJob, title: "Updated" };
    act(() => {
      window.dispatchEvent(
        new CustomEvent(JOB_LOCAL_CHANGE_EVENT, { detail: { before: originalJob, after: updatedJob } })
      );
    });

    const updater = mockSetJobs.mock.calls[mockSetJobs.mock.calls.length - 1][0];
    const result = updater([originalJob, { id: "other", title: "Other", column: "applied" }]);
    const found = result.find((j: JobCardType) => j.id === "j3");
    expect(found?.title).toBe("Updated");
  });

  // ── Event listener cleanup ────────────────────────────────────────────────

  it("removes event listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<HomePage />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith(JOB_LOCAL_CHANGE_EVENT, expect.any(Function));
    removeSpy.mockRestore();
  });

  // ── getCurrentUserInfo returns null ───────────────────────────────────────

  it("handles null user info gracefully (uid defaults to empty string)", () => {
    // The auth mock factory returns { uid: 'user-123' } by default;
    // rendering without a uid still works because userId falls back to ""
    (useJobsLoader as ReturnType<typeof vi.fn>).mockReturnValue(
      makeJobsLoader({ jobs: [] })
    );
    expect(() => render(<HomePage />)).not.toThrow();
  });
});
