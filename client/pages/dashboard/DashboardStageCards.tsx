import React from "react";
//import { useJobStats } from "@/client/state/useJobStats"; // adjust path

/* ---------- Card: Applications by Stage (Bars) ---------- */
// export function ApplicationsByStageCard() {
//   const { stats } = useJobStats();
//   const data = [
//     { key: "Applied", value: stats.applied, color: "from-[#3a0f2e] to-[#1a1f2c]" },
//     { key: "Interview", value: stats.interview, color: "from-[#164452] to-[#0f2e35]" },
//     { key: "Offer", value: stats.offers, color: "from-[#32274e] to-[#251f3e]" },
//     { key: "Accepted", value: stats.accepted, color: "from-[#1e3351] to-[#16263c]" },
//   ];

export function ApplicationsByStageCard() {
  //const { stats } = useJobStats();
  const data = [
    { key: "Applied", value: 5, color: "from-[#3a0f2e] to-[#1a1f2c]" },
    { key: "Interview", value: 3, color: "from-[#164452] to-[#0f2e35]" },
    { key: "Offer", value: 5, color: "from-[#32274e] to-[#251f3e]" },
    { key: "Accepted", value: 2, color: "from-[#1e3351] to-[#16263c]" },
  ];


  const max = Math.max(1, ...data.map(d => d.value)); // avoid 0/0

  return (
    <Card title="Applications by Stage">
      <div className="grid grid-cols-4 gap-6 items-end h-56">
        {data.map((d) => {
          const h = 16 + Math.round((d.value / max) * 160); // min height + scale
          return (
            <div key={d.key} className="flex flex-col items-center justify-end">
              <div
                className={`w-14 rounded-t-xl bg-gradient-to-b ${d.color} relative transition-all`}
                style={{ height: `${h}px` }}
                aria-label={`${d.key}: ${d.value}`}
                title={`${d.key}: ${d.value}`}
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-slate-100">
                  {d.value}
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-300">{d.key}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------- Card: Split by Stage (Donut) ---------- */
export function SplitByStageCard() {
  //const { stats } = useJobStats();
  //const total = Math.max(1, stats.applied + stats.interview + stats.offers + stats.accepted);
  const total = 15;

//   const slices = [
//     { key: "Applied", value: stats.applied, color: "#76c7c5" },
//     { key: "Interview", value: stats.interview, color: "#f1d36b" },
//     { key: "Offer", value: stats.offers, color: "#4c79ff" },
//     { key: "Accepted", value: stats.accepted, color: "#ff6b41" },
//   ];


  const slices = [
    { key: "Applied", value: 5, color: "#76c7c5" },
    { key: "Interview", value: 3, color: "#f1d36b" },
    { key: "Offer", value: 5, color: "#4c79ff" },
    { key: "Accepted", value: 2, color: "#ff6b41" },
  ];

  // Donut metrics
  const size = 220;
  const thickness = 40;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  let acc = 0;
  const arcs = slices.map((s) => {
    const fr = s.value / total;
    const len = fr * c;
    const dash = `${len} ${c - len}`;
    const gap = acc * c;
    acc += fr;
    return { ...s, dash, offset: -gap };
  });

  return (
    <Card title="Split by Stage">
      <div className="flex gap-8 items-center">
        {/* Donut */}
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
          <g transform={`translate(${size / 2}, ${size / 2})`}>
            <circle r={r} fill="transparent" stroke="#0d1b24" strokeWidth={thickness} />
            {arcs.map((a) => (
              <circle
                key={a.key}
                r={r}
                fill="transparent"
                stroke={a.color}
                strokeWidth={thickness}
                strokeDasharray={a.dash}
                strokeDashoffset={a.offset}
                transform="rotate(-90)"
              />
            ))}
          </g>
        </svg>

        {/* Legend */}
        <div className="space-y-3 text-sm">
          {slices.map((s) => (
            <div key={s.key} className="flex items-center gap-3">
              <span
                className="inline-block h-3 w-3 rounded"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-slate-200">{s.key}</span>
              <span className="text-slate-400">
                {s.value} ({Math.round((s.value / total) * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ---------- Shared Card shell ---------- */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-600/40 bg-[#08232b] p-5 shadow-sm">
      <h3 className="text-xl text-slate-100 font-serif text-center mb-4">{title}</h3>
      {children}
    </div>
  );
}
