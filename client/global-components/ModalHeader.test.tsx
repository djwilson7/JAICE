import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ModalHeader } from "./ModalHeader";

describe("ModalHeader", () => {
  it("renders correctly", () => {
    const onClose = vi.fn();
    render(<ModalHeader title="Header Title" onClose={onClose} />);
    
    expect(screen.getByText("Header Title")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
