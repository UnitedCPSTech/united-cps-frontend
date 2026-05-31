import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createEngineer } from "../api/engineersApi";
import { api } from "../api/axios";
import {
  listCertificates,
  type CertificateItem,
} from "../api/certificatesApi";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  skillsText: string;
  isAvailable: boolean;
};

const initialForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  country: "UK",
  city: "",
  skillsText: "",
  isAvailable: true,
};

function splitCsv(value: string) {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalizeCert(value: string) {
  return value.trim().toUpperCase();
}

export default function CreateEngineer() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(initialForm);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [selectedCertificates, setSelectedCertificates] = useState<string[]>([]);
  const [loadingCertificates, setLoadingCertificates] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [certificateSearch, setCertificateSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCertificatesData() {
      try {
        setLoadingCertificates(true);
        setServerError("");

        const data = await listCertificates();

        if (cancelled) return;
        setCertificates(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (cancelled) return;
        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load certificates.";
        setServerError(Array.isArray(message) ? message.join(", ") : message);
      } finally {
        if (!cancelled) {
          setLoadingCertificates(false);
        }
      }
    }

    loadCertificatesData();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleCertificate(code: string) {
    const normalized = normalizeCert(code);

    setSelectedCertificates((prev) =>
      prev.includes(normalized)
        ? prev.filter((x) => x !== normalized)
        : [...prev, normalized],
    );
  }

  const filteredCertificates = useMemo(() => {
    const q = certificateSearch.trim().toLowerCase();
    if (!q) return certificates;

    return certificates.filter((cert) => {
      return (
        cert.code.toLowerCase().includes(q) ||
        cert.name.toLowerCase().includes(q)
      );
    });
  }, [certificates, certificateSearch]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setServerError("");
    setSuccessMessage("");

    if (!form.firstName.trim()) {
      setServerError("First name is required.");
      return;
    }

    if (!form.lastName.trim()) {
      setServerError("Last name is required.");
      return;
    }

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
      await createEngineer({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        country: form.country.trim(),
        city: form.city.trim() || undefined,
        skills: splitCsv(form.skillsText),
        certifications: selectedCertificates,
        isAvailable: form.isAvailable,
      });

      let inviteSent = false;
      let inviteError = "";

      try {
        await api.post("/auth/invites", {
          email: form.email.trim().toLowerCase(),
          role: "ENGINEER",
          country: form.country.trim(),
        });
        inviteSent = true;
      } catch (inviteErr: any) {
        const message =
          inviteErr?.response?.data?.message ||
          inviteErr?.message ||
          "Engineer was created, but invite failed.";
        inviteError = Array.isArray(message) ? message.join(", ") : message;
      }

      if (inviteSent) {
        setSuccessMessage("Engineer created and invite sent successfully.");
      } else {
        setSuccessMessage(
          `Engineer created successfully. Invite was not sent. ${inviteError}`,
        );
      }

      setForm(initialForm);
      setSelectedCertificates([]);
      setCertificateSearch("");

      setTimeout(() => {
        navigate("/engineers");
      }, 1200);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create engineer.";
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
            <h2 className="ucps-actionTitle">Create engineer</h2>
            <p className="ucps-actionText">
              Create the engineer profile, then send an engineer invite.
            </p>
          </div>

          <div className="ucps-cardHeaderRight">
            <button
              className="ucps-iconBtn"
              type="button"
              onClick={() => navigate("/engineers")}
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
              placeholder="First name"
              value={form.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
            />
            <input
              className="ucps-input"
              placeholder="Last name"
              value={form.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
            />
            <input
              className="ucps-input"
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
            <input
              className="ucps-input"
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />
          </div>

          <div className="ucps-filters" style={{ marginTop: 12 }}>
            <input
              className="ucps-input"
              placeholder="Country"
              value={form.country}
              onChange={(e) => updateField("country", e.target.value)}
            />
            <input
              className="ucps-input"
              placeholder="City"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
            />
            <input
              className="ucps-input"
              placeholder="Skills, comma separated"
              value={form.skillsText}
              onChange={(e) => updateField("skillsText", e.target.value)}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  }}
>
  <h3 className="ucps-actionTitle" style={{ margin: 0 }}>
    Certifications
  </h3>

  <button
    type="button"
    onClick={() => navigate("/certificates/create")}
    style={{
      background: "none",
      border: "none",
      padding: 0,
      color: "var(--ucps-blue)",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
    }}
  >
    Certificate not listed? Create certificate
  </button>
</div>

            <p className="ucps-actionText" style={{ marginBottom: 10 }}>
              Select existing certificates for this engineer.
            </p>

            <input
              className="ucps-input"
              placeholder="Search certificates by code or name"
              value={certificateSearch}
              onChange={(e) => setCertificateSearch(e.target.value)}
            />

            <div className="ucps-card" style={{ marginTop: 12, boxShadow: "none" }}>
              {loadingCertificates ? (
                <p className="ucps-actionText" style={{ margin: 0 }}>
                  Loading certificates...
                </p>
              ) : filteredCertificates.length === 0 ? (
                <p className="ucps-actionText" style={{ margin: 0 }}>
                  No certificates found.
                </p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {filteredCertificates.map((cert) => {
                    const checked = selectedCertificates.includes(
                      normalizeCert(cert.code),
                    );

                    return (
                      <label
                        key={cert._id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCertificate(cert.code)}
                          style={{ marginTop: 4 }}
                        />
                        <div>
                          <div style={{ fontWeight: 800 }}>{cert.code}</div>
                          <div style={{ color: "var(--muted)", fontSize: 13 }}>
                            {cert.name}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="ucps-k">Selected certificates</div>
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {selectedCertificates.length === 0 ? (
                  <span className="ucps-actionText">None selected</span>
                ) : (
                  selectedCertificates.map((code) => (
                    <span key={code} className="ucps-chip">
                      {code}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <div
            style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}
          >
            <input
              id="isAvailable"
              type="checkbox"
              checked={form.isAvailable}
              onChange={(e) => updateField("isAvailable", e.target.checked)}
            />
            <label htmlFor="isAvailable" className="ucps-actionText" style={{ margin: 0 }}>
              Mark engineer as available
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
              onClick={() => navigate("/engineers")}
            >
              Cancel
            </button>

            <button className="ucps-btnPrimary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Create engineer and invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}