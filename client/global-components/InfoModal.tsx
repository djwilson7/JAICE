
// import { localfiles } from "@/directory/path/to/localimport";
import  { PlaceHolderContent } from "@/global-components/PlaceHolderText";
import { Modal } from "@/global-components/Modal";

// Define the props for the InfoModal component
interface InfoModalProps {
  title?: string; // Optional title prop
  content?: React.ReactNode; // Optional content prop
  setIsOpen: (value: boolean) => void; // Function to control modal visibility
}

// The info modal component
// It is a fixed size and positioned in the bottom right of the viewport
// It has a semi-transparent background with a blur effect for increased visibility
export function InfoModal({ title, content, setIsOpen }: InfoModalProps) {
  return (
    <Modal
      isOpen
      onClose={() => setIsOpen(false)}
      modalTitle={title || "Info Modal Title (EX: Home Info)"}
      className="w-lg"
    >
      <div className="overflow-y-auto overflow-hidden">
        {content || <PlaceHolderContent />}
      </div>
    </Modal>
  );
}




