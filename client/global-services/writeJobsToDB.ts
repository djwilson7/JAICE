import { api } from "@/global-services/api";
import type { JobCardType } from "@/types/jobCardType";

interface WriteJobsProps {
  jobs_to_update: JobCardType[];
}

// Keep this simple, it takes the already altered job card objects and writes them out.
export async function writeJobsToDB({ jobs_to_update }: WriteJobsProps) {
  if (!jobs_to_update || jobs_to_update.length === 0) {
    console.warn(
      "writeJobsToDB called with empty jobs array, skipping API call."
    );
    return { status: "success", count: 0 };
  }

  try {
    const response = await api("/api/jobs/write-jobs-to-db", {
      method: "POST",
      body: JSON.stringify({ jobs_to_update }),
    });

    return response;
  } catch (err) {
    console.error("Error writing jobs to DB:", err);
    throw err;
  }
}
