import { describe, it, expect } from "vitest";
import { formatInboxMessage } from "./formatInboxMessage";

describe("formatInboxMessage", () => {
  it("returns empty string for null or undefined", () => {
    expect(formatInboxMessage(null)).toBe("");
    expect(formatInboxMessage(undefined)).toBe("");
    expect(formatInboxMessage("")).toBe("");
  });

  it("strips HTML tags and handles breaks", () => {
    const html = "<div>Hello<br/>World</div><p>Paragraph</p>";
    const result = formatInboxMessage(html);
    expect(result).toBe("Hello\nWorld\n\nParagraph");
  });

  it("decodes HTML entities", () => {
    const html = "Test &amp; &lt;Code&gt; &#39;Quotes&#39;";
    expect(formatInboxMessage(html)).toBe("Test & <Code> 'Quotes'");
  });

  it("strips reply tail", () => {
    const message = "Actual message\nOn Mon, Oct 2, 2023 at 12:00 PM Person wrote:\n> Quoted text here";
    expect(formatInboxMessage(message)).toBe("Actual message");
  });

  it("strips links", () => {
    const message = "Check out this [link](http://example.com) and https://example.com";
    expect(formatInboxMessage(message)).toBe("Check out this link and");
  });
});
