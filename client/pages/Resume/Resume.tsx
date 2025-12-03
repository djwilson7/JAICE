import React, { useState } from "react";

type PdfFeedback = {
  score?: number;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string;
  // keep any extra fields loosely
  [key: string]: any;
};

export function Resume() {
  const [resumeText, setResumeText] = useState("");
  const [improvedResume, setImprovedResume] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfResult, setPdfResult] = useState<PdfFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setImprovedResume("");

    try {
      const resp = await fetch("/api/resume/assist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resume_text: resumeText }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Server error: ${resp.status} - ${text}`);
      }

      const data: { improved_resume: string } = await resp.json();
      setImprovedResume(data.improved_resume);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPdfResult(null);
    setError(null);
    const f = e.target.files && e.target.files[0];
    if (f) {
      setPdfFile(f);
    } else {
      setPdfFile(null);
    }
  };

  // Helper to clean up suggestions that come back wrapped in ```json ... ```
  const cleanSuggestions = (raw?: string) => {
    if (!raw) return "";
    let s = raw.trim();
    if (s.startsWith("```")) {
      // strip ```json and trailing ```
      s = s.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
    }
    return s;
  };

  const handlePdfUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) return;

    setLoading(true);
    setError(null);
    setPdfResult(null);

    try {
      const form = new FormData();
      form.append("file", pdfFile, pdfFile.name);

      const resp = await fetch("http://localhost:8000/api/resume/upload", {
        method: "POST",
        body: form,
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Server error: ${resp.status} - ${text}`);
      }

      const data = (await resp.json()) as PdfFeedback;
      setPdfResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Something went wrong uploading the PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Resume Assistant</h1>
      <p className="text-sm text-slate-400">
        Paste your resume text below and I&apos;ll generate a clearer, more impactful version.
      </p>

      {/* TEXT MODE (still here if you want to re-enable later) */}
      {/* <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="block font-medium mb-1">Your resume text</span>
          <textarea
            className="w-full min-h-[220px] p-3 rounded-md border border-slate-700 bg-slate-900 text-slate-100 outline-none focus:border-sky-500"
            placeholder="Paste your resume here..."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
          />
        </label>

        <button
          type="submit"
          disabled={loading || !resumeText.trim()}
          className="px-4 py-2 rounded-md bg-sky-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Improving..." : "Improve Resume"}
        </button>
      </form> */}

      <div className="pt-6 border-t border-slate-800">
        <h2 className="text-xl font-semibold">Upload PDF Resume</h2>
        <p className="text-sm text-slate-400">
          Upload a PDF and get AI feedback on your resume.
        </p>

        <form onSubmit={handlePdfUpload} className="mt-4 space-y-4">
          {/* CUSTOM FILE BUTTON */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label
              htmlFor="resume-pdf"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-md bg-slate-900 border border-slate-700 text-sm font-medium text-slate-100 shadow-sm cursor-pointer hover:bg-slate-800 hover:border-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Choose File
            </label>

            <input
              id="resume-pdf"
              type="file"
              accept="application/pdf"
              onChange={handlePdfChange}
              className="hidden"
              data-testid="resume-file-input"
            />

            <span className="text-xs text-slate-400 truncate max-w-xs">
              {pdfFile ? `Selected: ${pdfFile.name}` : "No file selected"}
            </span>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={loading || !pdfFile}
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-md bg-sky-600 text-white text-sm font-medium shadow-sm hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Uploading..." : "Upload & Evaluate PDF"}
          </button>
        </form>

        {/* PRETTY FEEDBACK CARD */}
        {pdfResult && (
          <div className="mt-6 space-y-4">
            <h3 className="font-semibold text-lg">Resume AI Feedback</h3>

            {/* Top stats row */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-slate-900/70 border border-slate-800 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                  Score
                </p>
                <p className="text-2xl font-semibold text-emerald-400">
                  {pdfResult.score !== undefined
                    ? `${Math.round(pdfResult.score)} / 100`
                    : "N/A"}
                </p>
              </div>

              <div className="rounded-lg bg-slate-900/70 border border-slate-800 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                  Strengths
                </p>
                {Array.isArray(pdfResult.strengths) &&
                pdfResult.strengths.length > 0 ? (
                  <ul className="text-sm text-emerald-200 space-y-1 list-disc list-inside">
                    {pdfResult.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">No strengths listed.</p>
                )}
              </div>

              <div className="rounded-lg bg-slate-900/70 border border-slate-800 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                  Weaknesses
                </p>
                {Array.isArray(pdfResult.weaknesses) &&
                pdfResult.weaknesses.length > 0 ? (
                  <ul className="text-sm text-rose-200 space-y-1 list-disc list-inside">
                    {pdfResult.weaknesses.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">No weaknesses listed.</p>
                )}
              </div>
            </div>

            {/* Suggestions block */}
            {pdfResult.suggestions && (
              <div className="rounded-lg bg-slate-950/70 border border-slate-800 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                  Suggestions
                </p>
                <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap">
                  {cleanSuggestions(pdfResult.suggestions)}
                </p>
              </div>
            )}

            {/* Optional: raw JSON in case you still want it */}
            {/* <details className="mt-2 text-xs text-slate-400">
              <summary className="cursor-pointer text-slate-300">
                View raw JSON
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto bg-slate-950 border border-slate-800 rounded-md p-3 text-[11px] leading-snug">
                {JSON.stringify(pdfResult, null, 2)}
              </pre>
            </details> */}
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-400">
          Error: {error}
        </div>
      )}

      {improvedResume && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Improved Resume</h2>
          <pre className="whitespace-pre-wrap bg-slate-900 border border-slate-700 p-3 rounded-md text-slate-100 text-sm">
            {improvedResume}
          </pre>
        </div>
      )}
    </div>
  );
}

export default Resume;
