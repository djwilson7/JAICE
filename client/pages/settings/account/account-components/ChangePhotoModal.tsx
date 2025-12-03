import { useAuth } from "@/global-components/AuthProvider";
import Button from "@/global-components/button";
import { FloatingInputField } from "@/global-components/FloatingInputField";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Modal } from "@/global-components/Modal";

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
    <Modal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      modalTitle="Change Profile Photo"
    >
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h3 className="primary-text">
            Set a new profile URL for your account.
          </h3>
          <p className="secondary-text">
            This photo is only visible to you within JAICE and helps personalize
            your experience.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <FloatingInputField
            label="Profile Photo URL"
            type="text"
            value={photoURL}
            isValid={null}
            action={setPhotoURL}
          />
          <small className="secondary-text">
            You can use any image hosting service to upload your photo and get a
            direct image URL. If the image is already online, just right-click
            it, choose “Copy image address,” paste the link here, and hit Save.
          </small>
        </div>
      </div>
      <hr className="header-split" />
      <div className="flex flex-row justify-center gap-4 mt-4 w-1/2">
        <Button onClick={handleSavePhoto} className="green">
          <h4>Save Photo</h4>
        </Button>
      </div>
    </Modal>
  );
}
