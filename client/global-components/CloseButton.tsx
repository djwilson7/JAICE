import xIcon from "@/assets/icons/x.svg";
import Button from "@/global-components/button";

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex items-center justify-center top-0 right-0 m-4 w-8 h-8">
      <Button onClick={onClick} className="roundSmall" title="Close">
        <img src={xIcon} alt="Close" className="icon" />
      </Button>
    </div>
  );
}
