import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "../api/clientsApi";

type FormState = {
  name: string;
  country: string;
  addressLine1: string;
  city: string;
  postcode: string;
  region: string;
  timeZone: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  isActive: boolean;
};

const initialForm: FormState = {
  name: "",
  country: "UK",
  addressLine1: "",
  city: "",
  postcode: "",
  region: "",
  timeZone: "Europe/London",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  isActive: true,
};

export default function CreateClient() {
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

    if (!form.name.trim()) return setServerError("Client name is required.");
    if (!form.country.trim()) return setServerError("Country is required.");
    if (!form.addressLine1.trim()) return setServerError("Address line 1 is required.");
    if (!form.city.trim()) return setServerError("City is required.");
    if (!form.postcode.trim()) return setServerError("Postcode is required.");
    if (!form.region.trim()) return setServerError("Region is required.");

    setSubmitting(true);

    try {
      await createClient({
        name: form.name.trim(),
        country: form.country.trim(),
        addressLine1: form.addressLine1.trim(),
        city: form.city.trim(),
        postcode: form.postcode.trim(),
        region: form.region.trim(),
        timeZone: form.timeZone.trim() || "Europe/London",
        contactName: form.contactName.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        isActive: form.isActive,
      });

      setSuccessMessage("Client created successfully.");
      setForm(initialForm);

      setTimeout(() => navigate("/clients"), 900);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create client.";
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
            <h2 className="ucps-actionTitle">Create client</h2>
            <p className="ucps-actionText">
              Add a new client for managers to select when creating jobs.
            </p>
          </div>

          <div className="ucps-cardHeaderRight">
            <button
              className="ucps-iconBtn"
              type="button"
              onClick={() => navigate("/clients")}
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
              placeholder="Client name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
            <input
              className="ucps-input"
              placeholder="Country"
              value={form.country}
              onChange={(e) => updateField("country", e.target.value)}
            />
            <input
              className="ucps-input"
              placeholder="Time zone"
              value={form.timeZone}
              onChange={(e) => updateField("timeZone", e.target.value)}
            />
          </div>

          <div className="ucps-filters" style={{ marginTop: 12 }}>
            <input
              className="ucps-input"
              placeholder="Address line 1"
              value={form.addressLine1}
              onChange={(e) => updateField("addressLine1", e.target.value)}
            />
            <input
              className="ucps-input"
              placeholder="City"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
            />
            <input
              className="ucps-input"
              placeholder="Postcode"
              value={form.postcode}
              onChange={(e) => updateField("postcode", e.target.value)}
            />
            <input
              className="ucps-input"
              placeholder="Region"
              value={form.region}
              onChange={(e) => updateField("region", e.target.value)}
            />
          </div>

          <div className="ucps-filters" style={{ marginTop: 12 }}>
            <input
              className="ucps-input"
              placeholder="Contact name"
              value={form.contactName}
              onChange={(e) => updateField("contactName", e.target.value)}
            />
            <input
              className="ucps-input"
              placeholder="Contact email"
              type="email"
              value={form.contactEmail}
              onChange={(e) => updateField("contactEmail", e.target.value)}
            />
            <input
              className="ucps-input"
              placeholder="Contact phone"
              value={form.contactPhone}
              onChange={(e) => updateField("contactPhone", e.target.value)}
            />
          </div>

          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <input
              id="clientActive"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => updateField("isActive", e.target.checked)}
            />
            <label htmlFor="clientActive" className="ucps-actionText" style={{ margin: 0 }}>
              Client is active
            </label>
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
              onClick={() => navigate("/clients")}
            >
              Cancel
            </button>

            <button className="ucps-btnPrimary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Create client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}