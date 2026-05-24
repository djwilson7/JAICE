import type { JobCardType } from "@/types/jobCardType";

export type UndoAction =
  | { type: "delete"; job: JobCardType }
  | { type: "move"; id: string; from: string; to: string; job?: JobCardType }
  | { type: "deleteMultiple"; jobs: JobCardType[] }
  | { type: "moveMultiple"; jobs: JobCardType[]; to: string }
  | { type: "archiveMultiple"; jobs: JobCardType[] };

export type SnapShotAction = {
  before: JobCardType[];
  after: JobCardType[];
  label?: string;
  createdAt?: number;
};
