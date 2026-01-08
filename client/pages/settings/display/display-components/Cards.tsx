import Button from "@/global-components/button";

export function SettingCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col w-full card shadow"
    >
      {children}
    </div>
  );
}

export function ButtonRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row w-full justify-evenly px-1 gap-1 lg:gap-4">
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
    <Button className="w-full" isSelected={isSelected} style={style} onClick={onClick} title={title}>
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
    <div className="flex flex-col w-full gap-4">
      <h2 className="primary-text">{title}</h2>
      <small className="flex w-full text-center secondary-text justify-center">
        {description}
      </small>
        <hr className="header-split"/>
    </div>
  );
}
