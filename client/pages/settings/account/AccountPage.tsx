import Button from "@/global-components/button";
import { getIdToken, logOut } from "@/global-services/auth";
import { useEffect, useState } from "react";
import { api } from "@/global-services/api";
import userIcon from "@/assets/icons/user.svg";
import { FloatingInputField } from "@/global-components/FloatingInputField";
import { DaysToSync } from "./account-components/DaysToSync";
import { useAuth } from "@/global-components/authContext";
import { useLocation, useNavigate } from "react-router-dom";
import { ChangePhotoModal } from "./account-components/ChangePhotoModal";
import { checkGmailStatus } from "@/pages/home/utils/checkGmailStatus";
import { UnlinkGmailModal } from "@/pages/settings/account/account-components/UnlinkGmailModal";
import { DeleteAccountModal } from "./account-components/DeleteAccountModal";
import {
  Section,
  SectionBody,
  SectionHeader,
  RowItem,
  Row
} from "./account-components/AccountSections";
import linkIcon from "@/assets/icons/link.svg";
import unlinkIcon from "@/assets/icons/unlink.svg";
// If Local (using docker, use the local url) else use prod url
// const BASE_URL = import.meta.env.VITE_API_BASE_URL_PROD;
const BASE_URL = import.meta.env.VITE_API_BASE_URL_LOCAL;

const GMAIL_CONSENT_URL =
  import.meta.env.VITE_GMAIL_CONSENT_URL ?? "/api/auth/consent";

export function AccountPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [busy, setBusy] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);
  // const [passwordError, setPasswordError] = useState<string | null>(null);
  // const [twoFAError, setTwoFAError] = useState<string | null>(null);
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

  const daysToSyncOptions = [3, 7, 14, 45];

  const { user, applyProfileUpdate } = useAuth();

  // const phoneNumber: string = user?.phoneNumber || "";
  const profilePicURL: string = user?.photoURL || "";

  const [firstNameField, setFirstNameField] = useState(
    user?.displayName?.split(" ")[0] || "Enter your first name"
  );
  const [lastNameField, setLastNameField] = useState(
    user?.displayName?.split(" ").slice(1).join(" ") || "Enter your last name"
  );
  // const [phoneNumberField, setPhoneNumberField] = useState<string>(phoneNumber);

  const handleFirstNameInput = (value: string) => {
    setFirstNameField(value);
  };

  const handleLastNameInput = (value: string) => {
    setLastNameField(value);
  };

  // const handlePhoneNumberInput = (value: string) => {
  //   setPhoneNumberField(value);
  //   console.log("Phone number input:", phoneNumberField);
  // };

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

  async function linkGmail(days: number = 14) {
    const res = await api("/api/auth/setup-rls-session", {
      method: "POST",
      body: JSON.stringify({ daysToSync: days }),
    });
    console.log("Setup RLS session response:", res);
    const token = await getIdToken();
    console.log(BASE_URL);
    console.log(GMAIL_CONSENT_URL);
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

      await api("/api/auth/logout", { method: "POST" });
      await logOut();

      setGmailConnected(false);
      navigate("/");
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

      await logOut();

      navigate("/");
    } catch (error) {
      console.error("Delete account error:", error);
      setDeleteAccountError("A network error occurred. Please try again.");
    }
  }

  // This was refactored for better readability on the page. It still needs updated to present on mobile devices.
  return (
    <div className="page-style bg-[var(--page-gradient)]">
      <div className="flex flex-col items-center p-8 gap-8 lg:flex-row lg:items-start">
        <Section>
          <SectionHeader title="Profile Settings" />
          <SectionBody>
            <div className="flex flex-row items-center justify-evenly mt-6 mb-2">
              <div className="w-24 h-24 rounded-full bg-[var(--card-border)] mb-4 aspect-square">
                <img
                  src={profilePicURL || userIcon}
                  alt="Profile Picture"
                  className="w-full h-full rounded-full object-cover p-0.5"
                />
              </div>
              <div className="flex flex-col gap-2 text-center items-center jusitfy-evenly">
                <div className="flex gap-4">
                  <Button onClick={() => handleShowChangePhotoModal()}>
                    Change
                  </Button>
                </div>
                <div className="text-sm font-light">
                  <small className="text-sm opacity-80 font-light">
                    Update your profile picture URL.
                  </small>
                </div>
              </div>
            </div>

            <div className="flex flex-col w-full my-4 gap-4">
              <form
                className="flex flex-col gap-4"
                onSubmit={handleSaveProfile}
              >
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
                <Button style={{ minWidth: "50%" }} type="submit">
                  Save Profile
                </Button>
              </form>
              {/* <FloatingInputField
                label="Phone Number"
                type="text"
                value={phoneNumberField}
                action={handlePhoneNumberInput}
                isValid={true}
              /> */}
              <div className="flex w-full justify-between items-center gap-4">
                <small
                  className="flex w-full text-sm text-red-400 text-left"
                  role="alert"
                >
                  {saveProfileError}
                </small>
              </div>
              <div className="flex w-full items-center justify-center my-2">
                <small className="text-sm text-red-400" role="alert"></small>
              </div>
            </div>
          </SectionBody>
        </Section>

        <Section>
          <SectionHeader title="Account Settings" />

          {/*Gmail Integration*/}
          <SectionBody>
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
                <Button onClick={handleShowModal} className={`${gmailButtonColor}`} >
                  <img 
                    src={gmailButtonIcon}
                    alt="Gmail Link Icon"
                    className="w-5 h-5 icon mr-2"
                  />
                  {gmailButtonText}
                </Button>
              </RowItem>
            </Row>

            {/* <Row rowError={passwordError || ""}>
              <RowItem>
                <FloatingInputField
                  label="Reset Password"
                  type="password"
                  value=""
                  action={() => console.log("User is entering new password.")}
                  isValid={true}
                  style={{ minWidth: "100%" }}
                />
              </RowItem>
              <RowItem>
                <Button
                  onClick={() => console.log("Change Password clicked")}
                  style={{ minWidth: "100%" }}
                >
                  Change
                </Button>
              </RowItem>
            </Row> */}

            {/* 2FA */}
            {/* <Row rowError={twoFAError || ""}>
              <RowItem>
                <div className="flex flex-col w-3/4">
                  <h3 className="text-lg text-left font-medium mt-4">
                    Two-Factor Authentication (2FA)
                  </h3>
                  <small className="text-sm text-left opacity-60 mb-4">
                    Enable 2FA to add an extra layer of security to your
                    account.
                  </small>
                </div>
              </RowItem>

              <RowItem>
                <div className="flex items-center justify-center w-1/4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      onChange={() => console.log("2FA toggled")}
                    />
                    <div
                      className="w-11 h-6 bg-gray-600 
                    rounded-full peer peer-focus:ring-blue-300 peer-checked:bg-blue-600 
                    after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:border-gray-300 
                    after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"
                    ></div>
                  </label>
                </div>
              </RowItem>
            </Row> */}
            {/* Delete Account */}
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
                  // disabled={busy}
                  aria-busy={busy}
                  // className="red"
                  className="red"
                >
                  {busy ? "Deleting..." : "Delete Account"}
                </Button>
              </RowItem>
            </Row>
          </SectionBody>
        </Section>
      </div>
      {/*Modals Overlays*/}
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
        onClose={() => setShowUnlinkGmailModal(false)}
        onConfirm={async () => {
          await handleGmailLinking();
          setShowUnlinkGmailModal(false);
        }}
      />
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={deleteAccount}
      />
    </div>
  );
}
