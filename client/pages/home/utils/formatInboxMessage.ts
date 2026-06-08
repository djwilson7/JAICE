const BLOCK_BREAK_TAGS =
  /<\/?(address|article|aside|blockquote|div|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|tr|ul)[^>]*>/gi;

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const key = String(entity).toLowerCase();

    if (key.startsWith("#x")) {
      const codePoint = Number.parseInt(key.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    if (key.startsWith("#")) {
      const codePoint = Number.parseInt(key.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    return HTML_ENTITY_MAP[key] ?? match;
  });
}

function stripReplyTail(value: string): string {
  const replyPatterns = [
    /\n\s*On .{0,180}wrote:\s*[\s\S]*$/i,
    /\n\s*From:\s*.+\n\s*Sent:\s*.+\n[\s\S]*$/i,
    /\n\s*-{2,}\s*Original Message\s*-{2,}[\s\S]*$/i,
    /\n\s*_{6,}[\s\S]*$/i,
  ];

  return replyPatterns.reduce((text, pattern) => text.replace(pattern, ""), value);
}

function stripLinkText(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|www\.)[^)\s]+[^)]*\)/gi, "$1")
    .replace(/\b(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi, "")
    .replace(/\b[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s<>"')\]]*)+/gi, "")
    .replace(/\[\s*\]\s*\(\s*\)/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\[\s*\]/g, "")
    .replace(/[ \t\f\v]+([,.;:!?])/g, "$1");
}

function isArtifactLine(line: string): boolean {
  const normalized = line.trim();
  return /^[-_*=•·]+$/.test(normalized)
    || /^(?:[A-Z][\w&'.-]*(?:\s+[A-Z][\w&'.-]*){0,4}\s+)?(?:logo|icon)$/i.test(normalized);
}

export function formatInboxMessage(message?: string | null): string {
  if (!message) return "";

  const withoutHiddenContent = message
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  const withTextLayout = withoutHiddenContent
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(BLOCK_BREAK_TAGS, "\n")
    .replace(/<[^>]+>/g, "");

  const decoded = decodeHtmlEntities(withTextLayout);
  const withoutReplyTail = stripReplyTail(decoded);
  const withoutLinks = stripLinkText(withoutReplyTail);

  return withoutLinks
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim())
    .filter((line) => !isArtifactLine(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
