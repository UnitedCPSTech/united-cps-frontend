import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getJob, updateJob } from "../api/jobsApi";
import { listClients, type ClientItem } from "../api/clientsApi";
import {
  listCertificates,
  type CertificateItem,
} from "../api/certificatesApi";

type FormState = {
  country: string;
  selectedClientId: string;
  clientNameSnapshotFallback: string;
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
  selectedClientId: "",
  clientNameSnapshotFallback: "",
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

export default function EditJob() {
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId: string }>();

  const [form, setForm] = useState<FormState>(initialForm);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [selectedCertificateCodes, setSelectedCertificateCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      if (!jobId) {
        setServerError("Missing job id");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setServerError("");

        const [job, clientsData, certificatesData] = await Promise.all([
          getJob(jobId),
          listClients(),
          listCertificates(),
        ]);

        if (cancelled) return;

        setClients(clientsData);
        setCertificates(certificatesData);
        setSelectedCertificateCodes(job.requiredCertificateTypes ?? []);

        const matchedClient =
          clientsData.find((c) => c.name === job.clientNameSnapshot) ?? null;

        setForm({
          country: job.country ?? "UK",
          selectedClientId: matchedClient?._id ?? "",
          clientNameSnapshotFallback: job.clientNameSnapshot ?? "",
          jobTitle: job.jobTitle ?? "",
          locationText: job.locationText ?? "",
          addressLine1: job.location?.addressLine1 ?? "",
          city: job.location?.city ?? "",
          postcode: job.location?.postcode ?? "",
          region: job.location?.region ?? "",
          locationCountry: job.location?.country ?? "UK",
          timeZone: job.timeZone ?? "Europe/London",
          startTimeLocal: job.startTimeLocal ?? "08:00",
          endTimeLocal: job.endTimeLocal ?? "17:00",
          description: job.description ?? "",
        });
      } catch (error: any) {
        if (cancelled) return;
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to load job";
        setServerError(Array.isArray(message) ? message.join(", ") : message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAll();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const selectedClient = useMemo(
    () => clients.find((c) => c._id === form.selectedClientId) ?? null,
    [clients, form.selectedClientId],
  );

  function toggleCertificate(code: string) {
    setSelectedCertificateCodes((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!jobId) {
      setServerError("Missing job id");
      return;
    }

    setServerError("");
    setSuccessMessage("");

    const clientNameSnapshot =
      selectedClient?.name || form.clientNameSnapshotFallback.trim();

    if (!clientNameSnapshot) {
      setServerError("Please select a client");
      return;
    }

    if (!form.jobTitle.trim()) {
      setServerError("Job title is required");
      return;
    }

    if (!form.locationText.trim()) {
      setServerError("Location text is required");
      return;
    }

    if (!form.city.trim()) {
      setServerError("City is required");
      return;
    }

    setSubmitting(true);

    try {
      await updateJob(jobId, {
        country: form.country.trim(),
        clientNameSnapshot,
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

      setSuccessMessage("Job updated successfully");

      setTimeout(() => {
        navigate("/jobs/list");
      }, 700);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update job";
      setServerError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="ucps-grid">
        <div className="ucps-card">
          <p className="ucps-actionText">Loading job...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ucps-grid">
      <div className="ucps-card">
        <div className="ucps-cardHeader">
          <div>
            <h2 className="ucps-actionTitle">Edit job</h2>
            <p className="ucps-actionText">
              Update the core job details without recreating the job.
            </p>
          </div>
        </div>

        {serverError ? <div className="ucps-banner">{serverError}</div> : null}
        {successMessage ? <div className="ucps-card">{successMessage}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="ucps-filters">
            <input
              className="ucps-input"
              placeholder="Country"
              value={form.country}
              onChange={(e) => updateField("country", e.target.value)}
            />

            <select
              className="ucps-input"
              value={form.selectedClientId}
              onChange={(e) => updateField("selectedClientId", e.target.value)}
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client._id} value={client._id}>
                  {client.name}
                </option>
              ))}
            </select>

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

          <div className="ucps-filters">
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

          <div className="ucps-filters">
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
            <h3 className="ucps-actionTitle" style={{ marginBottom: 8 }}>
              Required certificates
            </h3>
            <p className="ucps-actionText">
              Select one or more certificate types required for this job.
            </p>

            <div
              className="ucps-card"
              style={{ padding: 12, boxShadow: "none", display: "grid", gap: 10 }}
            >
              {certificates.length === 0 ? (
                <p className="ucps-actionText" style={{ margin: 0 }}>
                  No active certificates found.
                </p>
              ) : (
                certificates.map((cert) => (
                  <label
                    key={cert._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 14,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCertificateCodes.includes(cert.code)}
                      onChange={() => toggleCertificate(cert.code)}
                    />
                    <span>
                      <strong>{cert.code}</strong>, {cert.name}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 12,
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              className="ucps-iconBtn"
              onClick={() => navigate("/jobs/list")}
            >
              Cancel
            </button>
            <button type="submit" className="ucps-btnPrimary" disabled={submitting}>
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}