export const ValidColumns = [
  "applied",
  "interview",
  "offer",
  "accepted",
  "rejected",
] as const;

export type ValidColumn = (typeof ValidColumns)[number];

export function isValidColumn(column: string): column is ValidColumn {
  return (ValidColumns as readonly string[]).includes(column);
}
