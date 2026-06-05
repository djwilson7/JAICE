import type { JobCardType } from "@/types/jobCardType";

export const sortJobs = (
  selectedOption: string,
  list: JobCardType[]
): JobCardType[] => {
  switch (selectedOption) {
    case "new":
      return [...list].sort(
        (a, b) =>
          new Date(b.date ?? "").getTime() - new Date(a.date ?? "").getTime()
      );
    case "old":
      return [...list].sort(
        (a, b) =>
          new Date(a.date ?? "").getTime() - new Date(b.date ?? "").getTime()
      );
    case "az":
      return [...list].sort((a, b) => a.title.localeCompare(b.title));
    case "za":
      return [...list].sort((a, b) => b.title.localeCompare(a.title));

    default:
      return [...list];
  }
};
