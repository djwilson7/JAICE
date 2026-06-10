import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ConfirmModal from "./ConfirmModal";

vi.mock("@/global-components/Modal", () => ({
  Modal: ({ children, isOpen, modalTitle, onClose, primaryAction }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="mock-modal">
        <h1>{modalTitle}</h1>
        <button onClick={onClose}>Close</button>
        <button onClick={primaryAction.onClick}>{primaryAction.label}</button>
        {children}
      </div>
    );
  },
}));

describe("ConfirmModal", () => {
  it("renders when open", () => {
    render(
      <ConfirmModal
        isOpen={true}
        title="Confirm This"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByTestId("mock-modal")).toBeInTheDocument();
    expect(screen.getByText("Confirm This")).toBeInTheDocument();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    const { container } = render(
      <ConfirmModal
        isOpen={false}
        title="Confirm This"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
