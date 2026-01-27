export type JobIntent =
  | { type: "archive" }
  | { type: "delete" }
  | { type: "review" }
  | { type: "move"; targetColumn: string };
