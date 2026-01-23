import React, { useMemo, useState } from "react";

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

/* ---------- Shared UI (Dashboard-style) ---------- */
function Card({
  title,
  subtitle,
  right,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "rounded-2xl border border-slate-600/40 bg-[#08232b] p-6 shadow-sm",
        className,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl text-slate-100 font-serif text-center">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-300 text-center">{subtitle}</p>
          )}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      <div className="mt-5">{children}</div>
    </section>
  );
}

const labelClass = "block text-sm font-medium text-slate-200 mb-2";
const inputClass =
  "w-full min-w-0 rounded-md border border-slate-600/40 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20";
const inputSmClass =
  "w-full min-w-0 rounded-md border border-slate-600/40 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20";
const textareaClass =
  "w-full min-w-0 rounded-md border border-slate-600/40 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20";

/* ---------- Page ---------- */
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

  const skillsList = useMemo(() => {
    return skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [skillsInput]);

  // ---------- Payload helpers ----------
  const buildResumePayload = (): ResumeData => {
    return {
      ...resume,
      skills: skillsList,
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
          ? { ...exp, bullets: [...exp.bullets, { id: makeId(), text: "" }] }
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
          ? { ...exp, bullets: exp.bullets.filter((b) => b.id !== bulletId) }
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
        { id, school: "", degree: "", startDate: "", endDate: "" },
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
    return (
      <Card
        title={resume.fullName?.trim() ? resume.fullName : "Resume Preview"}
        subtitle={
          resume.fullName?.trim()
            ? "Live preview of your resume"
            : "Fill out the form to generate a live preview"
        }
        className="h-fit"
        right={
          targetRole?.trim() ? (
            <span className="inline-flex px-3 py-1 rounded-full border border-sky-500/60 text-xs text-sky-200 bg-slate-950/30">
              Target: {targetRole}
            </span>
          ) : null
        }
      >
        <div className="space-y-5">
          {/* Contact line */}
          <div className="text-sm text-slate-200">
            <p className="text-2xl font-semibold text-slate-50">
              {resume.fullName || "Your Name"}
            </p>
            <p className="mt-2 text-sm text-slate-300 break-words">
              {[resume.email, resume.phone, resume.location, resume.website, resume.linkedin]
                .filter(Boolean)
                .join(" • ")}
            </p>
          </div>

          {resume.summary?.trim() && (
            <div>
              <p className="text-sm font-semibold text-slate-100 border-b border-slate-600/30 pb-2">
                Summary
              </p>
              <p className="mt-3 text-sm text-slate-200 whitespace-pre-wrap">
                {resume.summary}
              </p>
            </div>
          )}

          {resume.experience.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-100 border-b border-slate-600/30 pb-2">
                Experience
              </p>

              <div className="mt-3 space-y-5">
                {resume.experience.map((exp) => (
                  <div key={exp.id} className="space-y-1">
                    <p className="text-sm font-semibold text-slate-100">
                      {exp.jobTitle || "Job Title"}
                    </p>
                    <p className="text-sm text-slate-300">
                      {[exp.company, exp.location].filter(Boolean).join(" • ")}
                    </p>
                    <p className="text-xs text-slate-400">
                      {[exp.startDate, exp.endDate].filter(Boolean).join(" – ")}
                    </p>

                    {exp.bullets.some((b) => b.text.trim()) && (
                      <ul className="mt-2 list-disc list-inside text-sm text-slate-200 space-y-1">
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
            </div>
          )}

          {resume.education.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-100 border-b border-slate-600/30 pb-2">
                Education
              </p>
              <div className="mt-3 space-y-4">
                {resume.education.map((ed) => (
                  <div key={ed.id} className="space-y-1">
                    <p className="text-sm font-semibold text-slate-100">
                      {ed.degree || "Degree"}
                    </p>
                    <p className="text-sm text-slate-300">{ed.school}</p>
                    <p className="text-xs text-slate-400">
                      {[ed.startDate, ed.endDate].filter(Boolean).join(" – ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {skillsList.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-100 border-b border-slate-600/30 pb-2">
                Skills
              </p>
              <p className="mt-3 text-sm text-slate-200 break-words">
                {skillsList.join(" • ")}
              </p>
            </div>
          )}
        </div>
      </Card>
    );
  };

  const renderFeedback = () => {
    if (!feedback) return null;

    return (
      <Card
        title="AI Resume Feedback"
        subtitle="Strengths, weaknesses, and next steps"
        right={
          typeof feedback.score === "number" ? (
            <span className="inline-flex px-3 py-1 rounded-full border border-emerald-400/40 text-xs text-emerald-200 bg-slate-950/30">
              Score: {Math.round(feedback.score)} / 100
            </span>
          ) : null
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-600/30 bg-slate-950/30 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                Strengths
              </p>
              {feedback.strengths && feedback.strengths.length > 0 ? (
                <ul className="text-sm text-emerald-200 space-y-1 list-disc list-inside">
                  {feedback.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">No strengths listed yet.</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-600/30 bg-slate-950/30 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                Weaknesses
              </p>
              {feedback.weaknesses && feedback.weaknesses.length > 0 ? (
                <ul className="text-sm text-rose-200 space-y-1 list-disc list-inside">
                  {feedback.weaknesses.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">No weaknesses listed yet.</p>
              )}
            </div>
          </div>

          {feedback.suggestions && (
            <div className="rounded-xl border border-slate-600/30 bg-slate-950/30 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                Suggestions
              </p>
              <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                {feedback.suggestions}
              </p>
            </div>
          )}

          {feedback.checklist && feedback.checklist.length > 0 && (
            <div className="rounded-xl border border-slate-600/30 bg-slate-950/30 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                Action Checklist
              </p>
              <ul className="space-y-2 text-sm text-slate-100">
                {feedback.checklist.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
                    />
                    <span className="leading-relaxed text-slate-200">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>
    );
  };

  // ---------- Main render ----------
  return (
    <div className="w-full min-h-screen">
      <main className="pl-[2rem] px-6 py-6 w-full pb-24">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-3xl font-serif text-slate-100 text-center">
            AI Resume Builder
          </h1>
          <p className="mt-2 text-slate-300 text-center max-w-3xl mx-auto">
            Fill in your details, use AI to improve your summary and bullet points, then get an overall evaluation.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-500/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-100">
            Error: {error}
          </div>
        )}

        {/* Dashboard-like layout: 2-column (form) + 1-column (preview/feedback) on xl */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* LEFT: Form (2 columns wide on xl) */}
          <div className="xl:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card title="Basic Information" subtitle="Contact details used on your resume">
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input
                    className={inputClass}
                    value={resume.fullName}
                    onChange={(e) => updateField("fullName", e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Email</label>
                    <input
                      className={inputClass}
                      value={resume.email || ""}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input
                      className={inputClass}
                      value={resume.phone || ""}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Location</label>
                    <input
                      className={inputClass}
                      value={resume.location || ""}
                      onChange={(e) => updateField("location", e.target.value)}
                      placeholder="Orlando, FL"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Website / Portfolio</label>
                    <input
                      className={inputClass}
                      value={resume.website || ""}
                      onChange={(e) => updateField("website", e.target.value)}
                      placeholder="https://yourportfolio.com"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>LinkedIn</label>
                  <input
                    className={inputClass}
                    value={resume.linkedin || ""}
                    onChange={(e) => updateField("linkedin", e.target.value)}
                    placeholder="https://linkedin.com/in/you"
                  />
                </div>
              </div>
            </Card>

            {/* Summary */}
            <Card
              title="Professional Summary"
              subtitle="2–4 sentences highlighting your experience, skills, and value"
              right={
                <div className="flex flex-col items-end gap-2">
                  <input
                    className="w-64 max-w-full rounded-md border border-slate-600/40 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="Target role (optional)"
                  />
                  <button
                    type="button"
                    onClick={handleImproveSummary}
                    disabled={loadingSummary || !resume.summary?.trim()}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-sky-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sky-500 transition-colors"
                  >
                    {loadingSummary ? "Improving..." : "Improve with AI"}
                  </button>
                </div>
              }
            >
              <textarea
                className={textareaClass + " min-h-[120px]"}
                value={resume.summary || ""}
                onChange={(e) => updateField("summary", e.target.value)}
                placeholder="Driven software engineer with experience in React, Python, and building AI-powered tools..."
              />
            </Card>

            {/* Experience */}
            <Card
              title="Experience"
              subtitle="Add roles and bullet points (use AI to rewrite bullets)"
              right={
                <button
                  type="button"
                  onClick={addExperience}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-slate-600/40 text-slate-100 text-sm hover:border-sky-500 hover:text-slate-50 transition-colors bg-slate-950/20"
                >
                  + Add Experience
                </button>
              }
            >
              {resume.experience.length === 0 ? (
                <p className="text-sm text-slate-300">Add your first job to get started.</p>
              ) : null}

              <div className="space-y-6">
                {resume.experience.map((exp) => (
                  <div
                    key={exp.id}
                    className="rounded-2xl border border-slate-600/30 bg-slate-950/25 p-5 space-y-5"
                  >
                    {/* ==== REPLACE JUST THE FIELDS AREA INSIDE EACH EXPERIENCE ITEM WITH THIS ==== */}

                    <div className="flex items-start justify-between gap-4">
                      {/* Left: fields */}
                      <div className="min-w-0 flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                          {/* Job Title */}
                          <div className="min-w-0 flex flex-col">
                            <label className="block text-sm font-medium text-slate-200 mb-1">
                              Job Title
                            </label>
                            <input
                              className="w-full min-w-0 rounded-lg border border-slate-600/40 bg-slate-950/30 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 placeholder:text-slate-500"
                              value={exp.jobTitle}
                              onChange={(e) => updateExperienceField(exp.id, "jobTitle", e.target.value)}
                              placeholder="Software Engineer"
                            />
                          </div>

                          {/* Company */}
                          <div className="min-w-0 flex flex-col">
                            <label className="block text-sm font-medium text-slate-200 mb-1">
                              Company
                            </label>
                            <input
                              className="w-full min-w-0 rounded-lg border border-slate-600/40 bg-slate-950/30 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 placeholder:text-slate-500"
                              value={exp.company || ""}
                              onChange={(e) => updateExperienceField(exp.id, "company", e.target.value)}
                              placeholder="Company Name"
                            />
                          </div>

                          {/* Location */}
                          <div className="min-w-0 flex flex-col md:col-span-2">
                            <label className="block text-sm font-medium text-slate-200 mb-1">
                              Location
                            </label>
                            <input
                              className="w-full min-w-0 rounded-lg border border-slate-600/40 bg-slate-950/30 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 placeholder:text-slate-500"
                              value={exp.location || ""}
                              onChange={(e) => updateExperienceField(exp.id, "location", e.target.value)}
                              placeholder="Orlando, FL"
                            />
                          </div>

                          {/* Dates */}
                          <div className="min-w-0 flex flex-col">
                            <label className="block text-sm font-medium text-slate-200 mb-1">
                              Start
                            </label>
                            <input
                              className="w-full min-w-0 rounded-lg border border-slate-600/40 bg-slate-950/30 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 placeholder:text-slate-500"
                              value={exp.startDate || ""}
                              onChange={(e) => updateExperienceField(exp.id, "startDate", e.target.value)}
                              placeholder="Jan 2023"
                            />
                          </div>

                          <div className="min-w-0 flex flex-col">
                            <label className="block text-sm font-medium text-slate-200 mb-1">
                              End
                            </label>
                            <input
                              className="w-full min-w-0 rounded-lg border border-slate-600/40 bg-slate-950/30 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 placeholder:text-slate-500"
                              value={exp.endDate || ""}
                              onChange={(e) => updateExperienceField(exp.id, "endDate", e.target.value)}
                              placeholder="Present"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right: remove */}
                      <button
                        type="button"
                        onClick={() => removeExperience(exp.id)}
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-md border border-slate-600/40 text-slate-300 text-sm hover:border-rose-500 hover:text-rose-200 transition-colors bg-slate-950/20"
                      >
                        Remove
                      </button>
                    </div>

                    {/* Bullets */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-medium text-slate-200">Bullet Points</p>
                        <button
                          type="button"
                          onClick={() => addBullet(exp.id)}
                          className="text-sm px-3 py-2 rounded-md border border-slate-600/40 text-slate-200 hover:border-sky-500 transition-colors bg-slate-950/20"
                        >
                          + Add bullet
                        </button>
                      </div>

                      <div className="space-y-3">
                        {exp.bullets.map((b) => (
                          <div key={b.id} className="flex flex-col md:flex-row gap-3">
                            <textarea
                              className={textareaClass + " min-h-[84px] flex-1"}
                              value={b.text}
                              onChange={(e) => updateBulletText(exp.id, b.id, e.target.value)}
                              placeholder="Implemented X using Y resulting in Z..."
                            />

                            <div className="flex flex-row md:flex-col gap-3 md:w-44">
                              <button
                                type="button"
                                onClick={() => handleImproveBullet(exp.id, b.id)}
                                disabled={!b.text.trim() || improvingBulletId === b.id}
                                className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-md bg-sky-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sky-500 transition-colors"
                              >
                                {improvingBulletId === b.id ? "Improving..." : "AI Improve"}
                              </button>

                              <button
                                type="button"
                                onClick={() => removeBullet(exp.id, b.id)}
                                className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-md border border-slate-600/40 text-slate-300 text-sm hover:border-rose-500 hover:text-rose-200 transition-colors bg-slate-950/20"
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
            </Card>


            {/* Education */}
            <Card
              title="Education"
              subtitle="Schools, degrees, and dates"
              right={
                <button
                  type="button"
                  onClick={addEducation}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-slate-600/40 text-slate-100 text-sm hover:border-sky-500 transition-colors bg-slate-950/20"
                >
                  + Add Education
                </button>
              }
            >
              {resume.education.length === 0 ? (
                <p className="text-sm text-slate-300">Add schools, degrees, and dates here.</p>
              ) : null}

              <div className="space-y-4">
                {resume.education.map((ed) => (
                  <div
                    key={ed.id}
                    className="rounded-2xl border border-slate-600/30 bg-slate-950/25 p-5 space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>School</label>
                        <input
                          className={inputSmClass}
                          value={ed.school}
                          onChange={(e) => updateEducationField(ed.id, "school", e.target.value)}
                          placeholder="Full Sail University"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Degree</label>
                        <input
                          className={inputSmClass}
                          value={ed.degree || ""}
                          onChange={(e) => updateEducationField(ed.id, "degree", e.target.value)}
                          placeholder="B.S. Computer Science"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Start</label>
                        <input
                          className={inputSmClass}
                          value={ed.startDate || ""}
                          onChange={(e) => updateEducationField(ed.id, "startDate", e.target.value)}
                          placeholder="Aug 2021"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>End</label>
                        <input
                          className={inputSmClass}
                          value={ed.endDate || ""}
                          onChange={(e) => updateEducationField(ed.id, "endDate", e.target.value)}
                          placeholder="May 2024"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeEducation(ed.id)}
                        className="text-sm px-4 py-2 rounded-md border border-slate-600/40 text-slate-300 hover:border-rose-500 hover:text-rose-200 transition-colors bg-slate-950/20"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Skills */}
            <Card
              title="Skills"
              subtitle='Comma-separated list (e.g. "Python, React, Docker, FastAPI")'
            >
              <textarea
                className={textareaClass + " min-h-[110px]"}
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                placeholder="Python, React, Docker, FastAPI"
              />
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-4">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center justify-center px-5 py-3 rounded-md border border-slate-600/40 text-slate-100 text-sm font-medium hover:border-sky-500 transition-colors bg-slate-950/20"
              >
                Download as PDF
              </button>

              <button
                type="button"
                onClick={handleEvaluateResume}
                disabled={loadingEvaluate}
                className="inline-flex items-center justify-center px-5 py-3 rounded-md bg-emerald-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-500 transition-colors"
              >
                {loadingEvaluate ? "Evaluating..." : "Evaluate Resume with AI"}
              </button>
            </div>
          </div>

          {/* RIGHT: Preview + Feedback */}
          <div className="space-y-6">
            {renderPreview()}
            {renderFeedback()}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Resume;
