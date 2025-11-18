import React, { useState } from "react";

export function Resume() {
  const [resumeText, setResumeText] = useState("");
  const [improvedResume, setImprovedResume] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setImprovedResume("");

    try {
      // Adjust this URL if your backend is exposed somewhere else (e.g. http://localhost:8000)
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

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Resume Assistant</h1>
      <p className="text-sm text-slate-400">
        Paste your resume text below and I&apos;ll generate a clearer, more impactful version.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
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
      </form>

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
