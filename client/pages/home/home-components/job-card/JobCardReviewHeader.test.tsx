import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { JobCardReviewHeader } from "./JobCardReviewHeader";

describe("JobCardReviewHeader", () => {
  it("renders the review message when visible", () => {
    render(<JobCardReviewHeader isVisible={true} />);
    expect(screen.getByText("This job requires your review.")).toBeInTheDocument();
  });

  it("returns null when not visible", () => {
    const { container } = render(<JobCardReviewHeader isVisible={false} />);
    expect(container.firstChild).toBeNull();
  });
});
