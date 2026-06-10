import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Modal } from "./Modal";
import React from "react";

describe("Modal", () => {
  beforeEach(() => {
    document.body.style.overflow = "";
    vi.clearAllMocks();
  });

  it("renders with open prop", () => {
    render(
      <Modal open={true} onClose={vi.fn()}>
        <div>Content</div>
      </Modal>
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose}>
        <div>Content</div>
      </Modal>
    );
    
    const backdrop = screen.getByRole("dialog");
    fireEvent.mouseDown(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose}>
        <div>Content</div>
      </Modal>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("does not call onClose when modal container is clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose}>
        <div data-testid="content">Content</div>
      </Modal>
    );
    
    const content = screen.getByTestId("content");
    fireEvent.mouseDown(content);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not call onClose on backdrop click if closeOnBackdrop is false", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} closeOnBackdrop={false}>
        <div>Content</div>
      </Modal>
    );
    
    const backdrop = screen.getByRole("dialog");
    fireEvent.mouseDown(backdrop);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("sets body overflow to hidden and restores it", () => {
    document.body.style.overflow = "scroll";
    const { unmount } = render(
      <Modal isOpen={true} onClose={vi.fn()}>
        <div>Content</div>
      </Modal>
    );
    expect(document.body.style.overflow).toBe("hidden");
    
    unmount();
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("renders primary and secondary actions", () => {
    const onPrimary = vi.fn();
    const onSecondary = vi.fn();
    render(
      <Modal 
        isOpen={true} 
        onClose={vi.fn()}
        primaryAction={{ label: "Save", onClick: onPrimary, type: "submit", form: "my-form" }}
        secondaryAction={{ label: "Cancel", onClick: onSecondary }}
      >
        <div>Content</div>
      </Modal>
    );

    const saveBtn = screen.getByText("Save");
    const cancelBtn = screen.getByText("Cancel");

    expect(saveBtn).toHaveAttribute("type", "submit");
    expect(saveBtn).toHaveAttribute("form", "my-form");

    fireEvent.click(saveBtn);
    expect(onPrimary).toHaveBeenCalled();

    fireEvent.click(cancelBtn);
    expect(onSecondary).toHaveBeenCalled();
  });

  it("renders footer instead of default actions if provided", () => {
    render(
      <Modal 
        isOpen={true} 
        onClose={vi.fn()}
        footer={<div data-testid="custom-footer">Custom Footer</div>}
        primaryAction={{ label: "Save" }}
      >
        <div>Content</div>
      </Modal>
    );
    expect(screen.getByTestId("custom-footer")).toBeInTheDocument();
    expect(screen.queryByText("Save")).not.toBeInTheDocument();
  });

  it("hides header if showHeader is false", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="My Title" showHeader={false}>
            <div>Content</div>
        </Modal>
      );
      expect(screen.queryByText("My Title")).not.toBeInTheDocument();
  });

  it("handles ariaLabel and resolvedTitle", () => {
      render(<Modal isOpen={true} onClose={vi.fn()} ariaLabel="Custom Label"><div>C</div></Modal>);
      expect(screen.getByLabelText("Custom Label")).toBeInTheDocument();

      render(<Modal isOpen={true} onClose={vi.fn()} modalTitle="Modal Title"><div>C</div></Modal>);
      expect(screen.getByLabelText("Modal Title")).toBeInTheDocument();
  });

  it("handles disabled actions and no-click branch", () => {
      render(
        <Modal 
          isOpen={true} 
          onClose={vi.fn()}
          primaryAction={{ label: "Save", disabled: true }}
          secondaryAction={{ label: "NoClick" }}
        >
          <div>Content</div>
        </Modal>
      );
      expect(screen.getByText("Save")).toBeDisabled();
      fireEvent.click(screen.getByText("NoClick")); // should not throw
  });
});
