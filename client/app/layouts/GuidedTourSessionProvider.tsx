import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { GuidedTourSessionContext } from "./guidedTourSessionContext";
import {
  DEMO_EMAILS,
  createDemoExploreJobs,
  createDemoProcessingJobs,
  createDemoSortedJobs,
} from "@/demo-data/demoEmails";
import type {
  GuidedTourDemoDataState,
  GuidedTourHomeInteractionState,
} from "./guidedTourSteps";
import {
  JOB_LOCAL_CHANGE_EVENT,
  type JobLocalChangeDetail,
} from "@/pages/home/utils/jobLocalChangeEvent";
import type { JobCardType } from "@/types/jobCardType";

const EMPTY_JOB_IDS: readonly string[] = [];
const EXPLORE_JOB_IDS = new Set(createDemoExploreJobs().map((job) => job.id));

export function GuidedTourSessionProvider({
  children,
  demoDataState,
  demoDataRevision = 0,
  homeInteractionState = "idle",
  deletedJobIds = EMPTY_JOB_IDS,
  recordDeletedJobIds = () => undefined,
}: {
  children: ReactNode;
  demoDataState: GuidedTourDemoDataState;
  demoDataRevision?: number;
  homeInteractionState?: GuidedTourHomeInteractionState;
  deletedJobIds?: readonly string[];
  recordDeletedJobIds?: (ids: string[]) => void;
}) {
  const demoDataAvailable = demoDataState !== "hidden";
  const [demoJobs, setDemoJobs] = useState<JobCardType[]>(() => {
    if (demoDataState === "processing") return createDemoProcessingJobs();
    if (demoDataState === "sorted" || demoDataState === "bulk-deleted") {
      const deletedIds = new Set(deletedJobIds);
      return createDemoSortedJobs().map((job) =>
        deletedIds.has(job.id) ? { ...job, isDeleted: true } : job
      );
    }
    return [];
  });
  const previousTourState = useRef({
    dataState: demoDataState,
    revision: demoDataRevision,
  });

  useEffect(() => {
    const previous = previousTourState.current;

    setDemoJobs((currentJobs) => {
      if (demoDataState === "hidden") {
        return currentJobs.length === 0 ? currentJobs : [];
      }

      if (
        demoDataState === "processing" &&
        previous.dataState !== "processing"
      ) {
        return createDemoProcessingJobs();
      }

      if (demoDataState === "sorted") {
        if (
          previous.dataState === "hidden" ||
          previous.dataState === "processing"
        ) {
          return createDemoSortedJobs();
        }

        if (previous.dataState === "bulk-deleted") {
          const deletedIds = new Set(deletedJobIds);
          return currentJobs.map((job) =>
            deletedIds.has(job.id) ? { ...job, isDeleted: false } : job
          );
        }

        if (previous.revision === 8 && demoDataRevision === 7) {
          return currentJobs.map((job) =>
            job.id === "demo-email-juniper-offer"
              ? {
                  ...job,
                  column: "offer",
                  applicationStage: "offer",
                }
              : job
          );
        }
      }

      if (demoDataState === "bulk-deleted") {
        const deletedIds = new Set(deletedJobIds);
        const isEnteringDeletedPhase =
          previous.dataState !== "bulk-deleted";
        let nextJobs = currentJobs;

        if (demoDataRevision === 15 && previous.revision !== 15) {
          const existingIds = new Set(nextJobs.map((job) => job.id));
          nextJobs = [
            ...nextJobs,
            ...createDemoExploreJobs().filter(
              (job) => !existingIds.has(job.id)
            ),
          ];
        } else if (previous.revision === 15 && demoDataRevision === 14) {
          nextJobs = nextJobs.filter((job) => !EXPLORE_JOB_IDS.has(job.id));
        }

        return isEnteringDeletedPhase
          ? nextJobs.map((job) =>
              deletedIds.has(job.id) ? { ...job, isDeleted: true } : job
            )
          : nextJobs;
      }

      return currentJobs;
    });

    previousTourState.current = {
      dataState: demoDataState,
      revision: demoDataRevision,
    };
  }, [deletedJobIds, demoDataRevision, demoDataState]);

  useEffect(() => {
    const applyLocalChange = (event: Event) => {
      const { after } = (event as CustomEvent<JobLocalChangeDetail>).detail;
      setDemoJobs((currentJobs) => {
        const exists = currentJobs.some(
          (job) => String(job.id) === String(after.id)
        );
        if (!exists) return [after, ...currentJobs];
        return currentJobs.map((job) =>
          String(job.id) === String(after.id) ? after : job
        );
      });
    };

    window.addEventListener(JOB_LOCAL_CHANGE_EVENT, applyLocalChange);
    return () =>
      window.removeEventListener(JOB_LOCAL_CHANGE_EVENT, applyLocalChange);
  }, []);

  const removeDemoJobs = useCallback((ids: readonly string[]) => {
    const idsToRemove = new Set(ids);
    setDemoJobs((currentJobs) =>
      currentJobs.filter((job) => !idsToRemove.has(job.id))
    );
  }, []);

  return (
    <GuidedTourSessionContext.Provider
      value={{
        demoDataAvailable,
        demoDataState,
        demoDataRevision,
        homeInteractionState,
        deletedJobIds,
        recordDeletedJobIds,
        demoJobs,
        setDemoJobs,
        removeDemoJobs,
        emails: demoDataAvailable ? DEMO_EMAILS : [],
      }}
    >
      {children}
    </GuidedTourSessionContext.Provider>
  );
}
