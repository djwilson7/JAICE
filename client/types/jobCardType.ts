// Defines the structure of a job card used in the client application

export type JobCardType = {
  id: string;
  title: string;
  column: string;
  date?: string;
  receivedAtRaw?: string | null;
  isArchived?: boolean;
  isDeleted?: boolean;

  reviewNeeded?: boolean;
  applicationStage?: string;
};