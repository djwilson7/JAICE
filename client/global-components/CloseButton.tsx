import xIcon from "@/assets/icons/x.svg";
import Button from "@/global-components/button";

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex absolute items-center justify-center top-1 right-0 w-8 h-8">
      <Button onClick={onClick} className="roundSmall" title="Close">
        <img src={xIcon} alt="Close" className="icon" />
      </Button>
    </div>
  );
}
