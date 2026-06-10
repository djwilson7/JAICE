import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlaceHolderContent } from "./PlaceHolderText";

describe("PlaceHolderText", () => {
  it("renders correctly", () => {
    render(<PlaceHolderContent />);
    expect(screen.getByText(/At the very basic level, the info modal can contain paragraphs/)).toBeInTheDocument();
  });
});
