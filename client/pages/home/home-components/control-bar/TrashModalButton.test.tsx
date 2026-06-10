import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TrashModalButton } from "./TrashModalButton";

// Mock ControlBarButton since it's tested separately
vi.mock("./ControlBarButton", () => ({
  ControlBarButton: ({ onClick, label }: any) => (
    <button onClick={onClick}>{label}</button>
  ),
}));

describe("TrashModalButton", () => {
  it("calls setIsOpen(true) when clicked", () => {
    const setIsOpen = vi.fn();
    render(<TrashModalButton setIsOpen={setIsOpen} />);
    
    fireEvent.click(screen.getByRole("button"));
    expect(setIsOpen).toHaveBeenCalledWith(true);
  });
});
