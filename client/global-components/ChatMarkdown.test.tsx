import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatMarkdown } from "./ChatMarkdown";
import React from "react";

describe("ChatMarkdown", () => {
  const allMarkdown = `
# H1
## H2
### H3
Paragraph with **strong** and [link](https://google.com).

* item 1
* item 2

1. first
2. second

> quote

\`inline code\`

\`\`\`javascript
block code
\`\`\`

| head 1 | head 2 |
| --- | --- |
| cell 1 | cell 2 |
`;

  it("renders all markdown elements in light mode", () => {
    render(<ChatMarkdown content={allMarkdown} isLightMode={true} />);
    
    expect(screen.getByText("H1")).toBeInTheDocument();
    expect(screen.getByText("H2")).toBeInTheDocument();
    expect(screen.getByText("H3")).toBeInTheDocument();
    expect(screen.getByText("strong")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "link" })).toHaveAttribute("href", "https://google.com");
    expect(screen.getByText("item 1")).toBeInTheDocument();
    expect(screen.getByText("first")).toBeInTheDocument();
    expect(screen.getByText("quote")).toBeInTheDocument();
    expect(screen.getByText("inline code")).toBeInTheDocument();
    expect(screen.getByText("block code")).toBeInTheDocument();
    expect(screen.getByText("head 1")).toBeInTheDocument();
    expect(screen.getByText("cell 1")).toBeInTheDocument();
  });

  it("renders elements in dark mode", () => {
    render(<ChatMarkdown content="# Dark Heading" isLightMode={false} />);
    expect(screen.getByText("Dark Heading")).toBeInTheDocument();
  });
});
