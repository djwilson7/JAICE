import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ModalDivider } from "./ModalDivider";

describe("ModalDivider", () => {
  it("renders correctly", () => {
    const { container } = render(<ModalDivider />);
    expect(container.firstChild).toHaveClass("modal-divider");
  });
});
