import { useEffect, useMemo, useState } from "react";
import { listEngineers, type EngineerItem } from "../api/engineersApi";
import {
  createTimeOff,
  listTimeOffByEngineer,
  updateTimeOffStatus,
  type TimeOffDateType,
  type TimeOffItem,
} from "../api/timeOffApi";

function formatDate(value?: string | null) {
  if (!value) return "—";
  return value.slice(0, 10);
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

type FormState = {
  country: string;
  dateType: TimeOffDateType;
  dateFrom: string;
  dateTo: string;
  specificDateInput: string;
  reason: string;
};

const initialForm: FormState = {
  country: "UK",
  dateType: "RANGE",
  dateFrom: "",
  dateTo: "",
  specificDateInput: "",
  reason: "",
};

export default function TimeOff() {
  const [engineers, setEngineers] = useState<EngineerItem[]>([]);
  const [selectedEngineer, setSelectedEngineer] = useState<EngineerItem | null>(null);
  const [selectedEngineerTimeOff, setSelectedEngineerTimeOff] = useState<TimeOffItem[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [specificDates, setSpecificDates] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loadingEngineers, setLoadingEngineers] = useState(true);
  const [loadingTimeOff, setLoadingTimeOff] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadEngineers() {
      try {
        setLoadingEngineers(true);
        setError("");

        const data = await listEngineers({ page: 1, limit: 100, status: "ACTIVE" });

        if (cancelled) return;
        setEngineers(data.items ?? []);
      } catch (err: any) {
        if (cancelled) return;
        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load engineers";
        setError(Array.isArray(message) ? message.join(", ") : message);
      } finally {
        if (!cancelled) {
          setLoadingEngineers(false);
        }
      }
    }

    loadEngineers();

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadEngineerTimeOff(engineer: EngineerItem) {
    try {
      setSelectedEngineer(engineer);
      setLoadingTimeOff(true);
      setError("");
      setSuccessMessage("");

      const data = await listTimeOffByEngineer(engineer._id);
      setSelectedEngineerTimeOff(data);

      setForm((prev) => ({
        ...prev,
        country: engineer.country || "UK",
      }));
      setSpecificDates([]);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load time off requests";
      setError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setLoadingTimeOff(false);
    }
  }

  const filteredEngineers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return engineers;

    return engineers.filter((e) => {
      const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
      return (
        fullName.includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.city ?? "").toLowerCase().includes(q) ||
        (e.country ?? "").toLowerCase().includes(q)
      );
    });
  }, [engineers, search]);

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

  async function handleCreateTimeOff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedEngineer) {
      setError("Please select an engineer first");
      return;
    }

    setError("");
    setSuccessMessage("");

    if (!form.country.trim()) {
      setError("Country is required");
      return;
    }

    if (form.dateType === "RANGE") {
      if (!form.dateFrom || !form.dateTo) {
        setError("Start date and end date are required for range");
        return;
      }
    }

    if (form.dateType === "MULTI") {
      if (specificDates.length === 0) {
        setError("At least one date is required for multiple dates");
        return;
      }
    }

    setSubmitting(true);

    try {
      await createTimeOff({
        engineerId: selectedEngineer._id,
        country: form.country.trim(),
        dateType: form.dateType,
        dateFrom: form.dateType === "RANGE" ? form.dateFrom : undefined,
        dateTo: form.dateType === "RANGE" ? form.dateTo : undefined,
        specificDates: form.dateType === "MULTI" ? specificDates : undefined,
        reason: form.reason.trim() || undefined,
      });

      setSuccessMessage("Time off created successfully");

      setForm({
        country: selectedEngineer.country || "UK",
        dateType: "RANGE",
        dateFrom: "",
        dateTo: "",
        specificDateInput: "",
        reason: "",
      });
      setSpecificDates([]);

      await loadEngineerTimeOff(selectedEngineer);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create time off";
      setError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReview(id: string, status: "APPROVED" | "REJECTED") {
    let reviewNote: string | undefined;

    if (status === "REJECTED") {
      const reason = window.prompt("Enter rejection note");
      if (!reason || !reason.trim()) return;
      reviewNote = reason.trim();
    }

    try {
      setActionLoadingId(id);
      setError("");
      setSuccessMessage("");

      await updateTimeOffStatus(id, {
        status,
        reviewNote,
      });

      setSuccessMessage(
        status === "APPROVED"
          ? "Time off approved successfully"
          : "Time off rejected successfully",
      );

      if (selectedEngineer) {
        await loadEngineerTimeOff(selectedEngineer);
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update time off status";
      setError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className="ucps-grid">
      <div className="ucps-card">
        <div className="ucps-cardHeader">
          <div>
            <h3 className="ucps-actionTitle">Time off</h3>
            <p className="ucps-actionText">
              Select an engineer, view their time off requests, and create or review time off.
            </p>
          </div>
        </div>

        {error ? <div className="ucps-banner">{error}</div> : null}
        {successMessage ? <div className="ucps-card">{successMessage}</div> : null}

        <div className="ucps-filters" style={{ marginTop: 12 }}>
          <input
            className="ucps-input"
            placeholder="Search engineer by name, email, city or country"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.2fr",
          gap: 14,
        }}
      >
        <div className="ucps-card">
          <h3 className="ucps-actionTitle">Engineers</h3>
          <p className="ucps-actionText">Click an engineer to view time off.</p>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {loadingEngineers ? (
              <p className="ucps-actionText">Loading engineers...</p>
            ) : filteredEngineers.length === 0 ? (
              <p className="ucps-actionText">No engineers found.</p>
            ) : (
              filteredEngineers.map((engineer) => {
                const isSelected = selectedEngineer?._id === engineer._id;

                return (
                  <button
                    key={engineer._id}
                    type="button"
                    onClick={() => loadEngineerTimeOff(engineer)}
                    className={isSelected ? "ucps-btnPrimary" : "ucps-iconBtn"}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: 12,
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>
                      {engineer.firstName} {engineer.lastName}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>
                      {engineer.email}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      {[engineer.city, engineer.country].filter(Boolean).join(", ") || "—"}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="ucps-grid">
          <div className="ucps-card">
            <h3 className="ucps-actionTitle">
              {selectedEngineer
                ? `${selectedEngineer.firstName} ${selectedEngineer.lastName}`
                : "Select an engineer"}
            </h3>
            <p className="ucps-actionText">
              {selectedEngineer
                ? "View requests and create time off for this engineer."
                : "Choose an engineer from the list to continue."}
            </p>

            {selectedEngineer ? (
              <form onSubmit={handleCreateTimeOff} style={{ marginTop: 12 }}>
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
                      updateField("dateType", e.target.value as TimeOffDateType)
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

                <div style={{ marginTop: 12 }}>
                  <textarea
                    className="ucps-input"
                    placeholder="Reason"
                    value={form.reason}
                    onChange={(e) => updateField("reason", e.target.value)}
                    style={{ minHeight: 100, paddingTop: 12 }}
                  />
                </div>

                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="submit"
                    className="ucps-btnPrimary"
                    disabled={submitting}
                  >
                    {submitting ? "Saving..." : "Book time off"}
                  </button>
                </div>
              </form>
            ) : null}
          </div>

          <div className="ucps-card">
            <h3 className="ucps-actionTitle">Requests</h3>
            <p className="ucps-actionText">
              {selectedEngineer
                ? "Time off requests for the selected engineer."
                : "Select an engineer to view requests."}
            </p>

            <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
              {!selectedEngineer ? (
                <p className="ucps-actionText">No engineer selected.</p>
              ) : loadingTimeOff ? (
                <p className="ucps-actionText">Loading requests...</p>
              ) : selectedEngineerTimeOff.length === 0 ? (
                <p className="ucps-actionText">No time off requests found.</p>
              ) : (
                selectedEngineerTimeOff.map((item) => (
                  <div key={item._id} className="ucps-card" style={{ boxShadow: "none" }}>
                    <div className="ucps-cardHeader">
                      <div>
                        <h4 className="ucps-actionTitle" style={{ marginBottom: 4 }}>
                          {item.dateType === "RANGE"
                            ? `${formatDate(item.dateFrom)} to ${formatDate(item.dateTo)}`
                            : item.specificDates?.map((d) => formatDate(d)).join(", ") || "—"}
                        </h4>
                        <p className="ucps-actionText" style={{ marginBottom: 0 }}>
                          Requested: {formatDateTime(item.requestedAt)}
                        </p>
                      </div>

                      <span className="ucps-chip">{item.status}</span>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <div className="ucps-kv">
                        <div className="ucps-k">Reason</div>
                        <div className="ucps-v">{item.reason || "—"}</div>
                      </div>
                      <div className="ucps-kv">
                        <div className="ucps-k">Review note</div>
                        <div className="ucps-v">{item.reviewNote || "—"}</div>
                      </div>
                      <div className="ucps-kv">
                        <div className="ucps-k">Reviewed at</div>
                        <div className="ucps-v">{formatDateTime(item.reviewedAt)}</div>
                      </div>
                    </div>

                    {item.status === "PENDING" ? (
                      <div
                        style={{
                          marginTop: 14,
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          className="ucps-btnPrimary"
                          type="button"
                          disabled={actionLoadingId === item._id}
                          onClick={() => handleReview(item._id, "APPROVED")}
                        >
                          {actionLoadingId === item._id ? "Saving..." : "Approve"}
                        </button>

                        <button
                          className="ucps-btnPrimary"
                          type="button"
                          disabled={actionLoadingId === item._id}
                          onClick={() => handleReview(item._id, "REJECTED")}
                        >
                          {actionLoadingId === item._id ? "Saving..." : "Reject"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}