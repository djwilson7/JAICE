import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MainHeader } from "./MainHeader";

vi.mock("./UserBlock", () => ({
  UserBlock: () => <div data-testid="user-block">User Block</div>,
}));

vi.mock("./BrandBlock", () => ({
  BrandBlock: () => <div data-testid="brand-block">Brand Block</div>,
}));

describe("MainHeader", () => {
  it("renders correctly", () => {
    render(<MainHeader />);
    expect(screen.getByTestId("user-block")).toBeInTheDocument();
    expect(screen.getByTestId("brand-block")).toBeInTheDocument();
  });
});
