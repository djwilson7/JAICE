import { useState } from "react";
import { api } from "@/global-services/api";
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

  const open = async () => {
    setIsOpen(true);
    if (isLoading) return;

    setIsLoading(true);
    try {
      const res = await api("/api/jobs/archive");
      setItems(
        res.status === "success" && Array.isArray(res.jobs)
          ? convertToJobCardArray(res.jobs)
          : []
      );
    } finally {
      setIsLoading(false);
    }
  };

  const close = () => setIsOpen(false);

  const unarchive = async (ids: string[]) => {
    await api("/api/jobs/set-archive", {
      method: "POST",
      body: JSON.stringify({ provider_message_ids: ids }),
    });

    setItems((prev) => prev.filter((j) => !ids.includes(j.id)));
    await onRestore?.();
  };

  const handleAction = async (action: string, ids?: string[]) => {
    if (!ids?.length) return;

    try {
      if (action === "unarchive") {
        await unarchive(ids);
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
