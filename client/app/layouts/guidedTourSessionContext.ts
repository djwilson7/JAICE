import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { DemoEmail } from "@/demo-data/demoEmails";
import type { JobCardType } from "@/types/jobCardType";
import type { GuidedTourDemoDataState } from "./guidedTourSteps";
import type { GuidedTourHomeInteractionState } from "./guidedTourSteps";

export type GuidedTourSessionValue = {
  demoDataAvailable: boolean;
  demoDataState: GuidedTourDemoDataState;
  demoDataRevision: number;
  homeInteractionState: GuidedTourHomeInteractionState;
  deletedJobIds: readonly string[];
  recordDeletedJobIds: (ids: string[]) => void;
  demoJobs: readonly JobCardType[];
  setDemoJobs: Dispatch<SetStateAction<JobCardType[]>>;
  removeDemoJobs: (ids: readonly string[]) => void;
  emails: readonly DemoEmail[];
};

export const GuidedTourSessionContext =
  createContext<GuidedTourSessionValue>({
    demoDataAvailable: false,
    demoDataState: "hidden",
    demoDataRevision: 0,
    homeInteractionState: "idle",
    deletedJobIds: [],
    recordDeletedJobIds: () => undefined,
    demoJobs: [],
    setDemoJobs: () => undefined,
    removeDemoJobs: () => undefined,
    emails: [],
  });

export function useGuidedTourSession() {
  return useContext(GuidedTourSessionContext);
}
