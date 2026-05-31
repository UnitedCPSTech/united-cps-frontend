import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api/axios";

type FormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const initialForm: FormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function Settings() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setServerError("");
    setSuccessMessage("");

    if (!form.currentPassword.trim()) {
      setServerError("Current password is required.");
      return;
    }

    if (!form.newPassword.trim()) {
      setServerError("New password is required.");
      return;
    }

    if (form.newPassword.length < 8) {
      setServerError("New password must be at least 8 characters.");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setServerError("New password and confirm password do not match.");
      return;
    }

    if (form.currentPassword === form.newPassword) {
      setServerError("New password must be different from current password.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      setSuccessMessage("Password changed successfully.");
      setForm(initialForm);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to change password.";

      setServerError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ucps-grid">
      <div className="ucps-card">
        <div className="ucps-cardHeader">
          <div>
            <h3 className="ucps-actionTitle" style={{ margin: 0 }}>
              Settings
            </h3>
            <p className="ucps-actionText" style={{ margin: "6px 0 0 0" }}>
              Manage your account security settings.
            </p>
          </div>
        </div>

        <div className="ucps-card" style={{ marginTop: 12, boxShadow: "none" }}>
          <h4 className="ucps-actionTitle" style={{ marginBottom: 6 }}>
            Change password
          </h4>
          <p className="ucps-actionText" style={{ marginBottom: 12 }}>
            Update your account password.
          </p>

          {serverError ? <div className="ucps-banner">{serverError}</div> : null}
          {successMessage ? <div className="ucps-infoBox">{successMessage}</div> : null}

          <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
            <div className="ucps-filters">
              <input
                className="ucps-input"
                type="password"
                placeholder="Current password"
                value={form.currentPassword}
                onChange={(e) => updateField("currentPassword", e.target.value)}
              />

              <input
                className="ucps-input"
                type="password"
                placeholder="New password"
                value={form.newPassword}
                onChange={(e) => updateField("newPassword", e.target.value)}
              />

              <input
                className="ucps-input"
                type="password"
                placeholder="Confirm new password"
                value={form.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
              />
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button className="ucps-btnPrimary" type="submit" disabled={submitting}>
                {submitting ? "Updating..." : "Change password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}