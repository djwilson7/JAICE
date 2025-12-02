import { useAuth } from "@/global-components/AuthProvider";
import Button, { HoverIconButton } from "@/global-components/button";
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

  const [xButtonStyle, setXButtonStyle] = useState<String>("w-5 h-5");

  const handleEnterXButtonHover = () => {
    setXButtonStyle("w-8 h-8");
  };

  const handleLeaveXButtonHover = () => {
    setXButtonStyle("w-5 h-5");
  };

  const handleSavePhoto = async () => {
    await applyProfileUpdate(undefined, photoURL);
    setShowModal(false);
    navigate(location.pathname);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-1000 modal-backdrop">
      <div className="flex relative flex-col p-6 w-1/3 gap-6 shadow modal">
        <div className="flex flex-row items-center justify-start">
          <h2 className="text-xl font-semibold primary-text">
            Change Profile Photo
          </h2>

          <div className="flex absolute items-center justify-center top-0 right-0 m-4 w-8 h-8">
            <Button
              onClick={() => setShowModal(false)}
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

        <div className="">
          <FloatingInputField
            label="URL to new profile photo"
            type="text"
            value={photoURL}
            isValid={null}
            action={setPhotoURL}
          />
        </div>
        <div className="flex w-1/2">
          <Button onClick={handleSavePhoto}>Save Photo</Button>
        </div>
      </div>
    </div>
  );
}
