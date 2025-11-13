export function convertTime(
  raw: string | number | null | undefined
): string | undefined {
  if (!raw) return undefined;

  // Handle both ms strings ("1762733773321") and old ISO formats
  const ms = /^\d{13}$/.test(String(raw))
    ? Number(raw)
    : Date.parse(String(raw));

  if (isNaN(ms)) return undefined;

  // Localized display
  return new Date(ms).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}
