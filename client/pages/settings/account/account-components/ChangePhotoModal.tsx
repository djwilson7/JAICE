import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/global-components/authContext";
import { Modal } from "@/global-components/Modal";
import userIcon from "@/assets/icons/user.svg";

interface ChangePhotoModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

export function ChangePhotoModal({
  showModal,
  setShowModal,
}: ChangePhotoModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, applyProfileUpdate } = useAuth();
  const [photoURL, setPhotoURL] = useState(user?.photoURL || "");
  const [previewLoaded, setPreviewLoaded] = useState(Boolean(user?.photoURL));
  const [previewFailed, setPreviewFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const normalizedPhotoURL = photoURL.trim();

  useEffect(() => {
    if (!showModal) return;

    const currentPhotoURL = user?.photoURL || "";
    setPhotoURL(currentPhotoURL);
    setPreviewLoaded(Boolean(currentPhotoURL));
    setPreviewFailed(false);
    setIsSaving(false);
    setSaveError(null);
  }, [showModal, user?.photoURL]);

  const handlePhotoURLChange = (value: string) => {
    setPhotoURL(value);
    setPreviewLoaded(false);
    setPreviewFailed(false);
    setSaveError(null);
  };

  const handleSavePhoto = async () => {
    if (!normalizedPhotoURL || !previewLoaded || previewFailed || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await applyProfileUpdate(undefined, normalizedPhotoURL);
      setShowModal(false);
      navigate(location.pathname);
    } catch (error) {
      console.error("Failed to update profile photo:", error);
      setSaveError("The profile photo could not be saved. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!showModal) return null;

  return (
    <Modal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      modalTitle="Change Profile Photo"
      primaryAction={{
        label: isSaving ? "Saving..." : "Save",
        onClick: handleSavePhoto,
        className: "green",
        disabled:
          !normalizedPhotoURL || !previewLoaded || previewFailed || isSaving,
      }}
    >
      <div className="change-photo-modal-body">
        <div className="change-photo-preview-section">
          <div
            className={`change-photo-preview ${
              previewFailed ? "change-photo-preview-error" : ""
            } profile-picture-frame`}
          >
            {previewFailed ? (
              <img src={userIcon} alt="Default profile photo preview" />
            ) : (
              <img
                key={normalizedPhotoURL}
                src={normalizedPhotoURL || userIcon}
                alt="Profile photo preview"
                onLoad={() => {
                  if (normalizedPhotoURL) {
                    setPreviewLoaded(true);
                    setPreviewFailed(false);
                  }
                }}
                onError={() => {
                  setPreviewLoaded(false);
                  setPreviewFailed(true);
                }}
              />
            )}
          </div>
          <div className="change-photo-preview-copy">
            <strong>Profile preview</strong>
            <span>This is how your photo will appear throughout JAICE.</span>
          </div>
        </div>

        <label className="change-photo-field">
          <span className="change-photo-field-label">Profile photo URL</span>
          <input
            type="url"
            className="change-photo-field-control"
            value={photoURL}
            onChange={(event) => handlePhotoURLChange(event.target.value)}
            placeholder="https://example.com/profile-photo.jpg"
            autoComplete="url"
          />
        </label>

        {previewFailed && normalizedPhotoURL && (
          <p className="change-photo-message change-photo-message-error" role="alert">
            This image could not be loaded. Check that the URL points directly
            to a public image.
          </p>
        )}

        {saveError && (
          <p className="change-photo-message change-photo-message-error" role="alert">
            {saveError}
          </p>
        )}

        <p className="change-photo-help">
          Use a direct, publicly accessible image URL. The preview must load
          successfully before it can be saved.
        </p>
      </div>
    </Modal>
  );
}
