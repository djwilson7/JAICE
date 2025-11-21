import Button from "@/global-components/button";

export function CardSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col w-full md:w-1/2 gap-4 p-4">
      {children}
    </div>
  );
} 

export function SettingCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-xl w-full gap-4 p-4 bg-black/50 shadow-lg">
      {children}
    </div>
  );
}

export function ButtonRow({children}: {children: React.ReactNode}) {
  return (
    <div className="flex flex-row w-full justify-between px-4 gap-2">
      {children}
    </div>
  );
}

export function SettingButton({
  label,
  onClick,
  style,
  className,
}: {
  label: string;
  onClick: () => void;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <Button className={className} style={style} onClick={onClick}>
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
      <h2 className="">{title}</h2>
      <small className="flex w-full text-center justify-center">
        {description}
      </small>
      <hr className="border-t border-white/20" />
    </div>
  );
}