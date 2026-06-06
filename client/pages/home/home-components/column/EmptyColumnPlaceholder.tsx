interface EmptyColumnPlaceholderProps {
  title: string;
}

export function EmptyColumnPlaceholder({ title }: EmptyColumnPlaceholderProps) {
  return (
    <div className="empty-column-placeholder">
      <p className="job-card-title-text empty-column-placeholder-title">
        No {title.toLowerCase()} emails
      </p>
      <p className="job-card-body-text empty-column-placeholder-copy">
        Jobs in the {title.toLowerCase()} stage will get inserted here.
      </p>
      <p className="job-card-body-text empty-column-placeholder-action">
        Add or drop an email card here.
      </p>
    </div>
  );
}
