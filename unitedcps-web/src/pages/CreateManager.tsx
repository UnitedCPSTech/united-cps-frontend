import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/axios";

type FormState = {
  email: string;
  country: string;
};

const initialForm: FormState = {
  email: "",
  country: "UK",
};

export default function CreateManager() {
  const navigate = useNavigate();

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

    if (!form.email.trim()) {
      setServerError("Email is required.");
      return;
    }

    if (!form.country.trim()) {
      setServerError("Country is required.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/auth/invites", {
        email: form.email.trim().toLowerCase(),
        role: "OPS_MANAGER",
        country: form.country.trim().toUpperCase(),
      });

      setSuccessMessage("Manager invite sent successfully.");
      setForm(initialForm);

      setTimeout(() => {
        navigate("/users");
      }, 1000);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to send manager invite.";
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
            <h2 className="ucps-actionTitle">Add manager</h2>
            <p className="ucps-actionText">
              Send an invite to create a new operations manager account.
            </p>
          </div>

          <div className="ucps-cardHeaderRight">
            <button
              className="ucps-iconBtn"
              type="button"
              onClick={() => navigate("/users")}
            >
              Back
            </button>
          </div>
        </div>

        {serverError ? <div className="ucps-banner">{serverError}</div> : null}
        {successMessage ? <div className="ucps-infoBox">{successMessage}</div> : null}

        <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
          <div className="ucps-filters">
            <input
              className="ucps-input"
              type="email"
              placeholder="Manager email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
            />

            <input
              className="ucps-input"
              placeholder="Country"
              value={form.country}
              onChange={(e) => updateField("country", e.target.value)}
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
            <button
              className="ucps-iconBtn"
              type="button"
              onClick={() => navigate("/users")}
            >
              Cancel
            </button>

            <button className="ucps-btnPrimary" type="submit" disabled={submitting}>
              {submitting ? "Sending..." : "Send manager invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}