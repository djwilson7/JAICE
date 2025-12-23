import { useState } from "react";

export function useDeleteConfirm(onConfirm: () => Promise<void>) {
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  let resolver: ((value: boolean) => void) | null = null;

  const requestDelete = (resolve: (value: boolean) => void) => {
    resolver = resolve;
    setOpen(true);
  };

  const cancel = () => {
    setOpen(false);
    resolver?.(false);
  };

  const confirm = async () => {
    setProcessing(true);
    try {
      await onConfirm();
      resolver?.(true);
    } finally {
      setProcessing(false);
      setOpen(false);
    }
  };

  return { open, processing, requestDelete, cancel, confirm };
}
