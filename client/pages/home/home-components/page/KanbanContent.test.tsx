import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { KanbanContent } from "./KanbanContent";

vi.mock("@/pages/home/hooks/useDrag", () => ({
  useDrag: vi.fn(),
}));

import { useDrag } from "@/pages/home/hooks/useDrag";

// Helper: create a scrollable div with controllable scroll metrics
function makeScrollEl(overrides: Partial<HTMLDivElement> = {}) {
  return Object.assign(document.createElement("div"), {
    scrollWidth: 2000,
    clientWidth: 800,
    scrollLeft: 0,
    ...overrides,
  });
}

describe("KanbanContent", () => {
  beforeEach(() => {
    (useDrag as ReturnType<typeof vi.fn>).mockReturnValue({ isDragging: false });
    // Provide a no-op ResizeObserver so the effect doesn't throw
    (global as Record<string, unknown>).ResizeObserver = class {
      observe = vi.fn();
      disconnect = vi.fn();
    };
  });

  it("renders children", () => {
    render(
      <KanbanContent>
        <span data-testid="child">hello</span>
      </KanbanContent>
    );
    expect(screen.getByTestId("child")).toBeTruthy();
  });

  it("renders the outer frame div", () => {
    const { container } = render(<KanbanContent>x</KanbanContent>);
    expect(container.querySelector(".kanban-content-frame")).toBeTruthy();
  });

  it("uses overflow-x-auto class when not dragging", () => {
    const { container } = render(<KanbanContent>x</KanbanContent>);
    const scroll = container.querySelector(".kanban-content-scroll");
    expect(scroll?.className).toContain("overflow-x-auto");
  });

  it("uses overflow-visible class when dragging", () => {
    (useDrag as ReturnType<typeof vi.fn>).mockReturnValue({ isDragging: true });
    const { container } = render(<KanbanContent>x</KanbanContent>);
    const scroll = container.querySelector(".kanban-content-scroll");
    expect(scroll?.className).toContain("overflow-visible");
  });

  it("does not apply shadow classes when dragging even if scroll position suggests shadows", () => {
    (useDrag as ReturnType<typeof vi.fn>).mockReturnValue({ isDragging: true });
    const { container } = render(<KanbanContent>x</KanbanContent>);
    const frame = container.querySelector(".kanban-content-frame");
    expect(frame?.className).not.toContain("kanban-content-shadow-left");
    expect(frame?.className).not.toContain("kanban-content-shadow-right");
  });

  it("fires updateScrollShadow on scroll event", () => {
    const { container } = render(<KanbanContent>x</KanbanContent>);
    const scrollEl = container.querySelector(".kanban-content-scroll")!;
    // Should not throw when scroll fires
    expect(() => fireEvent.scroll(scrollEl)).not.toThrow();
  });

  it("updateScrollShadow is a no-op when scrollRef is null (effect guard)", () => {
    // Render and immediately unmount — effect cleanup should not throw
    const { unmount } = render(<KanbanContent>x</KanbanContent>);
    expect(() => unmount()).not.toThrow();
  });

  it("adds right shadow class when content overflows and scrollLeft is near start", async () => {
    const { container } = render(<KanbanContent>x</KanbanContent>);
    const scrollEl = container.querySelector<HTMLElement>(".kanban-content-scroll")!;

    // Simulate a wide content area
    Object.defineProperty(scrollEl, "scrollWidth", { value: 2000, configurable: true });
    Object.defineProperty(scrollEl, "clientWidth", { value: 800, configurable: true });
    Object.defineProperty(scrollEl, "scrollLeft", { value: 0, configurable: true });

    await act(async () => {
      fireEvent.scroll(scrollEl);
    });

    const frame = container.querySelector(".kanban-content-frame");
    // right shadow: hasOverflow && scrollLeft < maxScrollLeft - threshold
    // maxScrollLeft=1200, scrollLeft=0 < 1192 → right shadow should be on (not dragging)
    expect(frame?.className).toContain("kanban-content-shadow-right");
  });

  it("adds left shadow class when scrolled past threshold", async () => {
    const { container } = render(<KanbanContent>x</KanbanContent>);
    const scrollEl = container.querySelector<HTMLElement>(".kanban-content-scroll")!;

    Object.defineProperty(scrollEl, "scrollWidth", { value: 2000, configurable: true });
    Object.defineProperty(scrollEl, "clientWidth", { value: 800, configurable: true });
    Object.defineProperty(scrollEl, "scrollLeft", { value: 1100, configurable: true });

    await act(async () => {
      fireEvent.scroll(scrollEl);
    });

    const frame = container.querySelector(".kanban-content-frame");
    // scrollLeft=1100 > threshold=8 → left shadow on
    expect(frame?.className).toContain("kanban-content-shadow-left");
  });

  it("applies no shadow when no overflow (content fits)", async () => {
    const { container } = render(<KanbanContent>x</KanbanContent>);
    const scrollEl = container.querySelector<HTMLElement>(".kanban-content-scroll")!;

    // No overflow: scrollWidth == clientWidth
    Object.defineProperty(scrollEl, "scrollWidth", { value: 800, configurable: true });
    Object.defineProperty(scrollEl, "clientWidth", { value: 800, configurable: true });
    Object.defineProperty(scrollEl, "scrollLeft", { value: 0, configurable: true });

    await act(async () => {
      fireEvent.scroll(scrollEl);
    });

    const frame = container.querySelector(".kanban-content-frame");
    expect(frame?.className).not.toContain("kanban-content-shadow-left");
    expect(frame?.className).not.toContain("kanban-content-shadow-right");
  });

  it("disconnects ResizeObserver on unmount", () => {
    const disconnect = vi.fn();
    (global as Record<string, unknown>).ResizeObserver = class {
      observe = vi.fn();
      disconnect = disconnect;
    };

    const { unmount } = render(<KanbanContent>x</KanbanContent>);
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it("skips ResizeObserver when undefined", () => {
    const savedRO = (global as Record<string, unknown>).ResizeObserver;
    (global as Record<string, unknown>).ResizeObserver = undefined;

    expect(() => render(<KanbanContent>x</KanbanContent>)).not.toThrow();

    (global as Record<string, unknown>).ResizeObserver = savedRO;
  });
});
