import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createCertificate } from "../api/certificatesApi";

type FormState = {
  code: string;
  name: string;
  country: string;
};

const initialForm: FormState = {
  code: "",
  name: "",
  country: "UK",
};

export default function CreateCertificate() {
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

    if (!form.code.trim()) {
      setServerError("Certificate code is required.");
      return;
    }

    if (!form.name.trim()) {
      setServerError("Certificate name is required.");
      return;
    }

    if (!form.country.trim()) {
      setServerError("Country is required.");
      return;
    }

    setSubmitting(true);

    try {
      await createCertificate({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        country: form.country.trim().toUpperCase(),
      });

      setSuccessMessage("Certificate created successfully.");
      setForm(initialForm);

      setTimeout(() => navigate("/certificates"), 900);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create certificate.";
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
            <h2 className="ucps-actionTitle">Create certificate</h2>
            <p className="ucps-actionText">
              Add a certificate so managers can reuse it consistently.
            </p>
          </div>

          <div className="ucps-cardHeaderRight">
            <button
              className="ucps-iconBtn"
              type="button"
              onClick={() => navigate("/certificates")}
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
              placeholder="Certificate code"
              value={form.code}
              onChange={(e) => updateField("code", e.target.value)}
            />

            <input
              className="ucps-input"
              placeholder="Certificate name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
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
              onClick={() => navigate("/certificates")}
            >
              Cancel
            </button>

            <button className="ucps-btnPrimary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Create certificate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}