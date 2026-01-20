// Defines the structure of a job card used in the client application

export type JobCardType = {
  id: string;
  title: string;
  description?: string;
  column: string;
  companyName?: string;
  date?: string;
  salary?: number;
  receivedAtRaw?: string | null;
  isArchived?: boolean;
  isDeleted?: boolean;
  notes?: string;
  providerSource?: string;
  reviewNeeded?: boolean;
  applicationStage?: string;
};