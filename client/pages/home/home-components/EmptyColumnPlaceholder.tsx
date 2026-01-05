interface EmptyColumnPlaceholderProps {
  title: string;
}

export function EmptyColumnPlaceholder({ title }: EmptyColumnPlaceholderProps) {
  var cardTitle = "No " + title + " Jobs";
  var description = "";
  var subText = "";

  switch (title.toLowerCase()) {
    case "applied":
      description = "Jobs that you have applied to will appear here.";
      subText =
        "You can add new applications by clicking the '+' button or dragging and dropping an existing card into this column.";
      break;
    case "interview":
      description = "Jobs that are in the interview stage will appear here.";
      subText =
        "You can add new applications by clicking the '+' button or dragging and dropping an existing card into this column.";

      break;
    case "offer":
      description = "Jobs that have extended offers will appear here.";
      subText =
        "You can add new applications by clicking the '+' button or dragging and dropping an existing card into this column.";

      break;
    case "accepted":
      description = "Jobs that you have accepted will appear here.";
      subText =
        "You can add new applications by clicking the '+' button or dragging and dropping an existing card into this column.";

      break;
    case "rejected":
      description =
        "Jobs that have rejected your application will appear here.";
      subText =
        "You can add new applications by clicking the '+' button or dragging and dropping an existing card into this column.";
      break;
    case "processing":
      description = "Jobs that are being processed will appear here.";
      subText =
        "As JAICE processes your applications, they will appear here while waiting to be sorted into the proper stage.";
      break;
    case "review":
      description = "Jobs that are under review will appear here.";
      subText =
        "If we are unsure about the stage of an application, it will appear here until reviewed.";
      break;
  }

  return (
    <div className="flex flex-col w-full rounded-md bg-[var(--job-card-background)] p-4 gap-3 opacity-90">
      <h4 className="flex w-full justify-center">{cardTitle}</h4>
      <hr className="w-full border-t border-[var(--card-border)]" />
      <small className="flex w-full align-center justify-center">{description}</small>
      <small className="flex w-full text-left italic opacity-50">
        {subText}
      </small>
    </div>
  );
}
