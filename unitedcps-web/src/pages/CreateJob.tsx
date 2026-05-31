import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createJob } from "../api/jobsApi";
import { listClients, type ClientItem } from "../api/clientsApi";
import { listCertificates, type CertificateItem } from "../api/certificatesApi";

type FormState = {
  country: string;
  clientId: string;
  jobTitle: string;
  locationText: string;
  addressLine1: string;
  city: string;
  postcode: string;
  region: string;
  locationCountry: string;
  timeZone: string;
  startTimeLocal: string;
  endTimeLocal: string;
  description: string;
};

const initialForm: FormState = {
  country: "UK",
  clientId: "",
  jobTitle: "",
  locationText: "",
  addressLine1: "",
  city: "",
  postcode: "",
  region: "",
  locationCountry: "UK",
  timeZone: "Europe/London",
  startTimeLocal: "08:00",
  endTimeLocal: "17:00",
  description: "",
};

function normalizeCert(value: string) {
  return value.trim().toUpperCase();
}

export default function CreateJob() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(initialForm);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [selectedCertificateCodes, setSelectedCertificateCodes] = useState<string[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingCertificates, setLoadingCertificates] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadClientsData() {
      try {
        setLoadingClients(true);
        const data = await listClients({ isActive: "true" });
        if (cancelled) return;
        setClients(data ?? []);
      } catch (err: any) {
        if (cancelled) return;
        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load clients.";
        setServerError(Array.isArray(message) ? message.join(", ") : message);
      } finally {
        if (!cancelled) setLoadingClients(false);
      }
    }

    loadClientsData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCertificatesData() {
      try {
        setLoadingCertificates(true);
        const data = await listCertificates();
        if (cancelled) return;
        setCertificates(data ?? []);
      } catch (err: any) {
        if (cancelled) return;
        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load certificates.";
        setServerError(Array.isArray(message) ? message.join(", ") : message);
      } finally {
        if (!cancelled) setLoadingCertificates(false);
      }
    }

    loadCertificatesData();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedClient = useMemo(
    () => clients.find((c) => c._id === form.clientId) ?? null,
    [clients, form.clientId],
  );

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleClientChange(clientId: string) {
    const client = clients.find((c) => c._id === clientId) ?? null;

    setForm((prev) => {
      if (!client) {
        return {
          ...prev,
          clientId: "",
        };
      }

      const autoLocationText = [
        client.addressLine1,
        client.city,
        client.region,
        client.postcode,
        client.country,
      ]
        .filter(Boolean)
        .join(", ");

      return {
        ...prev,
        clientId: client._id,
        country: client.country || prev.country,
        addressLine1: client.addressLine1 || "",
        city: client.city || "",
        postcode: client.postcode || "",
        region: client.region || "",
        locationCountry: client.country || prev.locationCountry,
        timeZone: client.timeZone || "Europe/London",
        locationText: autoLocationText,
      };
    });
  }

  function toggleCertificate(code: string) {
    const normalized = normalizeCert(code);

    setSelectedCertificateCodes((prev) =>
      prev.includes(normalized)
        ? prev.filter((x) => x !== normalized)
        : [...prev, normalized],
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setServerError("");
    setSuccessMessage("");

    if (!form.clientId) {
      setServerError("Please select a client.");
      return;
    }

    if (!form.jobTitle.trim()) {
      setServerError("Job title is required.");
      return;
    }

    if (!form.locationText.trim()) {
      setServerError("Location text is required.");
      return;
    }

    if (!form.city.trim()) {
      setServerError("City is required.");
      return;
    }

    if (!form.locationCountry.trim()) {
      setServerError("Location country is required.");
      return;
    }

    setSubmitting(true);

    try {
      const created = await createJob({
        country: form.country.trim(),
        clientId: form.clientId,
        clientNameSnapshot: selectedClient?.name ?? "",
        jobTitle: form.jobTitle.trim(),
        locationText: form.locationText.trim(),
        location: {
          addressLine1: form.addressLine1.trim() || undefined,
          city: form.city.trim(),
          postcode: form.postcode.trim() || null,
          region: form.region.trim() || undefined,
          country: form.locationCountry.trim(),
        },
        timeZone: form.timeZone.trim() || "Europe/London",
        startTimeLocal: form.startTimeLocal,
        endTimeLocal: form.endTimeLocal,
        description: form.description.trim() || undefined,
        requiredCertificateTypes: selectedCertificateCodes,
      });

      setSuccessMessage("Job created successfully");

      const createdId = created?._id;
      if (createdId) {
        setTimeout(() => {
          navigate(`/jobs/${createdId}/dates`);
        }, 700);
      } else {
        setTimeout(() => {
          navigate("/jobs");
        }, 700);
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create job.";
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
            <h2 className="ucps-actionTitle">Create job</h2>
            <p className="ucps-actionText">
              Select a client, then review or adjust the job details before saving.
            </p>
          </div>

          <div className="ucps-cardHeaderRight">
            <button
              className="ucps-iconBtn"
              type="button"
              onClick={() => navigate("/jobs")}
            >
              Back
            </button>
          </div>
        </div>

        {serverError ? <div className="ucps-banner">{serverError}</div> : null}
        {successMessage ? <div className="ucps-infoBox">{successMessage}</div> : null}

        <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
          <div className="ucps-filters">
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Client</span>

                <button
                  type="button"
                  onClick={() => navigate("/clients/create")}
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
                  Client not listed? Create client
                </button>
              </div>

              <select
                className="ucps-input"
                value={form.clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                disabled={loadingClients}
              >
                <option value="">
                  {loadingClients ? "Loading clients..." : "Select client"}
                </option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.name} ({client.city}, {client.country})
                  </option>
                ))}
              </select>
            </div>

            <input
              className="ucps-input"
              placeholder="Country"
              value={form.country}
              onChange={(e) => updateField("country", e.target.value)}
            />

            <input
              className="ucps-input"
              placeholder="Job title"
              value={form.jobTitle}
              onChange={(e) => updateField("jobTitle", e.target.value)}
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
              placeholder="Location text"
              value={form.locationText}
              onChange={(e) => updateField("locationText", e.target.value)}
            />

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
          </div>

          <div className="ucps-filters" style={{ marginTop: 12 }}>
            <input
              className="ucps-input"
              placeholder="Region"
              value={form.region}
              onChange={(e) => updateField("region", e.target.value)}
            />

            <input
              className="ucps-input"
              placeholder="Location country"
              value={form.locationCountry}
              onChange={(e) => updateField("locationCountry", e.target.value)}
            />

            <input
              className="ucps-input"
              type="time"
              value={form.startTimeLocal}
              onChange={(e) => updateField("startTimeLocal", e.target.value)}
            />

            <input
              className="ucps-input"
              type="time"
              value={form.endTimeLocal}
              onChange={(e) => updateField("endTimeLocal", e.target.value)}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <textarea
              className="ucps-input"
              placeholder="Description"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              style={{ minHeight: 120, paddingTop: 12 }}
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
    Required certificates
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

            <div className="ucps-card" style={{ boxShadow: "none" }}>
              {loadingCertificates ? (
                <p className="ucps-actionText" style={{ margin: 0 }}>
                  Loading certificates...
                </p>
              ) : certificates.length === 0 ? (
                <p className="ucps-actionText" style={{ margin: 0 }}>
                  No certificates found.
                </p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {certificates.map((cert) => {
                    const checked = selectedCertificateCodes.includes(
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
              onClick={() => navigate("/jobs")}
            >
              Cancel
            </button>

            <button className="ucps-btnPrimary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Create job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}