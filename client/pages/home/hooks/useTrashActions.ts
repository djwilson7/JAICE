import { useState } from "react";
import { api } from "@/global-services/api";
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

  const open = async () => {
    setIsOpen(true);
    if (isLoading) return;

    setIsLoading(true);
    try {
      const res = await api("/api/jobs/trash");
      setItems(res.status === "success" ? convertToJobCardArray(res.jobs) : []);
    } finally {
      setIsLoading(false);
    }
  };

  const close = () => setIsOpen(false);

  const undelete = async (ids: string[]) => {
    await api("/api/jobs/set-delete", {
      method: "POST",
      body: JSON.stringify({ provider_message_ids: ids }),
    });

    setItems((prev) => prev.filter((j) => !ids.includes(j.id)));
    await onRestore?.();
  };

  const deletePermanently = async (ids: string[]) => {
    await api("/api/jobs/permanently-delete", {
      method: "POST",
      body: JSON.stringify({
        provider_message_ids: ids,
        confirm: true,
      }),
    });

    setItems((prev) => prev.filter((j) => !ids.includes(j.id)));
  };

  const handleAction = async (action: string, ids?: string[]) => {
    if (!ids?.length) return;

    try {
      if (action === "undelete") await undelete(ids);
      if (action === "delete_permanently") await deletePermanently(ids);
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
