import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/global-services/api";
import type { JobCardType } from "@/types/jobCardType";
import { Modal } from "@/global-components/Modal";
import {
  convertToJobCard,
  type RawJobApplication,
} from "@/pages/home/utils/convertToJobCard";

interface NewApplicationProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  payload: string | JobCardType | null;
  onSave?: (data: Partial<JobCardType> & { id?: string }) => void;
}

interface ModalData {
  app_stage: string;
  job_title: string;
  received_at: string;
  notes: string;
  providerMessageID?: string;
}

const stageOptions = ["Applied", "Interview", "Offer", "Accepted", "Rejected"];

function extractDataIntoStandardFormat(
  payload: string | JobCardType | null
): ModalData {
  if (typeof payload === "string") {
    return {
      app_stage: payload.charAt(0).toUpperCase() + payload.slice(1),
      job_title: "",
      received_at: new Date().toISOString(),
      notes: "",
    };
  }

  if (payload) {
    return {
      app_stage: payload.applicationStage || payload.column || "Applied",
      job_title: payload.title || "",
      received_at:
        payload.receivedAtRaw ?? payload.date ?? new Date().toISOString(),
      notes: payload.notes || "",
      providerMessageID: payload.id,
    };
  }

  return {
    app_stage: "Applied",
    job_title: "",
    received_at: new Date().toISOString(),
    notes: "",
  };
}

function StagePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const selected = stageOptions.includes(value) ? value : stageOptions[0];

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={pickerRef} className="application-stage-picker">
      <span className="application-field-label">Application stage</span>
      <button
        type="button"
        className="application-stage-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>{selected}</span>
        <span className="application-stage-change-hint" aria-hidden="true">
          Tap to Change
        </span>
      </button>

      {isOpen && (
        <div className="application-stage-menu" role="listbox">
          {stageOptions.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={selected === option}
              className="application-stage-option"
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NewApplication({
  isOpen,
  setIsOpen,
  payload,
  onSave,
}: NewApplicationProps) {
  const data = useMemo(() => extractDataIntoStandardFormat(payload), [payload]);
  const isEditing = Boolean(data.providerMessageID);
  const [stage, setStage] = useState(data.app_stage);
  const [jobTitle, setJobTitle] = useState(data.job_title);
  const [receivedAt, setReceivedAt] = useState(data.received_at);
  const [notes, setNotes] = useState(data.notes);

  useEffect(() => {
    if (!isOpen) return;

    setStage(data.app_stage || stageOptions[0]);
    setJobTitle(data.job_title);
    setReceivedAt(data.received_at);
    setNotes(data.notes);
  }, [
    data.app_stage,
    data.job_title,
    data.notes,
    data.received_at,
    isOpen,
  ]);

  if (!isOpen) return null;

  async function handleSave(event?: React.FormEvent) {
    event?.preventDefault();

    const applicationPayload = {
      app_stage: stage,
      job_title: jobTitle.trim(),
      received_at: receivedAt,
      notes: notes.trim(),
    };

    try {
      const response = data.providerMessageID
        ? await api("/api/jobs/update", {
            method: "POST",
            body: JSON.stringify({
              provider_message_id: [data.providerMessageID],
              ...applicationPayload,
            }),
          })
        : await api("/api/jobs/create", {
            method: "POST",
            body: JSON.stringify(applicationPayload),
          });

      const savedJob =
        response?.job_application ??
        response?.updated_jobs?.[0] ??
        response?.job ??
        null;

      onSave?.(
        savedJob
          ? convertToJobCard(savedJob as RawJobApplication)
          : {
              id: data.providerMessageID,
              title: jobTitle.trim(),
              column: stage,
              applicationStage: stage,
              date: receivedAt,
              receivedAtRaw: receivedAt,
              notes: notes.trim(),
            }
      );

      setIsOpen(false);
    } catch (error) {
      console.error("Failed to save application:", error);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      modalTitle={isEditing ? "Edit Application" : "New Application"}
      primaryAction={{
        label: isEditing ? "Update" : "Save",
        type: "submit",
        form: "job-application-form",
        className: "green",
      }}
    >
      <form
        id="job-application-form"
        onSubmit={handleSave}
        className="application-form"
      >
        <div className="application-form-fields">
          <StagePicker value={stage} onChange={setStage} />

          <label className="application-field">
            <span className="application-field-label">Job title</span>
            <input
              className="application-field-control"
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              placeholder="e.g. Product Designer"
              autoComplete="off"
              required
            />
          </label>

          <label className="application-field">
            <span className="application-field-label">Content/Notes</span>
            <textarea
              className="application-field-control application-notes-field"
              rows={6}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add context, follow-up details, or reminders."
            />
          </label>
        </div>
      </form>
    </Modal>
  );
}
