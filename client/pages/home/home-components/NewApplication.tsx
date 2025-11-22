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

interface NewApplicationProps 
{
    isOpen: boolean;
    onClose: () => void;
    initialStage: string;
    onSave?: (data: {
        stage: string;
        date: string;
        jobTitle: string;
        companyName: string;
        notes?: string;
    }) => void;
}

export default function NewApplication({ isOpen, onClose, initialStage = "", onSave }: NewApplicationProps) 
{
    const [stage, setStage] = useState(initialStage);
    const [jobTitle, setJobTitle] = useState("");
    const date = new Date(Date.now()); // YYYY-MM-DD FIX MAKE IT EDITABLE 
    const [companyName, setCompanyName] = useState("");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (isOpen) 
        {
            setStage(initialStage);
            setJobTitle("");
            setCompanyName("");
            setNotes("");
        }
    }, [isOpen, initialStage]);

    useEffect(() => {
        function handleKey(e: KeyboardEvent) 
        {
            
        if (e.key === "Escape") onClose();

        }

        if (isOpen) 
        {
        document.addEventListener("keydown", handleKey);
        // prevent background scroll while modal open
        document.body.style.overflow = "hidden";
        }

        return () => {
        document.removeEventListener("keydown", handleKey);
        document.body.style.overflow = "";
        };

    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // save handler
    async function handleSave(e?: React.FormEvent) 
    {
        e?.preventDefault();

        const payload = 
        {
            job_title: jobTitle,
            company_name: companyName,
            app_stage: stage,
            received_at: date,
            notes,
        }; 

        try {
            // send to server
            const res = await api("/api/jobs/create", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            // server returns
            const savedJob = res?.job_application ?? res?.job ?? null;

            if (onSave) {
                // provide saved row back to parent otherwise pass original payload
                onSave(savedJob ?? {
                    stage,
                    date: date,
                    jobTitle,
                    companyName,
                    notes,
                });
            }
        } catch (error) {
            console.error("Failed to save new application:", error);

        } finally {
            onClose();
        }
    }

    // close when clicking outside the modal
    function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) 
    {
        if (e.target === e.currentTarget) onClose();
    }

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-50"
            onClick={handleOverlayClick}
            aria-labelledby="new-app-title"
            role="dialog"
            aria-modal="true"
            // background transparency .50 is the % of transparency
            style={{ backgroundColor: "rgba(0,0,0,0.50)" }}
        >
            <form
                onSubmit={handleSave}
                className="w-full max-w-md rounded-lg shadow-lg p-6 mx-4"
                style={{ backgroundColor: "var(--color-blue-1)", color: "var(--color-blue-5)" }}
            >
                {/* Header with title and close button */}
                <div className="flex justify-between items-center mb-4">

                    <h2 
                        id="new-app-title" 
                        className="text-2xl font-semibold text-center w-full">
                        New Application
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="addApplication"
                        aria-label="Close New Application Form"
                    >
                        ✕
                    </button>

                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                    <label className="block">
                        {/* Stage dropdown with options */}
                        <select
                            className="mt-1 block w-full border rounded px-2 py-1 text-center"
                            style={{ backgroundColor: "var(--color-blue-1)", color: "var(--color-blue-5)" }}
                            value={stage}
                            onChange={(e)=> setStage(e.target.value)}
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
                        <span className="text-gray-700 dark:text-gray-300">Job Title</span>
                        <input
                            className="mt-1 block w-full border rounded px-2 py-1"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              required
            />
          </label>

          
        {/* Company Name input field */}
          <label className="block">
            <span className="text-sm font-medium">Company</span>
            <input
              className="mt-1 block w-full border rounded px-2 py-1"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </label>

        {/* Notes field is optional*/}
          <label className="block">
            <span className="text-sm font-medium">Notes (optional)</span>
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
          <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white justify-center">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}