import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SlidingToggle } from "./SlidingToggle";

describe("SlidingToggle", () => {
  it("renders correctly and toggles", () => {
    const action = vi.fn();
    render(
      <SlidingToggle
        leftLabel="Left"
        rightLabel="Right"
        action={action}
      />
    );
    
    expect(screen.getByText("Left")).toBeInTheDocument();
    expect(screen.getByText("Right")).toBeInTheDocument();
    
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(action).toHaveBeenCalledWith(false);
  });
});
