// import { localfiles } from "@/directory/path/to/localimport";

import { CheckBoxToggle } from "@/global-components/CheckBoxToggle";
import { DropDownMenu } from "@/global-components/DropDownMenu";
import { SearchBar } from "@/global-components/SearchBar";
import filterIcon from "@/assets/icons/filter.svg";
import infoIcon from "@/assets/icons/info.svg";
import checkIcon from "@/assets/icons/check-icon.svg";
import uncheckIcon from "@/assets/icons/uncheck-icon.svg";
import { AlertBox } from "@/pages/home/home-components/AlertBox";
import { InfoModal } from "@/global-components/InfoModal";
import { motion, AnimatePresence } from "framer-motion";
import { HomeInfoContent } from "@/pages/home/home-components/HomePageInfo";

interface ControlBarProps {
  isMultiSelecting: boolean;
  setIsMultiSelecting: (value: boolean) => void;
  multiSelectLabel?: string;

  options: { value: string; label: string }[];
  isMenuOpen: boolean;
  selectedOption: string;
  setMenuOpen: (value: boolean) => void;
  setSelectedOption: (value: string) => void;

  isSearching: boolean;
  setIsSearching: (value: boolean) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;

  isAlertOpen: boolean;
  setIsAlertOpen: (value: boolean) => void;
  alertMessage?: string;

  infoModalLabel?: string;
  isInfoModalOpen: boolean;
  setInfoModalOpen: (value: boolean) => void;
}

/**
 * Control Bar Component
 *
 * A custom home screen component. It includes the following icons: Alert, Search, Filter, Checkbox, and Info Icons.
 * Each icon expands when hovered to reveal its functionality.
 *
 * @param isMultiSelecting    - Boolean indicating if multi-select mode is active
 * @param setIsMultiSelecting - Function to update the multi-select state
 * @param multiSelectLabel    - Optional label to display next to the multi-select checkbox
 * @param options             - Array of option objects with value and label for the menu selector
 * @param isOpen              - Boolean indicating if the menu selector is open
 * @param setIsOpen           - Function to update the open state of the menu selector
 * @param selectedOption      - Currently selected option value in the menu selector
 * @param setSelectedOption   - Function to update the selected option in the menu selector
 * @param isSearching         - Boolean indicating if the search bar is active
 * @param setIsSearching      - Function to update the searching state
 * @param searchQuery         - Current value of the search query
 * @param setSearchQuery      - Function to update the search query
 * @param isAlertOpen         - Boolean indicating if the alert box is visible
 * @param setIsAlertOpen      - Function to update the alert box visibility
 * @param alertMessage        - Optional message to display in the alert box
 * @param infoModalLabel      - Optional label for the info modal toggle
 * @param isInfoModalOpen     - Boolean indicating if the info modal is open
 * @param setIsInfoModalOpen  - Function to update the info modal open state
 * 
 * @returns A control bar containing interactive components for user alerts, searching, filtering, multi-select toggling, and information modal access.
 */
export function ControlBar({
  isMultiSelecting,
  setIsMultiSelecting,
  multiSelectLabel,

  options,
  isMenuOpen,
  setMenuOpen,
  selectedOption,
  setSelectedOption,

  isSearching,
  setIsSearching,
  searchQuery,
  setSearchQuery,

  isAlertOpen,
  setIsAlertOpen,
  alertMessage,

  infoModalLabel,
  isInfoModalOpen,
  setInfoModalOpen,
}: ControlBarProps) {
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
        <div className="flex gap-4 justify-center items-center">
          <SearchBar
            isSearching={isSearching}
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

          {/* Info Modal Toggle */}
          <CheckBoxToggle
            label={infoModalLabel}
            inactiveIcon={infoIcon}
            activeIcon={infoIcon}
            isChecked={isInfoModalOpen}
            setIsChecked={() => setInfoModalOpen(!isInfoModalOpen)}
          />
        </div>
      </div>

      {/* Info Modal: Nested near it's trigger, although it's fixed position removes it from the control bar hierarchy */}
      <AnimatePresence>
        {isInfoModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <InfoModal title={"Home Page Info"} setIsOpen={setInfoModalOpen} content={<HomeInfoContent />}></InfoModal>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
