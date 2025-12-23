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
  const headerClass = "flex w-full items-center justify-center";

  return (
    <div className="flex flex-col w-full items-center justify-center">
      <div className={headerClass}>
        <div className="flex w-full items-center justify-center">
          <h2>{title}</h2>
        </div>
      </div>
      <div className="flex w-full items-center justify-center">
        <small className="text-center secondary-text">
          {columnDescriptions[title as keyof typeof columnDescriptions]}
        </small>
      </div>
    </div>
  );
}
