import openJobCardIcon from "@/assets/icons/job-card-open.svg";
import closeJobCardIcon from "@/assets/icons/job-card-close.svg";
import { useJobsLoader } from "@/pages/home/hooks/useJobsLoader";

export function ExpandCollapseButton() {
  // we need to derive state to know if any job cards are currently open.
  // We also need to be able to set open or closed for all job cards
  const { jobs, setJobs } = useJobsLoader();
  
  const toggleExpandCollapse = (isOpen: boolean) => {
    const updatedJobs = jobs.map((job) => ({
      ...job,
      isOpen: isOpen,
    }));
    setJobs(updatedJobs);
  };

  const expandAll = () => {
    toggleExpandCollapse(true);
  };

  const collapseAll = () => {
    toggleExpandCollapse(false);
  };

  return (
    <div className="flex gap-8 control-bar-container">
      <img
        src={openJobCardIcon}
        alt="Expand All"
        className="w-5 h-5 icon -rotate-90"
        onClick={expandAll}
      />
      <img
        src={closeJobCardIcon}
        alt="Collapse All"
        className="w-5 h-5 icon rotate-90"
        onClick={collapseAll}
      />
    </div>
  );
}
