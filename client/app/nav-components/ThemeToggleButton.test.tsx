import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggleButton } from "./ThemeToggleButton";
import React from "react";

vi.mock("@/utils/getThemeData", () => ({
  useThemeData: () => ({ icon: "theme.png", label: "Toggle Theme", title: "Toggle Theme" }),
}));

vi.mock("./NavButton", () => ({
  NavButton: ({ label, onClick }: any) => (
    <button onClick={onClick} data-testid="nav-button">
      {label}
    </button>
  ),
}));

describe("ThemeToggleButton", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-contrast");
  });

  it("toggles theme from light to dark", () => {
    document.documentElement.setAttribute("data-theme", "light");
    render(<ThemeToggleButton hoverMode="hover" showLabel={true} />);
    const btn = screen.getByTestId("nav-button");
    
    fireEvent.click(btn);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("toggles theme from dark to light", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    render(<ThemeToggleButton hoverMode="hover" showLabel={true} />);
    const btn = screen.getByTestId("nav-button");
    
    fireEvent.click(btn);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("handles bw contrast special case", () => {
    document.documentElement.setAttribute("data-contrast", "bw");
    render(<ThemeToggleButton hoverMode="hover" showLabel={true} />);
    const btn = screen.getByTestId("nav-button");
    
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    fireEvent.click(btn);
    
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.getAttribute("data-contrast")).toBe("default");
    expect(dispatchSpy).toHaveBeenCalled();
  });
});
