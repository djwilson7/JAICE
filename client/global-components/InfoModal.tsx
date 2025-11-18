
// import { localfiles } from "@/directory/path/to/localimport";
import  { PlaceHolderContent } from "@/global-components/PlaceHolderText";

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
  //defined to be fixed in size and centered on the bottom half of the pages viewport.
  const modalStyle: React.CSSProperties = {
    position: "fixed",
    bottom: "2rem", //1 rem from bottom edge of viewport
    right: "2rem", //2 rem from right edge of viewport
    height: "60vh", //30% of viewport height
    margin: "0 0 0 7rem",
    maxHeight: "40rem", //max height of 40rem
    minHeight: "20rem", //min height of 20rem
    maxWidth: "60rem", //max width of 60rem
    minWidth: "40rem", //min width of 40rem
    borderRadius: "0.5rem",
    outline: "none",
    backgroundColor: "rgba(var(--color-bg-rgb), 0.5)",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxShadow: "0 0 5px rgba(255, 255, 255, 0.3)",
    zIndex: 90,
  };

  return (
    <div style={modalStyle} className="backdrop-blur-md">
      {/* Header with Title and Close Button */}
      <div className="flex justify-between p-4 items-center w-full">
        <h2 className="whitespace-nowrap">{title || "Info Modal Title (EX: Home Info)"}</h2>
        <p onClick={() => setIsOpen(false)}>X</p>
      </div>
      <hr className="w-full mb-1 border-white/20" />
      
      {/* Content Area */}
      <div className="overflow-y-auto overflow-hidden">
        {content || <PlaceHolderContent />}
      </div>
    </div>
  );
}




