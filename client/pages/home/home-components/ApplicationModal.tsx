// This is where the new application modal will be
// Information it will ask for:
// - App stage (It will automatically be on whatever stage the user clicks the button on but there will be a drop down to change it)
// - Job Title
// - Company Name
// - Date will be when entered, auto-filled
// - no view email link since there is no email
// - Note: optional text area for notes about the job
// - Save button to add the application

import React, { useEffect, useState } from "react";
import { api } from "@/global-services/api";
import type { JobCardType } from "@/types/jobCardType";
import Button from "@/global-components/button";
import xIcon from "@/assets/icons/x.svg";
import { createPortal } from "react-dom";

/*
    The new application modal is now a central component that handles

    New Application Creation and
    Editing Existing Applications

    Column and Job Card are provided a trigger to open this modal

    They will set the payload as either:
    - String -> Column ID (for new applications)
    - JobCardType -> Specific job to edit

    The modal will then parse the payload

        If string, it is a new application for that column
        If JobCardType, it is editing that specific job

    The component now handles how data is persisted,
    When to save or discard changes,
    and closing itself when it's done.

    This isolates the functionality to the component, instead of the parent element.

    Triggers say: open with this payload
    The modal handles the user interaction from there.

    This also means that the logic inside this component can be significantly
    reduced.

    Now we simply check the payload, and load data if editing.
*/
interface NewApplicationProps {
  isOpen: boolean; // Trigger the open of the modal
  setIsOpen: (isOpen: boolean) => void; // Provided so the modal can close itself
  payload: string | JobCardType | null; // The payload to update modal state
  onSave?: (data: Partial<JobCardType> & { id?: string }) => void;
}

//Helper function and type to extract the job data from a JobCardType and standardize it into a common format
interface ModalData {
  app_stage: string;
  job_title: string;
  received_at: string;
  company_name: string;
  notes: string;
  providerMessageID?: string; // optional, only for editing existing applications links to database
}

const extractDataIntoStandardFormat = (
  payload: string | JobCardType | null
): ModalData => {
  if (typeof payload === "string") {
    return {
      app_stage: payload.charAt(0).toUpperCase() + payload.slice(1) || "",
      job_title: "",
      received_at: new Date().toISOString(),
      company_name: "",
      notes: "",
      providerMessageID: undefined,
    };
  } else if (payload && typeof payload === "object") {
    return {
      app_stage: payload.applicationStage || "",
      job_title: payload.title || "",
      received_at: (payload.date as string) ?? new Date().toISOString(),
      company_name: payload.companyName || "",
      notes: payload.notes || "",
      providerMessageID: payload.id, // for editing existing applications
    };
  } else {
    // if for some reason we are provided a null value. create an empty application state.
    return {
      app_stage: "",
      job_title: "",
      received_at: new Date().toISOString(),
      company_name: "",
      notes: "",
      providerMessageID: undefined,
    };
  }
};

export default function NewApplication({
  isOpen,
  setIsOpen,
  payload,
  onSave,
}: NewApplicationProps) {
  if (!isOpen) return null; // Don't render if not open

  // Standardized data extracted from the payload
  const data = extractDataIntoStandardFormat(payload);

  // conditionally render the modal title and button label
  const modalTitle =
    data.job_title !== "" ? "Edit Application" : "New Application";
  const buttonLabel = data.job_title !== "" ? "Update" : "Save";

  //existing state variables defaults set to the extracted data
  const [stage, setStage] = useState(data.app_stage);
  const [jobTitle, setJobTitle] = useState(data.job_title);
  const [receivedAt, setReceivedAt] = useState<string>(data.received_at);
  const [companyName, setCompanyName] = useState(data.company_name);
  const [notes, setNotes] = useState(data.notes);

  // Keep the key functionality to close on escape and prevent background scroll
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKey);

      // prevent background scroll while modal open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, setIsOpen]);

  // Function to convert the current state variables back into the standardized data object
  function convertStateToPayload(): ModalData {
    return {
      app_stage: stage,
      job_title: jobTitle,
      received_at: receivedAt,
      company_name: companyName,
      notes: notes,
    };
  }

  // save handler
  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();

    // Use the helper function to convert our state var back to the standardized payload

    // this payload with either have a provider_message_id (edit) or not (new)
    // which we can use to determine if we are creating or updating
    const payload = convertStateToPayload();
    const providerMessageID =
      data.providerMessageID !== "" ? data.providerMessageID : undefined;

    try {
      // send to server
      let res;

      if (providerMessageID) {
        // update existing job application
        res = await api(`/api/jobs/update`, {
          method: "POST",
          body: JSON.stringify({
            provider_message_id: [providerMessageID],
            ...payload,
          }),
        });
      } else {
        // create new job application
        res = await api("/api/jobs/create", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      // server returns
      const savedJob = res?.job_application ?? res?.job ?? res ?? null;

      if (onSave) {
        // provide saved row back to parent otherwise pass original payload
        onSave(
          savedJob ??
            ({
              id: providerMessageID,
              job_title: jobTitle,
              company_name: companyName,
              app_stage: stage,
              date: receivedAt,
              received_at: receivedAt,
              notes,
            } as Partial<JobCardType> & { id?: string })
        );
      }
    } catch (error) {
      console.error("Failed to save new application:", error);
    } finally {
      setIsOpen(false);
    }
  }

  // close when clicking outside the modal
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) setIsOpen(false);
  }
  // Set the modal title based on the presence of a job title (new vs edit)

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={handleOverlayClick}
      aria-labelledby="new-app-title"
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={handleSave}
        className="w-full max-w-xl p-10 modal"
      >
        {/* Header with title and close button */}
        <div className="relative flex w-full items-center mb-4 justify-center">
          <h2 id="new-app-title" className="primary-text">
            {modalTitle}
          </h2>
          <div className="absolute right-0 top-0  flex items-center justify-center">
            <Button
              type="button"
              onClick={() => setIsOpen(false)}
              className="roundSmall"
              aria-label={"Close Application Modal"}
              title={"Close Application Modal"}
            >
              <img src={xIcon} alt="Close" className="w-5 h-5 icon" />
            </Button>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <label className="block">
            {/* Stage dropdown with options */}
            <select
              className="mt-1 block w-full border rounded px-2 py-1 text-center"
              style={{
                backgroundColor: "var(--primary-one)",
                color: "var(--color-blue-5)",
              }}
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            >
              {stage ? <option value={stage}>{stage}</option> : null}
              <option value="Applied">Applied</option>
              <option value="Interview">Interview</option>
              <option value="Offer">Offer</option>
              <option value="Rejected">Rejected</option>
              <option value="Accepted">Accepted</option>
            </select>
          </label>

          {/* Job Title input field */}
          <label className="block">
            <span className="primary-text">Job Title</span>
            <input
              className="mt-1 block w-full border rounded px-2 py-1"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              required
            />
          </label>

          {/* Company Name input field */}
          <label className="block">
            <span className="primary-text">Company</span>
            <input
              className="mt-1 block w-full border rounded px-2 py-1"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </label>

          {/* Notes field is optional*/}
          <label className="block">
            <span className="primary-text">Notes (optional)</span>
            <textarea
              className="mt-1 block w-full border rounded px-2 py-1"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-5 flex justify-center gap-3">
          {/* Save button to submit the form */}
          <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-600 text-white justify-center"
          >
            {buttonLabel}
          </button>
        </div>
      </form>
    </div>,
    document.body
  )
}
