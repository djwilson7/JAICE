import React, { useState } from "react";

type ResumeBullet = {
  id: string;
  text: string;
};

type ExperienceItem = {
  id: string;
  jobTitle: string;
  company?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  bullets: ResumeBullet[];
};

type EducationItem = {
  id: string;
  school: string;
  degree?: string;
  startDate?: string;
  endDate?: string;
};

type ResumeData = {
  fullName: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  summary?: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  // skills will be sent as array, but we edit them as a comma-separated string
  skills?: string[];
};

type Feedback = {
  score?: number;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string;
  checklist?: string[];
  raw?: string;
};

const API_BASE = "http://localhost:8000/api/resume";

const makeId = () => Math.random().toString(36).slice(2, 10);

export function Resume() {
  const [resume, setResume] = useState<ResumeData>({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    linkedin: "",
    summary: "",
    experience: [],
    education: [],
    skills: [],
  });

  const [skillsInput, setSkillsInput] = useState("");
  const [targetRole, setTargetRole] = useState("");

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingEvaluate, setLoadingEvaluate] = useState(false);
  const [improvingBulletId, setImprovingBulletId] = useState<string | null>(null);




    // ---------- Download PDF helpers ----------

  const buildResumePayload = (): ResumeData => {
    return {
      ...resume,
      skills: skillsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
  };

  // ---------- Generic field helpers ----------

  const updateField = (field: keyof ResumeData, value: string) => {
    setResume((prev) => ({ ...prev, [field]: value }));
  };

  const updateExperienceField = (
    id: string,
    field: keyof ExperienceItem,
    value: string
  ) => {
    setResume((prev) => ({
      ...prev,
      experience: prev.experience.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp
      ),
    }));
  };

  const updateEducationField = (
    id: string,
    field: keyof EducationItem,
    value: string
  ) => {
    setResume((prev) => ({
      ...prev,
      education: prev.education.map((ed) =>
        ed.id === id ? { ...ed, [field]: value } : ed
      ),
    }));
  };

  // ---------- Experience / bullets ----------

  const addExperience = () => {
    const id = makeId();
    setResume((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        {
          id,
          jobTitle: "",
          company: "",
          location: "",
          startDate: "",
          endDate: "",
          bullets: [{ id: makeId(), text: "" }],
        },
      ],
    }));
  };

  const removeExperience = (id: string) => {
    setResume((prev) => ({
      ...prev,
      experience: prev.experience.filter((exp) => exp.id !== id),
    }));
  };

  const addBullet = (expId: string) => {
    setResume((prev) => ({
      ...prev,
      experience: prev.experience.map((exp) =>
        exp.id === expId
          ? {
              ...exp,
              bullets: [...exp.bullets, { id: makeId(), text: "" }],
            }
          : exp
      ),
    }));
  };

  const updateBulletText = (expId: string, bulletId: string, value: string) => {
    setResume((prev) => ({
      ...prev,
      experience: prev.experience.map((exp) =>
        exp.id === expId
          ? {
              ...exp,
              bullets: exp.bullets.map((b) =>
                b.id === bulletId ? { ...b, text: value } : b
              ),
            }
          : exp
      ),
    }));
  };

  const removeBullet = (expId: string, bulletId: string) => {
    setResume((prev) => ({
      ...prev,
      experience: prev.experience.map((exp) =>
        exp.id === expId
          ? {
              ...exp,
              bullets: exp.bullets.filter((b) => b.id !== bulletId),
            }
          : exp
      ),
    }));
  };

  // ---------- Education ----------

  const addEducation = () => {
    const id = makeId();
    setResume((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        {
          id,
          school: "",
          degree: "",
          startDate: "",
          endDate: "",
        },
      ],
    }));
  };

  const removeEducation = (id: string) => {
    setResume((prev) => ({
      ...prev,
      education: prev.education.filter((ed) => ed.id !== id),
    }));
  };

  // ---------- AI: improve summary ----------

  const handleImproveSummary = async () => {
    if (!resume.summary || !resume.summary.trim()) return;
    setLoadingSummary(true);
    setError(null);

    try {
      const resp = await fetch(`${API_BASE}/improve-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary_text: resume.summary,
          target_role: targetRole || undefined,
        }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Server error: ${resp.status} - ${text}`);
      }

      const data: { improved_summary: string } = await resp.json();
      updateField("summary", data.improved_summary);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Failed to improve summary.");
    } finally {
      setLoadingSummary(false);
    }
  };

  // ---------- AI: improve bullet ----------

  const handleImproveBullet = async (expId: string, bulletId: string) => {
    const exp = resume.experience.find((e) => e.id === expId);
    if (!exp) return;

    const bullet = exp.bullets.find((b) => b.id === bulletId);
    if (!bullet || !bullet.text.trim()) return;

    setImprovingBulletId(bulletId);
    setError(null);

    try {
      const resp = await fetch(`${API_BASE}/improve-bullet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bullet_text: bullet.text,
          job_title: exp.jobTitle || undefined,
          company: exp.company || undefined,
        }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Server error: ${resp.status} - ${text}`);
      }

      const data: { improved_bullet: string } = await resp.json();
      updateBulletText(expId, bulletId, data.improved_bullet);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Failed to improve bullet.");
    } finally {
      setImprovingBulletId(null);
    }
  };

  // ---------- AI: evaluate full structured resume ----------

  const handleEvaluateResume = async () => {
    setLoadingEvaluate(true);
    setError(null);
    setFeedback(null);

    const payload = buildResumePayload();

    try {
      const resp = await fetch(`${API_BASE}/evaluate-structured`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }catch (err: any) {
      console.error(err);
      setError(err.message ?? "Failed to evaluate resume.");
    }

    try {
      const resp = await fetch(`${API_BASE}/evaluate-structured`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Server error: ${resp.status} - ${text}`);
      }

      const data: Feedback = await resp.json();
      setFeedback(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Failed to evaluate resume.");
    } finally {
      setLoadingEvaluate(false);
    }
  };

  const handleDownloadPdf = async () => {
    setError(null);

    const payload = buildResumePayload();

    try {
      const resp = await fetch(`${API_BASE}/export-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Server error: ${resp.status} - ${text}`);
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${resume.fullName || "resume"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Failed to download PDF.");
    }
  };

  // ---------- Render helpers ----------

  const renderPreview = () => {
    const skillsList =
      skillsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean) || [];

    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 shadow-sm">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-50">
              {resume.fullName || "Your Name"}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {resume.email && <span>{resume.email}</span>}
              {resume.email && (resume.phone || resume.location || resume.website || resume.linkedin) && (
                <span> • </span>
              )}
              {resume.phone && <span>{resume.phone}</span>}
              {resume.phone && (resume.location || resume.website || resume.linkedin) && (
                <span> • </span>
              )}
              {resume.location && <span>{resume.location}</span>}
              {resume.location && (resume.website || resume.linkedin) && <span> • </span>}
              {resume.website && <span>{resume.website}</span>}
              {resume.website && resume.linkedin && <span> • </span>}
              {resume.linkedin && <span>{resume.linkedin}</span>}
            </p>
          </div>
          {targetRole && (
            <span className="inline-flex px-2 py-1 rounded-full border border-sky-600 text-xs text-sky-300">
              Target: {targetRole}
            </span>
          )}
        </div>

        {resume.summary && resume.summary.trim() && (
          <section className="mt-4">
            <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-1">
              Summary
            </h3>
            <p className="mt-2 text-sm text-slate-100 whitespace-pre-wrap">
              {resume.summary}
            </p>
          </section>
        )}

        {resume.experience.length > 0 && (
          <section className="mt-4">
            <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-1">
              Experience
            </h3>
            <div className="mt-2 space-y-4">
              {resume.experience.map((exp) => (
                <div key={exp.id}>
                  <p className="text-sm font-semibold text-slate-100">
                    {exp.jobTitle || "Job Title"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {[exp.company, exp.location].filter(Boolean).join(" • ")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {[exp.startDate, exp.endDate].filter(Boolean).join(" – ")}
                  </p>
                  {exp.bullets.length > 0 && (
                    <ul className="mt-1 list-disc list-inside text-sm text-slate-100 space-y-1">
                      {exp.bullets
                        .filter((b) => b.text.trim())
                        .map((b) => (
                          <li key={b.id}>{b.text}</li>
                        ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {resume.education.length > 0 && (
          <section className="mt-4">
            <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-1">
              Education
            </h3>
            <div className="mt-2 space-y-3">
              {resume.education.map((ed) => (
                <div key={ed.id}>
                  <p className="text-sm font-semibold text-slate-100">
                    {ed.degree || "Degree"}
                  </p>
                  <p className="text-xs text-slate-400">{ed.school}</p>
                  <p className="text-xs text-slate-500">
                    {[ed.startDate, ed.endDate].filter(Boolean).join(" – ")}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {skillsList.length > 0 && (
          <section className="mt-4">
            <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-1">
              Skills
            </h3>
            <p className="mt-2 text-sm text-slate-100">
              {skillsList.join(" • ")}
            </p>
          </section>
        )}
      </div>
    );
  };

  const renderFeedback = () => {
    if (!feedback) return null;

    return (
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">
            AI Resume Feedback
          </h3>
          {typeof feedback.score === "number" && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-900 border border-slate-700 text-emerald-300">
              Score: {Math.round(feedback.score)} / 100
            </span>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg bg-slate-900/70 border border-slate-800 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
              Strengths
            </p>
            {feedback.strengths && feedback.strengths.length > 0 ? (
              <ul className="text-sm text-emerald-200 space-y-1 list-disc list-inside">
                {feedback.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">No strengths listed yet.</p>
            )}
          </div>

          <div className="rounded-lg bg-slate-900/70 border border-slate-800 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
              Weaknesses
            </p>
            {feedback.weaknesses && feedback.weaknesses.length > 0 ? (
              <ul className="text-sm text-rose-200 space-y-1 list-disc list-inside">
                {feedback.weaknesses.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">No weaknesses listed yet.</p>
            )}
          </div>
        </div>

        {feedback.suggestions && (
          <div className="rounded-lg bg-slate-950/70 border border-slate-800 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
              Suggestions
            </p>
            <p className="text-sm text-slate-100 whitespace-pre-wrap">
              {feedback.suggestions}
            </p>
          </div>
        )}

        {feedback.checklist && feedback.checklist.length > 0 && (
          <div className="rounded-lg bg-slate-950/70 border border-slate-800 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
              Action Checklist
            </p>
            <ul className="space-y-2 text-sm text-slate-100">
              {feedback.checklist.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
                  />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // ---------- Main render ----------

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-50">
          AI Resume Builder
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Fill in your details on the left. Use AI to improve your summary and
          bullet points, then get an overall evaluation of your resume.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-rose-500 bg-rose-950/40 px-3 py-2 text-sm text-rose-100">
          Error: {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* LEFT: Form */}
        <div className="space-y-6">
          {/* Basic Info */}
          <section className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-200">
              Basic Information
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                  value={resume.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                    value={resume.email || ""}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Phone
                  </label>
                  <input
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                    value={resume.phone || ""}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Location
                  </label>
                  <input
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                    value={resume.location || ""}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder="Orlando, FL"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Website / Portfolio
                  </label>
                  <input
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                    value={resume.website || ""}
                    onChange={(e) => updateField("website", e.target.value)}
                    placeholder="https://yourportfolio.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  LinkedIn
                </label>
                <input
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                  value={resume.linkedin || ""}
                  onChange={(e) => updateField("linkedin", e.target.value)}
                  placeholder="https://linkedin.com/in/you"
                />
              </div>
            </div>
          </section>

          {/* Summary */}
          <section className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-200">
                  Professional Summary
                </h2>
                <p className="text-xs text-slate-400">
                  2–4 sentences highlighting your experience, skills, and value.
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <input
                  className="w-36 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="Target role (opt.)"
                />
                <button
                  type="button"
                  onClick={handleImproveSummary}
                  disabled={loadingSummary || !resume.summary?.trim()}
                  className="text-xs px-3 py-1 rounded-md bg-sky-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingSummary ? "Improving..." : "Improve Summary with AI"}
                </button>
              </div>
            </div>

            <textarea
              className="w-full min-h-[90px] rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
              value={resume.summary || ""}
              onChange={(e) => updateField("summary", e.target.value)}
              placeholder="Driven software engineer with experience in React, Python, and building AI-powered tools..."
            />
          </section>

          {/* Experience */}
          <section className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">Experience</h2>
              <button
                type="button"
                onClick={addExperience}
                className="text-xs px-3 py-1 rounded-md border border-slate-700 text-slate-100 hover:border-sky-500"
              >
                + Add Experience
              </button>
            </div>

            {resume.experience.length === 0 && (
              <p className="text-xs text-slate-500">
                Add your first job to get started.
              </p>
            )}

            <div className="space-y-4">
              {resume.experience.map((exp) => (
                <div
                  key={exp.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 space-y-3"
                >
                  <div className="flex justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Job Title
                          </label>
                          <input
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-500"
                            value={exp.jobTitle}
                            onChange={(e) =>
                              updateExperienceField(
                                exp.id,
                                "jobTitle",
                                e.target.value
                              )
                            }
                            placeholder="Software Engineer"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Company
                          </label>
                          <input
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-500"
                            value={exp.company || ""}
                            onChange={(e) =>
                              updateExperienceField(
                                exp.id,
                                "company",
                                e.target.value
                              )
                            }
                            placeholder="Company Name"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Location
                          </label>
                          <input
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-500"
                            value={exp.location || ""}
                            onChange={(e) =>
                              updateExperienceField(
                                exp.id,
                                "location",
                                e.target.value
                              )
                            }
                            placeholder="Orlando, FL"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                              Start
                            </label>
                            <input
                              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-500"
                              value={exp.startDate || ""}
                              onChange={(e) =>
                                updateExperienceField(
                                  exp.id,
                                  "startDate",
                                  e.target.value
                                )
                              }
                              placeholder="Jan 2023"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                              End
                            </label>
                            <input
                              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-500"
                              value={exp.endDate || ""}
                              onChange={(e) =>
                                updateExperienceField(
                                  exp.id,
                                  "endDate",
                                  e.target.value
                                )
                              }
                              placeholder="Present"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeExperience(exp.id)}
                      className="self-start text-[11px] px-2 py-1 rounded-md border border-slate-700 text-slate-400 hover:border-rose-500 hover:text-rose-300"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Bullets */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-300">
                        Bullet Points
                      </p>
                      <button
                        type="button"
                        onClick={() => addBullet(exp.id)}
                        className="text-[11px] px-2 py-1 rounded-md border border-slate-700 text-slate-300 hover:border-sky-500"
                      >
                        + Add bullet
                      </button>
                    </div>

                    <div className="space-y-2">
                      {exp.bullets.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-start gap-2 text-xs"
                        >
                          <textarea
                            className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-500"
                            value={b.text}
                            onChange={(e) =>
                              updateBulletText(exp.id, b.id, e.target.value)
                            }
                            placeholder="Implemented X using Y resulting in Z..."
                          />
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => handleImproveBullet(exp.id, b.id)}
                              disabled={!b.text.trim() || improvingBulletId === b.id}
                              className="text-[11px] px-2 py-1 rounded-md bg-sky-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {improvingBulletId === b.id
                                ? "Improving..."
                                : "AI Improve"}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeBullet(exp.id, b.id)}
                              className="text-[11px] px-2 py-1 rounded-md border border-slate-700 text-slate-400 hover:border-rose-500 hover:text-rose-300"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Education */}
          <section className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">Education</h2>
              <button
                type="button"
                onClick={addEducation}
                className="text-xs px-3 py-1 rounded-md border border-slate-700 text-slate-100 hover:border-sky-500"
              >
                + Add Education
              </button>
            </div>

            {resume.education.length === 0 && (
              <p className="text-xs text-slate-500">
                Add schools, degrees, and dates here.
              </p>
            )}

            <div className="space-y-3">
              {resume.education.map((ed) => (
                <div
                  key={ed.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 space-y-2"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        School
                      </label>
                      <input
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-500"
                        value={ed.school}
                        onChange={(e) =>
                          updateEducationField(ed.id, "school", e.target.value)
                        }
                        placeholder="Full Sail University"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Degree
                      </label>
                      <input
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-500"
                        value={ed.degree || ""}
                        onChange={(e) =>
                          updateEducationField(ed.id, "degree", e.target.value)
                        }
                        placeholder="B.S. Computer Science"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Start
                      </label>
                      <input
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-500"
                        value={ed.startDate || ""}
                        onChange={(e) =>
                          updateEducationField(ed.id, "startDate", e.target.value)
                        }
                        placeholder="Aug 2021"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        End
                      </label>
                      <input
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-500"
                        value={ed.endDate || ""}
                        onChange={(e) =>
                          updateEducationField(ed.id, "endDate", e.target.value)
                        }
                        placeholder="May 2024"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeEducation(ed.id)}
                      className="text-[11px] px-2 py-1 rounded-md border border-slate-700 text-slate-400 hover:border-rose-500 hover:text-rose-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Skills */}
          <section className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-200">Skills</h2>
            <p className="text-xs text-slate-400">
              Enter a comma-separated list (e.g.{" "}
              <span className="font-mono text-[11px]">
                Python, React, Docker, FastAPI
              </span>
              ).
            </p>
            <textarea
              className="w-full min-h-[60px] rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="Python, React, Docker, FastAPI"
            />
          </section>

          {/* Evaluate + Download buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-4 py-2.5 rounded-md border border-slate-700 text-slate-100 text-sm font-medium hover:border-sky-500"
            >
              Download as PDF
            </button>

            <button
              type="button"
              onClick={handleEvaluateResume}
              disabled={loadingEvaluate}
              className="px-4 py-2.5 rounded-md bg-emerald-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingEvaluate ? "Evaluating..." : "Evaluate Resume with AI"}
            </button>
          </div>
        </div>

        {/* RIGHT: Preview + Feedback */}
        <div className="space-y-4">
          {renderPreview()}
          {renderFeedback()}
        </div>
      </div>
    </div>
  );
}

export default Resume;
