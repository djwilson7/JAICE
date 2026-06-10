import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrandBlock } from "./BrandBlock";

vi.mock("@/global-services/useBrandImage", () => ({
  useBrandImage: () => "brand-image.png",
}));

describe("BrandBlock", () => {
  it("renders correctly", () => {
    render(<BrandBlock />);
    expect(screen.getByText("Simplify Your Job Hunt")).toBeInTheDocument();
    expect(screen.getByAltText("JAICE")).toHaveAttribute("src", "brand-image.png");
  });
});
