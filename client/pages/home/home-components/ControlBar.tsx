// import { localfiles } from "@/directory/path/to/localimport";

import { CheckBoxToggle } from "@/global-components/CheckBoxToggle";
import { DropDownMenu } from "@/global-components/DropDownMenu";
import { SearchBar } from "@/global-components/SearchBar";
import filterIcon from "@/assets/icons/filter.svg";
// import infoIcon from "@/assets/icons/info.svg";
import checkIcon from "@/assets/icons/check-icon.svg";
import uncheckIcon from "@/assets/icons/uncheck-icon.svg";
import { AlertBox } from "@/pages/home/home-components/AlertBox";
// import { InfoModal } from "@/global-components/InfoModal";
// import { motion, AnimatePresence } from "framer-motion";
// import { HomeInfoContent } from "@/pages/home/home-components/HomePageInfo";
import { useEffect, useState } from "react";
import { checkGmailStatus } from "../utils/checkGmailStatus";
import { useNavigate } from "react-router";
import Button from "@/global-components/button";
import undoTrash from "@/assets/icons/trash-undo.svg";
import viewArchive from "@/assets/icons/folder.svg";

interface ControlBarProps {
  isMultiSelecting: boolean;
  setIsMultiSelecting: (value: boolean) => void;
  multiSelectLabel?: string;

  options: { value: string; label: string }[];
  isMenuOpen: boolean;
  selectedOption: string;
  setMenuOpen: (value: boolean) => void;
  setSelectedOption: (value: string) => void;

  setIsSearching: (value: boolean) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;

  isAlertOpen: boolean;
  setIsAlertOpen: (value: boolean) => void;
  alertMessage?: string;

  // infoModalLabel?: string;
  // isInfoModalOpen: boolean;
  // setInfoModalOpen: (value: boolean) => void;

  onOpenTrash?: () => void;
  onOpenArchive?: () => void;
}


export function ControlBar({
  isMultiSelecting,
  setIsMultiSelecting,
  multiSelectLabel,

  options,
  isMenuOpen,
  setMenuOpen,
  selectedOption,
  setSelectedOption,

  setIsSearching,
  searchQuery,
  setSearchQuery,

  isAlertOpen,
  setIsAlertOpen,
  alertMessage,

  // infoModalLabel,
  // isInfoModalOpen,
  // setInfoModalOpen,

  onOpenTrash,
  onOpenArchive,
}: ControlBarProps) {
  const navigate = useNavigate();
  const [gmailConnected, setGmailConnected] = useState(false);
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
        {!gmailConnected && (
          <div className="flex flex-row items-center justify-center">
            <div className="flex w-full p-2 items-center justify-evenly gap-4">
              <div className="flex flex-col">
                <h4 className="flex ">Your email isn't connected!</h4>
                <small className="flex">
                  To get the most out of JAICE, connect your email.
                </small>
              </div>
              <div className="flex">
                <Button onClick={() => navigate("/settings/account")}>
                  Settings
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* Interactive Functionality Components */}
        <div className="flex gap-4 justify-center items-center">
          <SearchBar
            setIsSearching={setIsSearching}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
          <DropDownMenu
            options={options}
            isOpen={isMenuOpen}
            selectedOption={selectedOption}
            setIsOpen={setMenuOpen}
            setSelectedOption={setSelectedOption}
            leftIcon={filterIcon}
          />
          {/* Mutli Select Toggle */}
          <CheckBoxToggle
            label={multiSelectLabel}
            inactiveIcon={uncheckIcon}
            activeIcon={checkIcon}
            isChecked={isMultiSelecting}
            setIsChecked={setIsMultiSelecting}
          />

          {/* Undo Trash Button */}
          <div>
            <button
              type="button"
              className="icon-button"
              title="View Trash"
              onClick={() => onOpenTrash?.()}
            >
              <img
                src={undoTrash}
                alt="Undo Trash Icon"
                className="w-5 h-5 icon"
              />
            </button>
          </div>

          {/* View Archive Button */}
          <div>
            <button
              type="button"
              aria-label="Archive Button"
              className="icon-button"
              title="View Archive"
              onClick={() => onOpenArchive?.()}
            >
              <img
                src={viewArchive}
                alt="View Archive Icon"
                className="w-5 h-5 icon"
              />
            </button>
          </div>

          {/* Info Modal Toggle */}
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
