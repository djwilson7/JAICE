import { useSettings } from "@/pages/settings/provider/SettingsProvider";
import { motion } from "framer-motion";

export function PrimaryColumnDetails() {
  const {
    primaryColumnBehavior,
    selectedPrimaryColumn,
    setSelectedPrimaryColumn,
  } = useSettings();
  const columnTitleClass = "font-bold whitespace-nowrap";
  const isSeparate = primaryColumnBehavior === "separate";

  const standardColumns = {
    applied: { title: "Applied" },
    interview: { title: "Interview" },
    offer: { title: "Offer" },
  };

  const dynamicColumns = isSeparate
    ? {
        accepted: { title: "Accepted" },
        rejected: { title: "Rejected" },
      }
    : {
        acceptedRejected: { title: "Accepted / Rejected" },
      };

  const handleTitleClick = () => {
    if (selectedPrimaryColumn === "accepted") {
      setSelectedPrimaryColumn("rejected");
    } else {
      setSelectedPrimaryColumn("accepted");
    }
  };

  const titleVariants = {
    rest: { scale: 0.6, opacity: 0.6 },
    hover: { scale: 0.8, opacity: 0.8 },
    selected: { scale: 1, opacity: 1 },
  };

  return (
    <div>
      <div className="detail-text">
        {isSeparate ? (
          <small>
            <em>
              Keep Accepted and Rejected columns separate from each other.
            </em>
          </small>
        ) : (
          <small>
            <em>
              Cycle between Accepted and Rejected by tapping the column title.
            </em>
          </small>
        )}
      </div>
      <div className="demo-content-container">
        {Object.values(standardColumns).map((col) => (
          <div key={col.title} className="demo-column passive-column">
            <div className={`${columnTitleClass} mt-2`}>{col.title}</div>
            <hr className="header-split" />
            <div className="flex flex-col">
              <div className="demo-column-card">Content</div>
            </div>
          </div>
        ))}
        {Object.values(dynamicColumns).map((col) => (
          <div key={col.title} className={"demo-column-dynamic"}>
            <div
              className={`${columnTitleClass} mt-2`}
              onClick={handleTitleClick}
            >
              {col.title === "Accepted / Rejected" ? (
                <div className="w-full items-center justify-center flex gap-4 cursor-pointer">
                  <motion.div
                    variants={titleVariants}
                    initial="rest"
                    animate={
                      selectedPrimaryColumn === "accepted" ? "selected" : "rest"
                    }
                  >
                    Accepted
                  </motion.div>
                  <motion.div
                    variants={titleVariants}
                    initial="rest"
                    animate={
                      selectedPrimaryColumn === "rejected" ? "selected" : "rest"
                    }
                  >
                    Rejected
                  </motion.div>
                </div>
              ) : (
                <div>{col.title}</div>
              )}
            </div>
            <hr className="header-split" />
            <div className="flex flex-col">
              <div className="demo-column-card">
                {col.title !== "Accepted / Rejected"
                  ? col.title + " Content"
                  : "Showing " +
                    (selectedPrimaryColumn === "accepted"
                      ? "Accepted"
                      : "Rejected") +
                    " Content"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
