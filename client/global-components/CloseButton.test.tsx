import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CloseButton } from "./CloseButton";

describe("CloseButton", () => {
  it("renders correctly and handles click", () => {
    const handleClick = vi.fn();
    render(<CloseButton onClick={handleClick} />);
    
    const button = screen.getByRole("button", { name: /close modal/i });
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
