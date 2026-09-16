"use client";
import styles from "./Settings.module.css";
import { useEffect, useState } from "react";
import { CompanySettings } from "@/types";
import { blobToDataUrl, uploadStampToGoogleDrive } from "@/lib/googleDrive";
import { changePassword, getCloudUrl, getStamp } from "@/lib/cloudApi";

type Props = {
  company: CompanySettings;
  set: (k: keyof CompanySettings, v: string) => void;
  onSave: (company: CompanySettings) => Promise<void>;
  username: string;
  onPasswordChanged: () => void;
};
export function Settings({
  company,
  set,
  onSave,
  username,
  onPasswordChanged,
}: Props) {
  const [draft, setDraft] = useState(company);
  const [driveBusy, setDriveBusy] = useState(false);
  const [driveMessage, setDriveMessage] = useState("");
  const [pendingStamp, setPendingStamp] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setDraft(company);
    if (!company.googleDriveUploadUrl && getCloudUrl())
      setDraft((c) => ({ ...c, googleDriveUploadUrl: getCloudUrl() }));
  }, [company]);
  const setDraftValue = (k: keyof CompanySettings, v: string) =>
    setDraft((c) => ({ ...c, [k]: v }));
  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  };
  const selectStamp = async (file: File | undefined) => {
    if (!file) return;
    setDriveMessage("");
    setPendingStamp(file);
    setPreviewUrl(await blobToDataUrl(file));
  };
  const upload = async () => {
    if (!pendingStamp) {
      setDriveMessage("Choose a stamp image first.");
      return;
    }
    const driveUrl = (draft.googleDriveUploadUrl || getCloudUrl()).trim();
    if (!driveUrl) {
      setDriveMessage("Connect the Google Apps Script Web App URL first.");
      return;
    }
    setDriveBusy(true);
    setDriveMessage("Uploading stamp to Google Drive…");
    try {
      const uploaded = await uploadStampToGoogleDrive(
        driveUrl,
        pendingStamp,
        draft.stampDriveFileId,
      );
      const stamp = uploaded?.url ? uploaded : await getStamp(driveUrl);
      if (stamp?.url) {
        const next = {
          ...draft,
          stampImage: stamp.url,
          stampDriveFileId: stamp.fileId,
          stampDriveFolderId: stamp.folderId,
        };
        setDraft(next);
        await onSave(next);
      }
      setDriveMessage(
        "✓ Stamp saved to Google Drive and linked to the invoice.",
      );
      setPendingStamp(null);
      setPreviewUrl("");
    } catch (error) {
      setDriveMessage(
        `Drive upload failed: ${error instanceof Error ? error.message : "Unknown error"}.`,
      );
    } finally {
      setDriveBusy(false);
    }
  };
  const updatePassword = async () => {
    if (!oldPassword || newPassword.length < 8) {
      setPasswordMessage(
        "Enter the current password and a new password of at least 8 characters.",
      );
      return;
    }
    setPasswordBusy(true);
    setPasswordMessage("");
    try {
      await changePassword(oldPassword, newPassword);
      setOldPassword("");
      setNewPassword("");
      setPasswordMessage("✓ Password changed successfully.");
      onPasswordChanged();
    } catch (error) {
      setPasswordMessage(
        error instanceof Error ? error.message : "Unable to change password.",
      );
    } finally {
      setPasswordBusy(false);
    }
  };
  const fields = [
    "name",
    "tagline",
    "address",
    "phone",
    "email",
    "gstin",
    "state",
    "stateCode",
    "pan",
    "bankHolder",
    "bankName",
    "accountNo",
    "branch",
    "ifsc",
    "jurisdiction",
  ] as (keyof CompanySettings)[];
  return (
    <section className={`${styles["page"]} ${styles["settings"]}`}>
      <p className={styles["eyebrow"]}>COMPANY PROFILE</p>
      <h1>Deal Magsil Settings</h1>
      <p className={styles["muted"]}>
        Edit company information and click Save Company to publish changes to
        Google Sheets.
      </p>
      <div className={styles["settings-grid"]}>
        {fields.map((k) => (
          <label className={`${styles["field"]} ${k === "address" ? styles["full"] : ""}`} key={k}>
            <span>
              {String(k)
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (s) => s.toUpperCase())}
            </span>
            {k === "address" ? (
              <textarea
                value={draft[k]}
                onChange={(e) => setDraftValue(k, e.target.value)}
              />
            ) : (
              <input
                value={draft[k]}
                onChange={(e) => setDraftValue(k, e.target.value)}
              />
            )}
          </label>
        ))}
        <div className={`${styles["panel"]} ${styles["full"]}`}>
          <div className={styles["panel-head"]}>
            <div>
              <h2>Company Changes</h2>
              <span>
                Changes are not sent to Google Sheets until you click Save
                Company.
              </span>
            </div>
            <button className={styles["primary"]} disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save Company"}
            </button>
          </div>
        </div>
        <div className={`${styles["panel"]} ${styles["full"]}`}>
          <div className={styles["panel-head"]}>
            <div>
              <h2>Account</h2>
              <span>Signed in as {username}</span>
            </div>
          </div>
          <div className={styles["settings-grid"]}>
            <label className={styles["field"]}>
              <span>Current Password</span>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </label>
            <label className={styles["field"]}>
              <span>New Password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>
            <button
              className={styles["primary"]}
              disabled={passwordBusy}
              onClick={updatePassword}
            >
              {passwordBusy ? "Changing…" : "Change Password"}
            </button>
          </div>
          {passwordMessage && (
            <p className={styles["drive-message"]}>{passwordMessage}</p>
          )}
        </div>
        <div className={`${styles["drive-setting"]} ${styles["full"]}`}>
          <div>
            <b>Simple Google Drive Stamp Backup</b>
            <p>
              No OAuth Client ID is required. Paste the Google Apps Script Web
              App URL once.
            </p>
          </div>
          <label className={styles["field"]}>
            <span>Google Drive Upload URL</span>
            <input
              value={draft.googleDriveUploadUrl || getCloudUrl()}
              onChange={(e) =>
                setDraftValue("googleDriveUploadUrl", e.target.value)
              }
              placeholder="https://script.google.com/macros/s/.../exec"
            />
          </label>
          <div className={styles["drive-status"]}>
            <span>
              {draft.googleDriveUploadUrl || getCloudUrl()
                ? "✓ Drive Web App configured"
                : "○ Drive Web App not configured"}
            </span>
            <span>
              {draft.stampImage ? "✓ Cloud stamp ready" : "○ No stamp selected"}
            </span>
          </div>
        </div>
        <div className={`${styles["stamp-setting"]} ${styles["full"]}`}>
          <b>Company Stamp Image</b>
          <p>Upload a PNG/JPG/WebP stamp. It appears in the A4 invoice.</p>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={driveBusy}
            onChange={(e) => selectStamp(e.target.files?.[0])}
          />
          {pendingStamp && (
            <button className={styles["primary"]} disabled={driveBusy} onClick={upload}>
              {driveBusy ? "Uploading…" : "Save Stamp to Google Drive"}
            </button>
          )}
          {previewUrl && !draft.stampImage && (
            <div className={styles["stamp-preview-setting"]}>
              <img src={previewUrl} alt="Selected stamp preview" />
          
            </div>
          )
          
          }
          
          {draft.stampImage && (
            <div className={styles["stamp-preview-setting"]}>
              <img src={draft.stampImage} alt="Deal Magsil stamp preview" />
            </div>
          )}
          {driveMessage && <p className={styles["drive-message"]}>{driveMessage}</p>}
        </div>
      </div>
    </section>
  );
}
