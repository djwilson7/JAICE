import Button from "@/global-components/button";
import xIcon from "@/assets/icons/x.svg";
import { useState } from "react";
import { createPortal } from "react-dom";
interface DaysToSyncProps {
  show: boolean;
  options: number[];
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
  if (!show) return null;
  const [xButtonStyle, setXButtonStyle] = useState<String>("w-5 h-5");

  const handleEnterXButtonHover = () => {
    setXButtonStyle("w-8 h-8");
  };
  
  const handleLeaveXButtonHover = () => {
    setXButtonStyle("w-5 h-5");
  }

  return createPortal(
      <div className="fixed inset-0 flex items-center justify-center z-1000 modal-backdrop">
      <div className="flex relative flex-col p-6 w-1/3 gap-6 shadow modal">
        <div className="flex flex-row items-center justify-start">
          <h2 className="text-xl font-semibold primary-text">
            How far back should we sync your emails?
          </h2>

          <div className="flex absolute items-center justify-center top-0 right-0 m-4 w-8 h-8">
            <Button
              onClick={onCancel}
              className="roundSmall"
              onMouseEnter={handleEnterXButtonHover}
              onMouseLeave={handleLeaveXButtonHover}
              title="Close Modal"
            >
              <img
                src={xIcon}
                alt="Close Modal"
                className={xButtonStyle + " icon"}
              />
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 justify-center w-full">
          {options.map((days) => (
            <button
              key={days}
              onClick={() => onSelection(days)}
              className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors mb-2"
            >
              {days} days
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
