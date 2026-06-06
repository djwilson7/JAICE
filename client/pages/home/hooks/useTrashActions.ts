import { useState } from "react";
import { api } from "@/global-services/api";
import { useBannerNotifications } from "@/global-components/bannerNotificationContext";
import type { JobCardType } from "@/types/jobCardType";
import { convertToJobCardArray } from "@/pages/home/utils/convertToJobCard";

export function useTrashActions({
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

    await api("/api/jobs/set-delete", {
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

  const deletePermanently = async (ids: string[]) => {
    const jobTitle = getJobTitle(items, ids);

    await api("/api/jobs/permanently-delete", {
      method: "POST",
      body: JSON.stringify({
        provider_message_ids: ids,
        confirm: true,
      }),
    });

    setItems((prev) => prev.filter((j) => !ids.includes(j.id)));
    showBanner({
      message: `${jobTitle} permanently deleted.`,
      tone: "success",
      timeoutMs: 4000,
    });
  };

  const archiveFromTrash = async (ids: string[]) => {
    await api("/api/jobs/set-delete", {
      method: "POST",
      body: JSON.stringify({ provider_message_ids: ids }),
    });

    await api("/api/jobs/set-archive", {
      method: "POST",
      body: JSON.stringify({ provider_message_ids: ids }),
    });

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
