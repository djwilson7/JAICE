import { useState } from "react";
import { api } from "@/global-services/api";
import { useBannerNotifications } from "@/global-components/bannerNotificationContext";
import type { JobCardType } from "@/types/jobCardType";
import { convertToJobCardArray } from "@/pages/home/utils/convertToJobCard";

export function useArchiveActions({
  onRestore,
}: {
  onRestore?: () => Promise<void> | void;
}) {
  const [items, setItems] = useState<JobCardType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { showBanner } = useBannerNotifications();

  const open = async () => {
    setIsOpen(true);
    if (isLoading) return;

    setIsLoading(true);
    try {
      const res = await api("/api/jobs/archive");
      if (res.status !== "success" || !Array.isArray(res.jobs)) {
        throw new Error("Archive response was unsuccessful.");
      }

      setItems(convertToJobCardArray(res.jobs));
    } catch (error) {
      setItems([]);
      console.error("Failed to load archived jobs:", error);
      showBanner({
        message: "Failed to load archived jobs. Try again.",
        tone: "error",
        timeoutMs: 10000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const close = () => setIsOpen(false);

  const unarchive = async (ids: string[]) => {
    const jobTitle = getJobTitle(items, ids);

    await api("/api/jobs/set-archive", {
      method: "POST",
      body: JSON.stringify({ provider_message_ids: ids }),
    });

    setItems((prev) => prev.filter((j) => !ids.includes(j.id)));
    await onRestore?.();
    showBanner({
      message: `${jobTitle} restored successfully.`,
      tone: "success",
      timeoutMs: 4000,
    });
  };

  const deleteFromArchive = async (ids: string[]) => {
    const jobTitle = getJobTitle(items, ids);

    await api("/api/jobs/set-archive", {
      method: "POST",
      body: JSON.stringify({ provider_message_ids: ids }),
    });

    await api("/api/jobs/set-delete", {
      method: "POST",
      body: JSON.stringify({ provider_message_ids: ids }),
    });

    setItems((prev) => prev.filter((j) => !ids.includes(j.id)));
    showBanner({
      message: `${jobTitle} moved to Trash.`,
      tone: "success",
      timeoutMs: 4000,
    });
  };

  const handleAction = async (action: string, ids?: string[]) => {
    if (!ids?.length) return;

    try {
      if (action === "unarchive") {
        await unarchive(ids);
      }
      if (action === "delete") {
        await deleteFromArchive(ids);
      }
    } catch (err) {
      console.error("Archive action failed:", err);
      await open(); // soft recovery
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
