import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserBlock } from "./UserBlock";

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/global-services/projectMode", () => ({
  IS_DEMO_MODE: true,
}));

vi.mock("@/global-components/authContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/utils/useGritScore", () => ({
  useGritScore: () => ({
    tier: "Newcomer",
    tierColor: "gray",
    loading: false,
  }),
}));

describe("UserBlock in demo mode", () => {
  it("shows the tier without allowing profile or dashboard navigation", () => {
    const { container } = render(<UserBlock />);
    const userBlock = container.firstElementChild;

    expect(screen.getByText("Newcomer", { selector: "div" })).toBeInTheDocument();
    expect(userBlock).toHaveAttribute("aria-disabled", "true");
    expect(userBlock).toHaveAttribute("inert");

    fireEvent.click(screen.getByAltText("Profile"));
    fireEvent.click(screen.getByText("Newcomer", { selector: "div" }));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
