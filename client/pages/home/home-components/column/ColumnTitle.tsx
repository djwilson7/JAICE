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
  const headerClass = "flex w-full items-center justify-center whitespace-nowrap text-ellipsis";

  return (
    <div className="flex flex-col w-full items-center justify-center overflow-hidden">
      <div className={headerClass}>
        <h2 className="w-full whitespace-nowraptext-ellipsis">{title}</h2>
      </div>
      <div className="flex w-full items-center justify-center">
        <small className="w-full text-center secondary-text whitespace-nowrap text-ellipsis">
          {columnDescriptions[title as keyof typeof columnDescriptions]}
        </small>
      </div>
    </div>
  );
}
