import { useSettings } from "@/pages/settings/provider/settingsContext";
import { motion } from "framer-motion";

interface ColumnTitleProps {
  title: string;
  count: number;
}

const columnDescriptions = {
  Applied: "Applications you’ve sent out.",
  Interview: "Emails about interviews or next steps.",
  Offer: "Job offers sent your way.",
  Accepted: "Offers you’ve chosen to accept.",
  Rejected: "Applications that weren’t selected.",
  Processing: "Fresh emails that are being processed.",
  Review: "These applications need your review.",
};

export function ColumnTitle({ title, count }: ColumnTitleProps) {
  const headerClass =
    "flex w-full items-center justify-center overflow-hidden whitespace-nowrap text-ellipsis";
  const titleClass =
    "column-title-text w-full overflow-hidden whitespace-nowrap text-center text-ellipsis";
  const splitTitleClass =
    "column-title-text basis-1/2 overflow-hidden whitespace-nowrap text-center text-ellipsis";

  const {
    primaryColumnBehavior,
    selectedPrimaryColumn,
    setSelectedPrimaryColumn,
  } = useSettings();

  const isAcceptedOrRejected = title === "Accepted" || title === "Rejected";

  const isAccepted =
    title === "Accepted" && selectedPrimaryColumn.toLowerCase() === "accepted";
  const isRejected =
    title === "Rejected" && selectedPrimaryColumn.toLowerCase() === "rejected";

  const handleAcceptedRejectedClick = () => {
    switch (title.toLowerCase()) {
      case "rejected":
        setSelectedPrimaryColumn("accepted");
        break;
      case "accepted":
        setSelectedPrimaryColumn("rejected");
        break;
      default:
        break;
    }
  };

  const selectedTitleVariants = {
    atRest: { scale: 0.6, opacity: 0.6 },
    onHover: { scale: 0.8, opacity: 0.8 },
    isSelected: { scale: 1, opacity: 1 },
    isSelectedHover: { scale: 1, opacity: 0.9 },
  };

  const acceptedTitle = isAccepted ? "Cycle to Rejected" : "Show Accepted";
  const rejectedTitle = isRejected ? "Cycle to Accepted" : "Show Rejected";

  return (
    <div className="flex w-full flex-col items-center justify-center gap-[2px] overflow-hidden text-center">
      <div className={headerClass}>
        {primaryColumnBehavior === "unified" && isAcceptedOrRejected ? (
          <div
            onClick={handleAcceptedRejectedClick}
            className="flex w-full cursor-pointer overflow-hidden"
          >
            <motion.h2
              className={splitTitleClass}
              variants={selectedTitleVariants}
              initial="atRest"
              animate={isAccepted ? "isSelected" : "atRest"}
              whileHover={isAccepted ? "isSelectedHover" : "onHover"}
              title={acceptedTitle}
            >
              Accepted
            </motion.h2>
            <motion.h2
              className={splitTitleClass}
              variants={selectedTitleVariants}
              initial="atRest"
              animate={isRejected ? "isSelected" : "atRest"}
              whileHover={isRejected ? "isSelectedHover" : "onHover"}
              title={rejectedTitle}
            >
              Rejected
            </motion.h2>
          </div>
        ) : (
          <h2
            className={titleClass}
            title={columnDescriptions[title as keyof typeof columnDescriptions]}
          >
            {title}
          </h2>
        )}
      </div>
      <div className="flex w-full items-center justify-center">
        <small className="column-title-description w-full overflow-hidden whitespace-nowrap text-center text-ellipsis">
          {columnDescriptions[title as keyof typeof columnDescriptions]}
        </small>
      </div>
      <div className="mt-[2px] flex w-full items-center justify-center">
        <span className="column-title-count">{count}</span>
      </div>
    </div>
  );
}
