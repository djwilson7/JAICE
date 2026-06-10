import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserBlock } from "./UserBlock";
import * as authContextModule from "@/global-components/authContext";
import * as useGritScoreModule from "@/utils/useGritScore";
import React from "react";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/global-components/authContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/utils/useGritScore", () => ({
  useGritScore: vi.fn(),
}));

describe("UserBlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (authContextModule.useAuth as any).mockReturnValue({
      user: { displayName: "John Doe", photoURL: "john.png" },
    });
    (useGritScoreModule.useGritScore as any).mockReturnValue({
      tier: "Gold", tierColor: "gold", loading: false
    });
  });

  it("renders correctly with user data", () => {
    render(<UserBlock />);
    expect(screen.getByText(/John/)).toBeInTheDocument();
    expect(screen.getByText(/Doe/)).toBeInTheDocument();
    expect(screen.getByText("Gold")).toBeInTheDocument();
    expect(screen.getByAltText("Profile")).toHaveAttribute("src", "john.png");
  });

  it("handles loading grit score", () => {
    (useGritScoreModule.useGritScore as any).mockReturnValue({
      tier: null, tierColor: "gray", loading: true
    });
    render(<UserBlock />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("handles missing user display name", () => {
    (authContextModule.useAuth as any).mockReturnValue({
      user: { displayName: null, photoURL: null },
    });
    render(<UserBlock />);
    const img = screen.getByAltText("Profile");
    expect(img).toHaveAttribute("src");
    expect(img.getAttribute("src")).toContain("data:image/svg+xml");
  });

  it("navigates to settings on click", () => {
    render(<UserBlock />);
    fireEvent.click(screen.getByAltText("Profile").parentElement!);
    expect(mockNavigate).toHaveBeenCalledWith("/settings");
    
    fireEvent.click(screen.getByText(/John/));
    expect(mockNavigate).toHaveBeenCalledWith("/settings");
  });

  it("navigates to dashboard on tier click", () => {
      render(<UserBlock />);
      fireEvent.click(screen.getByText("Gold"));
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  it("handles image error by falling back to default icon", () => {
      render(<UserBlock />);
      const img = screen.getByAltText("Profile");
      fireEvent.error(img);
      expect(img.getAttribute("src")).toContain("data:image/svg+xml");
  });
});
