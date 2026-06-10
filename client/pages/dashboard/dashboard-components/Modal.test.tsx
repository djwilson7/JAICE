import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Modal } from "./Modal";

vi.mock("@/global-components/Modal", () => ({
  Modal: ({ isOpen, children, onClose }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="base-modal">
        <button data-testid="close-btn" onClick={onClose}>Close</button>
        {children}
      </div>
    );
  }
}));

describe("Dashboard Modal", () => {
  it("does not render when open is false", () => {
    const { container } = render(<Modal open={false} onClose={vi.fn()}>Content</Modal>);
    expect(container.firstChild).toBeNull();
  });

  it("renders children when open is true", () => {
    render(
      <Modal open={true} onClose={vi.fn()}>
        <div data-testid="modal-content">Inner Content</div>
      </Modal>
    );
    expect(screen.getByTestId("modal-content")).toBeDefined();
  });

  it("toggles description expanded state", () => {
    const description = {
      summary: "Summary text",
      calculation: "Calc text",
      interpretation: "Interp text",
      notes: "Notes text"
    };

    render(
      <Modal open={true} onClose={vi.fn()} description={description}>
        Content
      </Modal>
    );

    // Should not show details initially
    expect(screen.queryByText("Summary text")).toBeNull();

    // Click toggle
    const toggleBtn = screen.getByRole("button", { name: /About this chart/i });
    fireEvent.click(toggleBtn);

    // Details should be visible
    expect(screen.getByText("Summary text")).toBeDefined();
    expect(screen.getByText("Calc text")).toBeDefined();
    expect(screen.getByText("Interp text")).toBeDefined();
    expect(screen.getByText("Notes text")).toBeDefined();
    expect(screen.getByText("▼")).toBeDefined();

    // Click toggle again
    fireEvent.click(toggleBtn);
    expect(screen.queryByText("Summary text")).toBeNull();
  });

  it("resets description state when open changes", () => {
    const { rerender } = render(
      <Modal open={true} onClose={vi.fn()} description={{ summary: "Sum" }}>
        Content
      </Modal>
    );

    fireEvent.click(screen.getByRole("button", { name: /About this chart/i }));
    expect(screen.getByText("Sum")).toBeDefined();

    // Re-render with open false
    rerender(
      <Modal open={false} onClose={vi.fn()} description={{ summary: "Sum" }}>
        Content
      </Modal>
    );

    // Re-render with open true
    rerender(
      <Modal open={true} onClose={vi.fn()} description={{ summary: "Sum" }}>
        Content
      </Modal>
    );

    // Should be collapsed
    expect(screen.queryByText("Sum")).toBeNull();
  });
});
