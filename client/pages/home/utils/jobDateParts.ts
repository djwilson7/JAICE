import type { JobCardType } from "@/types/jobCardType";

export type JobDateParts = {
  date: string;
  time: string;
  dateSearchText: string;
};

export function getJobDateParts(job: JobCardType): JobDateParts {
  const rawDate = job.receivedAtRaw;
  const ms = rawDate
    ? /^\d{13}$/.test(String(rawDate))
      ? Number(rawDate)
      : Date.parse(String(rawDate))
    : NaN;

  if (!Number.isNaN(ms)) {
    const parsedDate = new Date(ms);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const date = parsedDate.toLocaleDateString("en-US", {
      dateStyle: "medium",
      timeZone,
    });
    const time = parsedDate.toLocaleTimeString("en-US", {
      timeStyle: "short",
      timeZone,
    });
    const longDate = parsedDate.toLocaleDateString("en-US", {
      dateStyle: "long",
      timeZone,
    });

    return {
      date,
      time,
      dateSearchText: `${date} ${longDate}`,
    };
  }

  const fallback = job.date ?? "";
  const [date, time] = fallback.split(/,\s(?=[^,]+$)/);

  return {
    date: date || fallback,
    time: time || "",
    dateSearchText: fallback,
  };
}
