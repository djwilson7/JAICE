import Button from "@/global-components/button";
import { getIdToken, logOut } from "@/global-services/auth";
import { useEffect, useState } from "react";
import { api } from "@/global-services/api";
import userIcon from "@/assets/icons/user.svg";
import { FloatingInputField } from "@/global-components/FloatingInputField";
import { DaysToSync, type DaysToSyncOption } from "./account-components/DaysToSync";
import { useAuth } from "@/global-components/authContext";
import { useLocation, useNavigate } from "react-router-dom";
import { ChangePhotoModal } from "./account-components/ChangePhotoModal";
import { checkGmailStatus } from "@/pages/home/utils/checkGmailStatus";
import { UnlinkGmailModal } from "@/pages/settings/account/account-components/UnlinkGmailModal";
import { DeleteAccountModal } from "./account-components/DeleteAccountModal";
import {
  RowItem,
  Row
} from "./account-components/AccountSections";
import {
  SettingCard,
  SettingHeader,
} from "@/pages/settings/display/display-components/Cards";
import linkIcon from "@/assets/icons/link.svg";
import unlinkIcon from "@/assets/icons/unlink.svg";
// If Local (using docker, use the local url) else use prod url
// const BASE_URL = import.meta.env.VITE_API_BASE_URL_PROD;
const BASE_URL = import.meta.env.VITE_API_BASE_URL_LOCAL;

const GMAIL_CONSENT_URL =
  import.meta.env.VITE_GMAIL_CONSENT_URL ?? "/api/auth/consent";

