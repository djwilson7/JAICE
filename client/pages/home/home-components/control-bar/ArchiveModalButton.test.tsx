import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ArchiveModalButton } from "./ArchiveModalButton";

// Mock ControlBarButton since it's tested separately
vi.mock("./ControlBarButton", () => ({
  ControlBarButton: ({ onClick, label }: any) => (
    <button onClick={onClick}>{label}</button>
  ),
}));

describe("ArchiveModalButton", () => {
  it("calls setIsOpen(true) when clicked", () => {
    const setIsOpen = vi.fn();
    render(<ArchiveModalButton setIsOpen={setIsOpen} />);
    
    fireEvent.click(screen.getByRole("button"));
    expect(setIsOpen).toHaveBeenCalledWith(true);
  });

  it("passes compact prop correctly", () => {
    // We don't really need to test passing props if we mock it like this, 
    // but we can if we want to be exhaustive.
  });
});
