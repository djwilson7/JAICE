import Button from "@/global-components/button";

export function SettingCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="settings-card flex w-full flex-col card">
      {children}
    </div>
  );
}

export function ButtonRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="settings-button-row">
      {children}
    </div>
  );
}

export function SettingButton({
  label,
  onClick,
  style,
  isSelected,
  title,
}: {
  label: string;
  onClick: () => void;
  style?: React.CSSProperties;
  isSelected?: boolean;
  title?: string;
}) {
  return (
    <Button
      className="settings-page-button w-full"
      isSelected={isSelected}
      style={style}
      onClick={onClick}
      title={title}
    >
      {label}
    </Button>
  );
}

export function SettingHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="settings-card-header">
      <h2 className="primary-text">{title}</h2>
      <small className="secondary-text">
        {description}
      </small>
    </div>
  );
}
