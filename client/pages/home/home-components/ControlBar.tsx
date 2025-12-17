// import { localfiles } from "@/directory/path/to/localimport";

import { CheckBoxToggle } from "@/global-components/CheckBoxToggle";
import { DropDownMenu } from "@/global-components/DropDownMenu";
import { SearchBar } from "@/global-components/SearchBar";
import filterIcon from "@/assets/icons/filter.svg";
// import infoIcon from "@/assets/icons/info.svg";
import checkIcon from "@/assets/icons/check-icon.svg";
import uncheckIcon from "@/assets/icons/uncheck-icon.svg";
import unlinkIcon from "@/assets/icons/unlink.svg";
import { AlertBox } from "@/pages/home/home-components/AlertBox";
// import { InfoModal } from "@/global-components/InfoModal";
// import { motion, AnimatePresence } from "framer-motion";
// import { HomeInfoContent } from "@/pages/home/home-components/HomePageInfo";
import undoTrash from "@/assets/icons/trash-undo.svg";
import viewArchive from "@/assets/icons/folder.svg";
import { ControlBarButton } from "@/pages/home/home-components/ControlBarButton";
import { useEffect, useState } from "react";
import { checkGmailStatus } from "../utils/checkGmailStatus";

interface ControlBarProps {
  isMultiSelecting: boolean;
  setIsMultiSelecting: (value: boolean) => void;

  options: { value: string; label: string }[];
  selectedOption: string;
  setSelectedOption: (value: string) => void;

  searchQuery: string;
  setSearchQuery: (value: string) => void;

  isAlertOpen: boolean;
  setIsAlertOpen: (value: boolean) => void;
  alertMessage?: string;

  setConnectEmailOpen: (value: boolean) => void;
  // infoModalLabel?: string;
  // isInfoModalOpen: boolean;
  // setInfoModalOpen: (value: boolean) => void;

  onOpenTrash?: () => void;
  onOpenArchive?: () => void;
}

export function ControlBar({
  isMultiSelecting,
  setIsMultiSelecting,

  options,
  selectedOption,
  setSelectedOption,

  searchQuery,
  setSearchQuery,

  isAlertOpen,
  setIsAlertOpen,
  alertMessage,

  setConnectEmailOpen,
  // infoModalLabel,
  // isInfoModalOpen,
  // setInfoModalOpen,

  onOpenTrash,
  onOpenArchive,
}: ControlBarProps) {
  const [gmailConnected, setGmailConnected] = useState<boolean>(false); // Placeholder for actual gmail connection status
  const [gmailError, setGmailError] = useState<string | null>(null);
  
  useEffect(() => {
    checkGmailStatus({ setGmailConnected, setGmailError });
  }, []);
  
  return (
    <div className="w-full h-[50px] justify-start">
      {/* Control Bar Container */}

      <div className="w-full min-w-[63rem] h-[50px] flex items-center justify-between gap-4">
        {/* Inner Container for alignment and spacing */}

        {/* Read Only Components */}
        <div className="">
          <AlertBox
            isOpen={isAlertOpen}
            setIsOpen={setIsAlertOpen}
            alertMessage={alertMessage}
          />
        </div>

        {/* Interactive Functionality Components */}
        <div className="flex relative gap-4 h-full justify-center items-center">
          {!gmailConnected && (
            <ControlBarButton
              onClick={() => setConnectEmailOpen(true)}
              icon={unlinkIcon}
              iconHoverColor={"redIcon"}
              label="Connect Email"
              prominent={true}
            />
          )}

          <SearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          <ControlBarButton
            onClick={() => onOpenArchive?.()}
            icon={viewArchive}
            iconHoverColor={"orangeIcon"}
            label="Archive"
          />

          <ControlBarButton
            onClick={() => onOpenTrash?.()}
            icon={undoTrash}
            iconHoverColor={"redIcon"}
            label="Trash"
          />

          <CheckBoxToggle
            label={"Multi-Select"}
            inactiveIcon={uncheckIcon}
            activeIcon={checkIcon}
            isChecked={isMultiSelecting}
            setIsChecked={setIsMultiSelecting}
          />

          <DropDownMenu
            options={options}
            selectedOption={selectedOption}
            setSelectedOption={setSelectedOption}
            leftIcon={filterIcon}
          />

          {/* <CheckBoxToggle
            label={infoModalLabel}
            inactiveIcon={infoIcon}
            activeIcon={infoIcon}
            isChecked={isInfoModalOpen}
            setIsChecked={() => setInfoModalOpen(!isInfoModalOpen)}
          /> */}
        </div>
      </div>

      {/* Info Modal: Nested near it's trigger, although it's fixed position removes it from the control bar hierarchy */}
      {/* <AnimatePresence>
        {isInfoModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <InfoModal
              title={"Home Page Info"}
              setIsOpen={setInfoModalOpen}
              content={<HomeInfoContent />}
            ></InfoModal>
          </motion.div>
        )}
      </AnimatePresence> */}
    </div>
  );
}
