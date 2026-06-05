import Button from "@/global-components/button";
import { Modal } from "@/global-components/Modal";

export interface DaysToSyncOption {
  label: string;
  days: number;
}

interface DaysToSyncProps {
  show: boolean;
  options: DaysToSyncOption[];
  onSelection: (days: number) => void;
  onCancel: () => void;
}

// A component that displays a modal for selecting days to sync emails
export function DaysToSync({
  show,
  options,
  onSelection,
  onCancel,
}: DaysToSyncProps) {
  return (
    <Modal isOpen={show} onClose={onCancel} modalTitle="Link Gmail">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h3 className="primary-text">How far back should we look?</h3>
          <p className="secondary-text">
            Once your Gmail is linked, JAICE will go back through your inbox for
            the timeframe you pick. We only add emails that are job-related so
            you decide how much history we work with.
          </p>
        </div>
        <p className="primary-text">
          Thinking about your recent job search, how far back would you like us
          to look?
        </p>
      </div>
      <hr className="header-split" />
      <div className="flex flex-row w-full gap-2">
        {options.map((option) => (
          <div className="w-1/3" key={option.days}>
            <Button onClick={() => onSelection(option.days)} className="">
              <h4 className="whitespace-nowrap">{option.label}</h4>
            </Button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
