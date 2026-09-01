import { useState, useEffect, useRef } from "react";
import { api } from "@/global-services/api";
import { useBannerNotifications } from "@/global-components/bannerNotificationContext";
import type { JobCardType } from "@/types/jobCardType";
import { convertToJobCardArray, type JobRealtimeEvent } from "@/pages/home/utils/convertToJobCard";
import { JOB_REALTIME_CHANGE_EVENT } from "@/pages/home/hooks/useRealTimeJobs";
import { IS_DEMO_MODE } from "@/global-services/projectMode";
import { useGuidedTourSession } from "@/app/layouts/guidedTourSessionContext";
import { dispatchJobLocalChange } from "@/pages/home/utils/jobLocalChangeEvent";

export function useTrashActions({
  onRestore,
}: {
  onRestore?: () => Promise<void> | void;
}) {
  const [items, setItems] = useState<JobCardType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { showBanner } = useBannerNotifications();
  const { homeInteractionState, demoJobs, removeDemoJobs } =
    useGuidedTourSession();
  const previousTourStateRef = useRef(homeInteractionState);

  useEffect(() => {
    if (!IS_DEMO_MODE) return;

    const previousState = previousTourStateRef.current;
    if (homeInteractionState === "trash-open") {
      setItems(demoJobs.filter((job) => job.isDeleted));
      setIsOpen(true);
    } else if (
      homeInteractionState === "trash-ready" ||
      previousState === "trash-open"
    ) {
      setIsOpen(false);
    }
    previousTourStateRef.current = homeInteractionState;
  }, [demoJobs, homeInteractionState]);

  useEffect(() => {
    const handleRealtimeChange = (e: Event) => {
      const event = (e as CustomEvent<JobRealtimeEvent>).detail;
      const eventType = event.event || event.type;
      
      if (eventType === "DELETE") {
        const idToRemove = event.payload?.old?.provider_message_id;
        if (idToRemove) {
          setItems((prev) => prev.filter((j) => String(j.id) !== String(idToRemove)));
        }
      } else if (eventType === "UPDATE") {
        const updatedJob = event.payload?.new;
        if (updatedJob && !updatedJob.is_deleted) {
          setItems((prev) => prev.filter((j) => String(j.id) !== String(updatedJob.provider_message_id)));
        }
      }
    };

    window.addEventListener(JOB_REALTIME_CHANGE_EVENT, handleRealtimeChange);
    return () => window.removeEventListener(JOB_REALTIME_CHANGE_EVENT, handleRealtimeChange);
  }, []);

  const open = async () => {
    setIsOpen(true);
    if (isLoading) return;

    if (IS_DEMO_MODE) {
      setItems(demoJobs.filter((job) => job.isDeleted));
      return;
    }

    setIsLoading(true);
    try {
      const res = await api("/api/jobs/trash");
      if (res.status !== "success" || !Array.isArray(res.jobs)) {
        throw new Error("Trash response was unsuccessful.");
      }

      setItems(convertToJobCardArray(res.jobs));
    } catch (error) {
      setItems([]);
      console.error("Failed to load deleted jobs:", error);
      showBanner({
        message: "Failed to load deleted jobs. Try again.",
        tone: "error",
        timeoutMs: 10000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const close = () => setIsOpen(false);

  const undelete = async (ids: string[]) => {
    const jobTitle = getJobTitle(items, ids);

    if (IS_DEMO_MODE) {
      items
        .filter((job) => ids.includes(job.id))
        .forEach((job) =>
          dispatchJobLocalChange({
            before: job,
            after: { ...job, isDeleted: false },
          })
        );
    } else {
      await api("/api/jobs/set-delete", {
        method: "POST",
        body: JSON.stringify({ provider_message_ids: ids }),
      });
    }

    setItems((prev) => prev.filter((j) => !ids.includes(j.id)));
    await onRestore?.();
    if (IS_DEMO_MODE) {
      window.dispatchEvent(
        new CustomEvent("guided-tour-trash-restored", { detail: { ids } })
      );
    }
    showBanner({
      message: `${jobTitle} restored successfully.`,
      tone: "success",
      timeoutMs: 4000,
    });
  };

  const deletePermanently = async (ids: string[]) => {
    const jobTitle = getJobTitle(items, ids);

    if (IS_DEMO_MODE) {
      removeDemoJobs(ids);
    } else {
      await api("/api/jobs/permanently-delete", {
        method: "POST",
        body: JSON.stringify({
          provider_message_ids: ids,
          confirm: true,
        }),
      });
    }

    setItems((prev) => prev.filter((j) => !ids.includes(j.id)));
    showBanner({
      message: `${jobTitle} permanently deleted.`,
      tone: "success",
      timeoutMs: 4000,
    });
  };

  const archiveFromTrash = async (ids: string[]) => {
    if (IS_DEMO_MODE) {
      items
        .filter((job) => ids.includes(job.id))
        .forEach((job) =>
          dispatchJobLocalChange({
            before: job,
            after: { ...job, isDeleted: false, isArchived: true },
          })
        );
    } else {
      await api("/api/jobs/set-delete", {
        method: "POST",
        body: JSON.stringify({ provider_message_ids: ids }),
      });

      await api("/api/jobs/set-archive", {
        method: "POST",
        body: JSON.stringify({ provider_message_ids: ids }),
      });
    }

    setItems((prev) => prev.filter((j) => !ids.includes(j.id)));
  };

  const handleAction = async (action: string, ids?: string[]) => {
    if (!ids?.length) return;

    try {
      if (action === "undelete") await undelete(ids);
      if (action === "delete_permanently") await deletePermanently(ids);
      if (action === "archive") await archiveFromTrash(ids);
    } catch (err) {
      console.error("Trash action failed:", err);
      await open();
    }
  };

  return {
    isOpen,
    isLoading,
    items,
    open,
    close,
    handleAction,
  };
}

function getJobTitle(items: JobCardType[], ids: string[]) {
  return items.find((job) => ids.includes(job.id))?.title ?? "Job";
}
