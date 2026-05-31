import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getJobDates, upsertJobDates, type JobDateType } from "../api/jobDatesApi";

type FormState = {
  country: string;
  dateType: JobDateType;
  dateFrom: string;
  dateTo: string;
  specificDateInput: string;
};

const initialForm: FormState = {
  country: "UK",
  dateType: "RANGE",
  dateFrom: "",
  dateTo: "",
  specificDateInput: "",
};

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

export default function SetJobDates() {
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId: string }>();

  const [form, setForm] = useState<FormState>(initialForm);
  const [specificDates, setSpecificDates] = useState<string[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadExisting() {
      if (!jobId) {
        setServerError("Missing job id");
        setLoadingExisting(false);
        return;
      }

      try {
        setLoadingExisting(true);
        setServerError("");

        const data = await getJobDates(jobId);

        if (cancelled || !data) return;

        setForm({
          country: data.country ?? "UK",
          dateType: data.dateType ?? "RANGE",
          dateFrom: toDateInputValue(data.dateFrom),
          dateTo: toDateInputValue(data.dateTo),
          specificDateInput: "",
        });

        setSpecificDates(
          Array.isArray(data.specificDates)
            ? data.specificDates.map((d: string) => d.slice(0, 10))
            : [],
        );
      } catch (error: any) {
        if (cancelled) return;

        const status = error?.response?.status;
        if (status && status !== 404) {
          const message =
            error?.response?.data?.message ||
            error?.message ||
            "Failed to load existing job dates";
          setServerError(Array.isArray(message) ? message.join(", ") : message);
        }
      } finally {
        if (!cancelled) {
          setLoadingExisting(false);
        }
      }
    }

    loadExisting();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addSpecificDate() {
    const value = form.specificDateInput.trim();
    if (!value) return;

    setSpecificDates((prev) => {
      if (prev.includes(value)) return prev;
      return [...prev, value].sort();
    });

    updateField("specificDateInput", "");
  }

  function removeSpecificDate(date: string) {
    setSpecificDates((prev) => prev.filter((d) => d !== date));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!jobId) {
      setServerError("Missing job id");
      return;
    }

    setServerError("");
    setSuccessMessage("");

    if (!form.country.trim()) {
      setServerError("Country is required");
      return;
    }

    if (form.dateType === "RANGE") {
      if (!form.dateFrom || !form.dateTo) {
        setServerError("Start date and end date are required for range");
        return;
      }
    }

    if (form.dateType === "MULTI") {
      if (specificDates.length === 0) {
        setServerError("At least one date is required for multiple dates");
        return;
      }
    }

    setSubmitting(true);

    try {
      if (form.dateType === "RANGE") {
        await upsertJobDates(jobId, {
          country: form.country.trim(),
          dateType: "RANGE",
          dateFrom: form.dateFrom,
          dateTo: form.dateTo,
        });
      } else {
        await upsertJobDates(jobId, {
          country: form.country.trim(),
          dateType: "MULTI",
          specificDates,
        });
      }

      setSuccessMessage("Job dates saved successfully");

      setTimeout(() => {
        navigate("/jobs");
      }, 700);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to save job dates";
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
            <h2 className="ucps-actionTitle">Set job dates</h2>
            <p className="ucps-actionText">
              Choose either a continuous date range or multiple specific dates.
            </p>
          </div>
        </div>

        {serverError ? <div className="ucps-banner">{serverError}</div> : null}
        {successMessage ? <div className="ucps-card">{successMessage}</div> : null}

        {loadingExisting ? (
          <p className="ucps-actionText">Loading job dates...</p>
        ) : (
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
                value={form.dateType}
                onChange={(e) =>
                  updateField("dateType", e.target.value as JobDateType)
                }
              >
                <option value="RANGE">Range</option>
                <option value="MULTI">Multiple dates</option>
              </select>
            </div>

            {form.dateType === "RANGE" ? (
              <div className="ucps-filters" style={{ marginTop: 12 }}>
                <input
                  className="ucps-input"
                  type="date"
                  value={form.dateFrom}
                  onChange={(e) => updateField("dateFrom", e.target.value)}
                />
                <input
                  className="ucps-input"
                  type="date"
                  value={form.dateTo}
                  onChange={(e) => updateField("dateTo", e.target.value)}
                />
              </div>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 12,
                  }}
                >
                  <input
                    className="ucps-input"
                    type="date"
                    value={form.specificDateInput}
                    onChange={(e) =>
                      updateField("specificDateInput", e.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="ucps-btnPrimary"
                    onClick={addSpecificDate}
                    disabled={!form.specificDateInput}
                  >
                    Add date
                  </button>
                </div>

                <div className="ucps-card" style={{ padding: 12, boxShadow: "none" }}>
                  {specificDates.length === 0 ? (
                    <p className="ucps-actionText" style={{ margin: 0 }}>
                      No dates added yet.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {specificDates.map((date) => (
                        <div
                          key={date}
                          className="ucps-chip"
                          style={{ display: "flex", alignItems: "center", gap: 8 }}
                        >
                          <span>{date}</span>
                          <button
                            type="button"
                            onClick={() => removeSpecificDate(date)}
                            style={{
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              fontWeight: 800,
                              color: "inherit",
                            }}
                            aria-label={`Remove ${date}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

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
                onClick={() => navigate("/jobs")}
              >
                Skip for now
              </button>
              <button
                type="submit"
                className="ucps-btnPrimary"
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save dates"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}