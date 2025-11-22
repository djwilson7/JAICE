interface EmptyColumnPlaceholderProps {
  title: string;
}

export function EmptyColumnPlaceholder({ title }: EmptyColumnPlaceholderProps) {
  var cardTitle = "No " + title + " Jobs";
  var description = "";

  switch (title.toLowerCase()) {
    case "applied":
      description = "Jobs that you have applied to will appear here.";
      break;
    case "interview":
      description = "Jobs that are in the interview stage will appear here.";
      break;
    case "offer":
      description = "Jobs that have extended offers will appear here.";
      break;
    case "accepted":
      description = "Jobs that you have accepted will appear here.";
      break;
    case "rejected":
      description =
        "Jobs that have rejected your application will appear here.";
      break;
  }

  return (
    <div className="flex flex-col w-full rounded-md bg-[var(--job-card-background)] p-4 gap-3 opacity-90">
      <h4 className="flex w-full justify-center">{cardTitle}</h4>
      <hr className="w-full border-t border-[var(--card-border)]"/>
      <small className="flex w-full text-left">
        {description}
      </small>
      <small className="flex w-full text-left italic opacity-50">
        You can drag existing cards here, or create new ones.
      </small>
    </div>
  );
}
