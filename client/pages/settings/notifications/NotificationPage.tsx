// import { localfiles } from "@/directory/path/to/localimport";

import React from "react";
//import { Search } from "lucide-react";

export function NotificationPage() {
  return (
    <div className="w-full h-full bg-slate-950 text-slate-100"
    style={{background: "var(--color-bg)"}}>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Left heading */}
          <div className="md:col-span-3">
            <h1 className="text-2xl md:text-3xl font-semibold leading-snug">Notification
              <br className="hidden md:block"/> Settings
            </h1>
          </div>

          {/* Right panel */}
          <div className="md:col-span-9">
            <Section
              title="Application Updates"
              desc="These are notifications about changes to your job applications."
            />
            <Divider />
            <Section
              title="Email & Parsing Alerts"
              desc="These are notifications when new jobs posts, recruiter details, or documents are detected from your linked email(s)."
            />
            <Divider />
            <Section
              title="Reminders & Deadlines"
              desc="These are notifications that remind you about interviews, follow-ups, or pending tasks."
            />
            <Divider />
            <Section
              title="System & Account"
              desc="These are notifications about your account security, login activity, or sync issues."
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full my-6 bg-slate-800" />;
}

type SectionProps = {
  title: string;
  desc: string;
};

function Section({ title, desc }: SectionProps) {
  return (
    <div className="w-full">
      {/* Title & description */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-prose">{desc}</p>
      </div>

      {/* Channel rows */}
      <div className="space-y-3">
        <ChannelRow label="In‑App Alert" defaultOn />
        <ChannelRow label="Email" />
        <ChannelRow label="SMS" />
      </div>
    </div>
  );
}

type ChannelRowProps = {
  label: string;
  defaultOn?: boolean;
};

function ChannelRow({ label, defaultOn = false }: ChannelRowProps) {
  const [on, setOn] = React.useState<boolean>(defaultOn);
  const name = React.useId(); // keeps each row's radios grouped

  return (
    <div className="grid grid-cols-12 items-center text-sm">
      <div className="col-span-4 md:col-span-3 text-slate-300">{label}</div>
      <div className="col-span-8 md:col-span-9">
        <div className="inline-flex items-center gap-6">
          {/* Off */}
          <label
            className="inline-flex items-center gap-2 cursor-pointer"
            htmlFor={`${name}-off`}
            onClick={() => setOn(false)}
          >
            <span className="relative inline-flex h-4 w-4 items-center justify-center">
              <input
                id={`${name}-off`}
                type="radio"
                name={name}
                checked={!on}
                onChange={() => setOn(false)}
                className="sr-only"
              />
              <span className="h-4 w-4 rounded-full border border-slate-600 bg-slate-800" />
              {!on && <span className="absolute h-2 w-2 rounded-full bg-slate-200" />}
            </span>
            <span className="text-slate-400 text-xs">Off</span>
          </label>

          {/* On */}
          <label
            className="inline-flex items-center gap-2 cursor-pointer"
            htmlFor={`${name}-on`}
            onClick={() => setOn(true)}
          >
            <span className="relative inline-flex h-4 w-4 items-center justify-center">
              <input
                id={`${name}-on`}
                type="radio"
                name={name}
                checked={on}
                onChange={() => setOn(true)}
                className="sr-only"
              />
              <span className="h-4 w-4 rounded-full border border-slate-600 bg-slate-800" />
              {on && <span className="absolute h-2 w-2 rounded-full bg-slate-200" />}
            </span>
            <span className="text-slate-400 text-xs">On</span>
          </label>
        </div>
      </div>
    </div>
  );
}
