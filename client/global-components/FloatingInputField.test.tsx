import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { FloatingInputField } from "./FloatingInputField";
import React from "react";

describe("FloatingInputField", () => {
  const defaultProps = {
    label: "Email",
    type: "email",
    value: "",
    isValid: true,
    action: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly and handles input", () => {
    render(<FloatingInputField {...defaultProps} />);
    const input = screen.getByLabelText("Email");
    fireEvent.change(input, { target: { value: "test@test.com" } });
    expect(defaultProps.action).toHaveBeenCalledWith("test@test.com");
  });

  it("shows error tooltip on focus when invalid", () => {
    render(
      <FloatingInputField
        {...defaultProps}
        isValid={false}
        errorTitle="Error"
        errorMessage="Invalid email"
      />
    );

    const input = screen.getByLabelText("Email");
    
    // Stub getBoundingClientRect
    vi.spyOn(input, "getBoundingClientRect").mockReturnValue({
      left: 100,
      top: 200,
      right: 300,
      bottom: 250,
      width: 200,
      height: 50,
    } as any);

    fireEvent.focus(input);
    
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText("Invalid email")).toBeInTheDocument();

    fireEvent.blur(input);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("handles small screen tooltip positioning", () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });

    render(
      <FloatingInputField
        {...defaultProps}
        isValid={false}
        errorTitle="Error"
        errorMessage="Invalid"
      />
    );

    const input = screen.getByLabelText("Email");
    fireEvent.focus(input);
    
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.style.transform).toBe("translateX(-50%)");

    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: originalWidth });
  });

  it("applies correct classes for null isValid", () => {
      render(<FloatingInputField {...defaultProps} isValid={null} />);
      const input = screen.getByLabelText("Email");
      expect(input).toHaveClass("border-[var(--primary-four)]");
  });

  it("applies error classes when invalid", () => {
    render(<FloatingInputField {...defaultProps} isValid={false} />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveClass("border-red-500");
  });

  it("uses correct autocomplete for password", () => {
      render(<FloatingInputField {...defaultProps} type="password" />);
      const input = screen.getByLabelText("Email"); // label still says email in defaultProps
      expect(input).toHaveAttribute("autoComplete", "current-password");
  });
});
