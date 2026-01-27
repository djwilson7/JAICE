import { useSettings } from "@/pages/settings/provider/SettingsProvider";
import { motion } from "framer-motion";

interface ColumnTitleProps {
  title: string;
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

export function ColumnTitle({ title }: ColumnTitleProps) {
  const headerClass =
    "flex w-full items-center justify-center whitespace-nowrap text-ellipsis";

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
    <div className="flex flex-col w-full items-center justify-center overflow-hidden">
      <div className={headerClass}>
        {primaryColumnBehavior === "unified" && isAcceptedOrRejected ? (
          <div
            onClick={handleAcceptedRejectedClick}
            className="cursor-pointer flex gap-4"
          >
            <motion.h2
              className="whitespace-nowrap text-ellipsis w-full text-center"
              variants={selectedTitleVariants}
              initial="atRest"
              animate={isAccepted ? "isSelected" : "atRest"}
              whileHover={isAccepted ? "isSelectedHover" : "onHover"}
              title={acceptedTitle}
            >
              Accepted
            </motion.h2>
            <motion.h2
              className="whitespace-nowrap text-ellipsis w-full text-center"
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
            className="w-full whitespace-nowraptext-ellipsis"
            title={columnDescriptions[title as keyof typeof columnDescriptions]}
          >
            {title}
          </h2>
        )}
      </div>
      <div className="flex w-full items-center justify-center">
        <small className="w-full text-center secondary-text whitespace-nowrap text-ellipsis">
          {columnDescriptions[title as keyof typeof columnDescriptions]}
        </small>
      </div>
    </div>
  );
}
