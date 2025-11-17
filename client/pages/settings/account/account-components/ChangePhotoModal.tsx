import { useAuth } from "@/global-components/AuthProvider";
import { HoverIconButton } from "@/global-components/button";
import xIcon from "@/assets/icons/x.svg";
import { FloatingInputField } from "@/global-components/FloatingInputField";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
interface ChangePhotoModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

export function ChangePhotoModal({
  showModal,
  setShowModal,
}: ChangePhotoModalProps) {
  if (!showModal) return null;
  const navigate = useNavigate();
  const location = useLocation();

  const { user, applyProfileUpdate } = useAuth();
  const [photoURL, setPhotoURL] = useState<string>(user?.photoURL || "");

  const handleSavePhoto = async () => {
    await applyProfileUpdate(undefined, photoURL);
    setShowModal(false);
    navigate(location.pathname);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="flex flex-col bg-black/80 p-6 rounded-lg shadow-lg w-1/3 gap-6">
        <div className="flex flex-row items-center justify-between px-2">
          <h2 className="text-xl font-semibold">Change Profile Photo</h2>

          <HoverIconButton
            onClick={() => setShowModal(false)}
            baseIcon={xIcon}
            hoverIcon={xIcon}
            successIcon={xIcon}
            failureIcon={xIcon}
            alt="Close Modal"
          />
        </div>

        <FloatingInputField
          label="URL to new profile photo"
          type="text"
          value={photoURL}
          isValid={null}
          action={setPhotoURL}
        />

        <button onClick={handleSavePhoto}>Save Photo</button>
      </div>
    </div>
  );
}
