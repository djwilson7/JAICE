// import { localfiles } from "@/directory/path/to/localimport";

import React, { useEffect, useState } from "react";

type Theme = "light" | "dark";
const THEME_KEY = "theme";

export function AccessibilityPage() {
  // --- Text size, reduce motion, contrast left as local UI state only
  const [textSize, setTextSize] = useState<"sm" | "md" | "lg">("md");

  // --- THEME: initialize from localStorage or system preference
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = (localStorage.getItem(THEME_KEY) as Theme | null) ?? null;
    if (saved === "light" || saved === "dark") return saved;
    const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)").matches;
    return prefersLight ? "light" : "dark";
  });

  const [reduceMotion, setReduceMotion] = useState<boolean>(true);
  const [contrast, setContrast] = useState<number>(1); // 0..3

  // --- Apply theme to <html data-theme="..."> and persist
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // --- Keep in sync if the OS theme changes (only if user hasn't chosen explicitly)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem(THEME_KEY);
      if (!saved) setTheme(e.matches ? "light" : "dark");
    };
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  return (
    <div
      className="w-full h-full bg-slate-950 text-slate-100"
      style={{ background: "var(--color-bg)", color: "var(--text-color-primary)" }}
    >
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Left heading */}
          <div className="md:col-span-3">
            <h1 className="text-2xl md:text-3xl font-semibold leading-snug">
              Accessibility
              <br className="hidden md:block" /> Settings
            </h1>
          </div>

          {/* Right panel */}
          <div className="md:col-span-9">
            {/* Row 1: Text size + Theme */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <Card title="Text & Display" center>
                <Segmented
                  options={[
                    { key: "sm", label: "A", aria: "Small text size" },
                    { key: "md", label: "A", aria: "Default text size" },
                    { key: "lg", label: "A", aria: "Large text size" },
                  ]}
                  value={textSize}
                  onChange={(k) => setTextSize(k as "sm" | "md" | "lg")}
                  renderItem={(opt, active) => (
                    <span
                      className={[
                        "inline-block px-6 py-3 rounded-md border text-base",
                        active
                          ? "bg-slate-200 text-slate-900 border-slate-200"
                          : "bg-slate-800/70 border-slate-700 text-slate-200",
                        opt.key === "sm"
                          ? "text-xs"
                          : opt.key === "md"
                          ? "text-base"
                          : "text-2xl",
                      ].join(" ")}
                    >
                      {opt.label}
                    </span>
                  )}
                />
              </Card>

              <Card title="Theme" center>
                <Segmented
                  options={[
                    { key: "light", label: "☀️", aria: "Light theme" },
                    { key: "dark", label: "🌙", aria: "Dark theme" },
                  ]}
                  value={theme}
                  onChange={(k) => setTheme(k as Theme)}
                  renderItem={(_, active) => (
                    <span
                      className={[
                        "inline-flex items-center justify-center w-24 h-12 rounded-md border text-xl",
                        active
                          ? "bg-slate-200 text-slate-900 border-slate-200"
                          : "bg-slate-800/70 text-slate-100 border-slate-700",
                      ].join(" ")}
                    />
                  )}
                />
              </Card>
            </div>

            {/* Row 2: Reduce motion + Contrast */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-12">
              <Card title="Reduce Motion" center>
                <ToggleSwitch checked={reduceMotion} onChange={setReduceMotion} />
              </Card>

              <Card title="Contrast Level">
                <div className="pt-2">
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={1}
                    value={contrast}
                    onChange={(e) => setContrast(parseInt(e.target.value))}
                    className="w-full accent-slate-300"
                    aria-label="Contrast level"
                  />
                  <div className="mt-4 grid grid-cols-4 gap-4 text-[11px] text-slate-300">
                    <ContrastLabel
                      label="Low Contrast"
                      sub="(subtle, softer colors)"
                      active={contrast === 0}
                      onClick={() => setContrast(0)}
                    />
                    <ContrastLabel
                      label="Default contrast"
                      active={contrast === 1}
                      onClick={() => setContrast(1)}
                    />
                    <ContrastLabel
                      label="High Contrast"
                      sub="(stronger text/background separation)"
                      active={contrast === 2}
                      onClick={() => setContrast(2)}
                    />
                    <ContrastLabel
                      label="Extra-High contrast"
                      active={contrast === 3}
                      onClick={() => setContrast(3)}
                    />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------- Reusable bits ---------- */

function Card({
  title,
  children,
  center,
}: {
  title: string;
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <div className="border border-slate-800 rounded-xl p-6 bg-slate-900/40">
      <div className={center ? "text-center" : ""}>
        <h2 className="text-sm font-semibold text-slate-200 mb-4">{title}</h2>
      </div>
      <div className={center ? "flex justify-center" : ""}>{children}</div>
    </div>
  );
}

type SegmentedOption = { key: string; label: string; aria?: string };

function Segmented({
  options,
  value,
  onChange,
  renderItem,
}: {
  options: SegmentedOption[];
  value: string;
  onChange: (key: string) => void;
  renderItem: (opt: SegmentedOption, active: boolean) => React.ReactNode;
}) {
  return (
    <div className="inline-flex rounded-md border border-slate-700 bg-slate-900/30 p-1">
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            aria-label={opt.aria ?? opt.label}
            className={[
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-md",
              "transition-colors",
              "mx-0.5",
            ].join(" ")}
          >
            {renderItem(opt, active)}
          </button>
        );
      })}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        checked ? "bg-emerald-500/80" : "bg-slate-700",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}

function ContrastLabel({
  label,
  sub,
  active,
  onClick,
}: {
  label: string;
  sub?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={["text-left", active ? "text-slate-100" : "text-slate-400"].join(" ")}
      title={label}
    >
      <div>{label}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </button>
  );
}