export function AccountSettings() {
  const navigate = useNavigate();
  const location = useLocation();

  const [busy, setBusy] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [saveProfileError, setSaveProfileError] = useState<string | null>(null);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(
    null
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showChangePhotoModal, setShowChangePhotoModal] = useState(false);

  const handleShowChangePhotoModal = () => {
    setShowChangePhotoModal(true);
  };

  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailBusy, setGmailBusy] = useState(false);
  const [showDaysToSync, setShowDaysToSync] = useState(false);
  const [showUnlinkGmailModal, setShowUnlinkGmailModal] = useState(false);

  const daysToSyncOptions: DaysToSyncOption[] = [
    { label: "1 month", days: 30 },
    { label: "3 months", days: 90 },
    { label: "6 months", days: 180 },
  ];

  const { user, applyProfileUpdate } = useAuth();

  const profilePicURL: string = user?.photoURL || "";

  const [firstNameField, setFirstNameField] = useState(
    user?.displayName?.split(" ")[0] || "Enter your first name"
  );
  const [lastNameField, setLastNameField] = useState(
    user?.displayName?.split(" ").slice(1).join(" ") || "Enter your last name"
  );
  const handleFirstNameInput = (value: string) => {
    setFirstNameField(value);
  };

  const handleLastNameInput = (value: string) => {
    setLastNameField(value);
  };

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSaveProfileError(null);

    if (!user) {
      setSaveProfileError("No user is currently signed in.");
      setBusy(false);
      return;
    }
    const fName = firstNameField.toLowerCase().trim();
    const lName = lastNameField.toLowerCase().trim();

    const fNameC = fName.charAt(0).toUpperCase() + fName.slice(1);
    const lNameC = lName.charAt(0).toUpperCase() + lName.slice(1);

    setFirstNameField(fNameC);
    setLastNameField(lNameC);

    try {
      await applyProfileUpdate(
        `${fNameC} ${lNameC}`.trim(),
        profilePicURL || ""
      );
      console.log("Profile updated successfully.");
      navigate(location.pathname);
    } catch (error) {
      console.error("Error updating profile:", error);
      setSaveProfileError("Failed to update profile. Please try again.");
    } 
  };
  // Get the inital Gmail connection status for the user when they load the page
  useEffect(() => {
    checkGmailStatus({ setGmailConnected, setGmailError });
  }, []);

  async function handleShowModal() {
    if (gmailConnected) {
      setShowUnlinkGmailModal(true);
    } else {
      setShowDaysToSync(true);
    }
  }

  // Handle the user's selection of days to sync from Gmail
  async function handleDaysSelection(days: number) {
    await handleGmailLinking(days);
  }

  // Handle linking or unlinking Gmail
  async function handleGmailLinking(days?: number) {
    if (gmailBusy) return;
    setGmailBusy(true);

    try {
      if (gmailConnected) {
        console.log("Unlinking Gmail...");
        const res = await unlinkGmail();
        if (res.status === "success") {
          setGmailConnected(false);
        }
      } else {
        console.log("Linking Gmail...");
        const res = await linkGmail(days);
        if (res.status === "success") {
          setGmailConnected(true);
        }
      }
      setGmailError(null);
    } catch (error) {
      console.error("Gmail link/unlink error:", error);
      setGmailError("Error processing Gmail link.");
    } finally {
      setShowDaysToSync(false);
      setGmailBusy(false);
    }
  }

  async function linkGmail(days: number = 180) {
    const res = await api("/api/auth/setup-rls-session", {
      method: "POST",
      body: JSON.stringify({ daysToSync: days }),
    });
    console.log("Setup RLS session response:", res);
    const token = await getIdToken();
    console.log(`Redirecting to Gmail consent flow for ${days} days of email sync.`);
    window.location.href = `${BASE_URL}${GMAIL_CONSENT_URL}?token=${token}&days=${days}`;
    return res;
  }

  async function unlinkGmail() {
    try {
      const revoke = await api("/api/auth/revoke-gmail-consent", {
        method: "POST",
      });

      if (revoke.status !== "success") {
        console.error("Failed to revoke Gmail consent:", revoke);
        setGmailError(
          "Unable to unlink your Gmail right now. Try again shortly."
        );
        return { status: "error" };
      }

      try {
        await api("/api/auth/logout", { method: "POST" });
      } catch (error) {
        console.error("Backend logout failed after unlinking Gmail:", error);
      } finally {
        try {
          await logOut();
        } finally {
          navigate("/", { replace: true });
        }
      }

      setGmailConnected(false);
      return { status: "success" };
    } catch (err) {
      console.error("Unlink Gmail error:", err);
      setGmailError("A network error occurred. Please try again.");
      return { status: "error" };
    }
  }

  // Determine the Gmail button text based on connection status and busy state
  const gmailButtonText = gmailBusy
    ? "Processing..."
    : gmailConnected
    ? "Unlink Gmail"
    : "Link Gmail";

  const gmailButtonIcon = gmailConnected ? unlinkIcon : linkIcon;
  const gmailButtonColor = gmailConnected ? "red" : "green";

  async function handleDelete() {
    setShowDeleteModal(true);
    return;
  }

  async function deleteAccount() {
    setDeleteAccountError(null);
    try {
      setBusy(true);

      const revoke = await api("/api/auth/revoke-gmail-consent", {
        method: "POST",
      });

      if (revoke.status !== "success") {
        setBusy(false);
        setDeleteAccountError("Failed to revoke Gmail access. Try again.");
        return;
      }

      const deletion = await api("/api/auth/delete-account", {
        method: "POST",
      });

      setBusy(false);

      if (deletion.status !== "success") {
        setDeleteAccountError(`Failed to delete account: ${deletion.message}`);
        return;
      }

      try {
        await logOut();
      } finally {
        navigate("/", { replace: true });
      }
    } catch (error) {
      console.error("Delete account error:", error);
      setBusy(false);
      setDeleteAccountError("A network error occurred. Please try again.");
    }
  }

  return (
    <>
      <div className="settings-card-grid settings-card-grid-account">
        <SettingCard>
          <SettingHeader
            title="Profile"
            description="Manage the name and profile image shown throughout JAICE."
          />
          <div className="settings-profile-summary">
            <div className="profile-picture-frame settings-profile-picture">
              <img
                src={profilePicURL || userIcon}
                alt="Profile"
                className="h-full w-full rounded-full object-cover"
              />
            </div>
            <div className="settings-profile-photo-action">
              <Button onClick={handleShowChangePhotoModal}>Change Photo</Button>
              <small className="secondary-text">
                Use a publicly accessible image URL.
              </small>
            </div>
          </div>

          <form className="settings-profile-form" onSubmit={handleSaveProfile}>
            <FloatingInputField
              label="First Name"
              type="text"
              value={firstNameField}
              action={handleFirstNameInput}
              isValid={true}
            />
            <FloatingInputField
              label="Last Name"
              type="text"
              value={lastNameField}
              action={handleLastNameInput}
              isValid={true}
            />
            <Button type="submit">Save Profile</Button>
          </form>

          {saveProfileError && (
            <small className="red-text settings-inline-error" role="alert">
              {saveProfileError}
            </small>
          )}
        </SettingCard>

        <SettingCard>
          <SettingHeader
            title="Connected Services & Account"
            description="Manage Gmail automation and permanent account actions."
          />
          <div className="settings-account-rows">
            <Row rowError={gmailError || ""}>
              <RowItem>
                <div className="flex flex-col">
                  <h3 className="text-lg text-left font-medium">
                    Gmail Integration
                  </h3>
                  <small className="text-sm text-left opacity-60 ">
                    Connect your Gmail account to allow email parsing and
                    analysis.
                  </small>
                </div>
              </RowItem>
              <RowItem>
                <Button onClick={handleShowModal} className={gmailButtonColor}>
                  <img
                    src={gmailButtonIcon}
                    alt="Gmail Link Icon"
                    className="w-5 h-5 icon mr-2"
                  />
                  {gmailButtonText}
                </Button>
              </RowItem>
            </Row>

            <Row rowError={deleteAccountError || ""}>
              <RowItem>
                <div className="flex flex-col">
                  <h3 className="text-lg text-left font-medium">
                    Delete your JAICE account?
                  </h3>
                  <small className="text-sm text-left opacity-60 ">
                    This will permanently delete your account and all associated
                    data.
                  </small>
                </div>
              </RowItem>

              <RowItem>
                <Button
                  onClick={handleDelete}
                  aria-busy={busy}
                  className="red"
                >
                  {busy ? "Deleting..." : "Delete Account"}
                </Button>
              </RowItem>
            </Row>
          </div>
        </SettingCard>
      </div>

      <DaysToSync
        show={showDaysToSync}
        options={daysToSyncOptions}
        onSelection={handleDaysSelection}
        onCancel={() => setShowDaysToSync(false)}
      />
      <ChangePhotoModal
        showModal={showChangePhotoModal}
        setShowModal={setShowChangePhotoModal}
      />
      <UnlinkGmailModal
        isOpen={showUnlinkGmailModal}
        isProcessing={gmailBusy}
        error={gmailError}
        onClose={() => setShowUnlinkGmailModal(false)}
        onConfirm={async () => {
          await handleGmailLinking();
          setShowUnlinkGmailModal(false);
        }}
      />
      <DeleteAccountModal
        isOpen={showDeleteModal}
        isProcessing={busy}
        error={deleteAccountError}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={deleteAccount}
      />
    </>
  );
}
