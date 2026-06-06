import { Modal } from "@/global-components/Modal";
import { useEffect, useState } from "react";

export interface DaysToSyncOption {
  label: string;
  days: number;
}

interface DaysToSyncProps {
  show: boolean;
  options: DaysToSyncOption[];
  onSelection: (days: number) => void;
  onCancel: () => void;
}

// A component that displays a modal for selecting days to sync emails
export function DaysToSync({
  show,
  options,
  onSelection,
  onCancel,
}: DaysToSyncProps) {
  const [selectedDays, setSelectedDays] = useState(options[0]?.days ?? 0);

  useEffect(() => {
    if (show) {
      setSelectedDays(options[0]?.days ?? 0);
    }
  }, [options, show]);

  const selectedOption = options.find(
    (option) => option.days === selectedDays
  );

  return (
    <Modal
      isOpen={show}
      onClose={onCancel}
      modalTitle="Link Gmail"
      primaryAction={{
        label: "Confirm",
        onClick: () => onSelection(selectedDays),
        className: "green",
        disabled: selectedDays === 0,
      }}
    >
      <div className="link-gmail-modal-body">
        <div className="link-gmail-status">
          <span className="link-gmail-status-line" aria-hidden="true" />
          <div className="link-gmail-status-copy">
            <strong>Choose your initial sync window</strong>
            <span>
              JAICE will review job-related email from this period when Gmail
              is first connected.
            </span>
          </div>
        </div>

        <fieldset className="link-gmail-sync-fieldset">
          <legend>Inbox history</legend>
          <div
            className="link-gmail-segmented-control"
            role="radiogroup"
            aria-label="Inbox history to sync"
          >
          {options.map((option) => (
              <button
                type="button"
                role="radio"
                aria-checked={selectedDays === option.days}
                key={option.days}
                className="link-gmail-segment"
                onClick={() => setSelectedDays(option.days)}
              >
                {option.label}
              </button>
          ))}
          </div>
        </fieldset>

        <p className="link-gmail-selection-summary">
          <strong>{selectedOption?.label ?? "No period"} selected.</strong>{" "}
          Future job-related messages will continue syncing after the initial
          import.
        </p>

        <p className="link-gmail-privacy-copy">
          Only messages identified as job-search activity are added to JAICE.
        </p>
        </div>
    </Modal>
  );
}
