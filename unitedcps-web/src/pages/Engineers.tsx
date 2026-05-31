import { useEffect, useMemo, useState } from "react";
import { engineersApi } from "../api/engineersApi";
import { availabilityApi } from "../api/availabilityApi";
import { useNavigate } from "react-router-dom";

import { sendInvite } from "../api/authApi";

type Engineer = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country?: string;
  city?: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  isAvailable: boolean;
  skills: string[];
  certifications: string[];
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
};

type EngineersResponse = {
  page: number;
  limit: number;
  total: number;
  pages: number;
  items: Engineer[];
};

type AvailabilityResult = {
  engineerId: string;
  from: string;
  to: string;
  isAvailable: boolean;
  reasons: string[];
};

type BulkAvailabilityResponse = {
  from: string;
  to: string;
  total: number;
  results: AvailabilityResult[];
};

function toUtcMidnightIso(dateStr: string) {
  return new Date(`${dateStr}T00:00:00.000Z`).toISOString();
}

export default function Engineers() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Engineer[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState("");

  // Availability range check
  const [fromDate, setFromDate] = useState(""); // YYYY-MM-DD
  const [toDate, setToDate] = useState(""); // YYYY-MM-DD
  const [checkingAvail, setCheckingAvail] = useState(false);
  const [availError, setAvailError] = useState<string | null>(null);
  const [availMap, setAvailMap] = useState<Record<string, AvailabilityResult>>(
    {}
  );

  // Resend Invite
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  // Sorting
  const [sortBy, setSortBy] = useState<
    "createdAt" | "name" | "status" | "availability"
  >("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Drawer selection
  const [selected, setSelected] = useState<Engineer | null>(null);

  // Close drawer with ESC
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [q, country, status]);

  const queryParams = useMemo(() => {
    const params: any = { page, limit };

    if (q.trim()) params.search = q.trim();
    if (country.trim()) params.country = country.trim();
    if (status) params.status = status;

    return params;
  }, [q, country, status, page, limit]);

  const fetchEngineers = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await engineersApi.get<EngineersResponse>("/engineers", {
        params: queryParams,
      });

      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);

      // Clear computed availability when list changes to avoid stale values
      setAvailMap({});
      setAvailError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load engineers.");
      setItems([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEngineers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams]);

  const sortedItems = useMemo(() => {
    const copy = [...items];
    const dir = sortDir === "asc" ? 1 : -1;

    const availabilityRank = (v: boolean | undefined) =>
      v === true ? 2 : v === false ? 1 : 0;

    copy.sort((a, b) => {
      if (sortBy === "name") {
        const an = `${a.firstName} ${a.lastName}`.toLowerCase();
        const bn = `${b.firstName} ${b.lastName}`.toLowerCase();
        return an.localeCompare(bn) * dir;
      }

      if (sortBy === "status") {
        return String(a.status).localeCompare(String(b.status)) * dir;
      }

      if (sortBy === "createdAt") {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return (at - bt) * dir;
      }

      if (sortBy === "availability") {
        const avA = availMap[a._id]?.isAvailable;
        const avB = availMap[b._id]?.isAvailable;
        return (availabilityRank(avA) - availabilityRank(avB)) * dir;
      }

      return 0;
    });

    return copy;
  }, [items, sortBy, sortDir, availMap]);

  const showingFrom = total === 0 ? 0 : (page - 1) * limit + 1;
  const showingTo = Math.min(page * limit, total);

  const canCheck = Boolean(fromDate && toDate && items.length > 0);

  const checkAvailability = async () => {
    if (!fromDate || !toDate) {
      setAvailError("Please select both From and To dates.");
      return;
    }

    const fromIso = toUtcMidnightIso(fromDate);
    const toIso = toUtcMidnightIso(toDate);

    if (new Date(toIso).getTime() <= new Date(fromIso).getTime()) {
      setAvailError("To date must be after From date.");
      return;
    }

    setCheckingAvail(true);
    setAvailError(null);

    try {
      const engineerIds = items.map((e) => e._id);

      const res = await availabilityApi.post<BulkAvailabilityResponse>(
        "/availability/check-bulk",
        { engineerIds, from: fromIso, to: toIso }
      );

      const map: Record<string, AvailabilityResult> = {};
      for (const r of res.data.results || []) {
        map[r.engineerId] = r;
      }

      setAvailMap(map);
    } catch (e: any) {
      setAvailError(e?.response?.data?.message || "Failed to check availability.");
      setAvailMap({});
    } finally {
      setCheckingAvail(false);
    }
  };

  const clearDates = () => {
    setFromDate("");
    setToDate("");
    setAvailMap({});
    setAvailError(null);
    // if they were sorting by availability, bounce back to default sort
    if (sortBy === "availability") {
      setSortBy("createdAt");
      setSortDir("desc");
    }
  };

  const resetAll = () => {
    setQ("");
    setCountry("");
    setStatus("");
    setPage(1);

    setSortBy("createdAt");
    setSortDir("desc");

    setFromDate("");
    setToDate("");
    setAvailMap({});
    setAvailError(null);

    setSelected(null);

    // force a refresh immediately (instead of waiting for effects)
    fetchEngineers();
  };

  const handleResendEngineerInvite = async (engineer: Engineer) => {
  setError(null);
  setInviteMessage(null);

  if (!engineer.email?.trim()) {
    setError("Engineer email is missing.");
    return;
  }

  if (!engineer.country?.trim()) {
    setError("Engineer country is missing.");
    return;
  }

  setInviteSubmitting(true);

  try {
    await sendInvite({
      email: engineer.email.trim().toLowerCase(),
      role: "ENGINEER",
      country: engineer.country.trim().toUpperCase(),
    });

    setInviteMessage(`Invite sent to ${engineer.email}`);
  } catch (e: any) {
    const message =
      e?.response?.data?.message || "Failed to send engineer invite.";
    setError(Array.isArray(message) ? message.join(", ") : message);
  } finally {
    setInviteSubmitting(false);
  }
};


  return (
    <div className="ucps-grid">
      <div className="ucps-card">
        <div className="ucps-cardHeader">
          <div>
            <h3 className="ucps-actionTitle" style={{ margin: 0 }}>Engineers</h3>
            <p className="ucps-actionText" style={{ margin: "6px 0 0 0" }}>
              Search and filter engineers, then check availability for a date range.
            </p>
          </div>

          <div className="ucps-cardHeaderRight">
            <button
              className="ucps-iconBtn"
              type="button"
              onClick={resetAll}
              title="Reset filters and reload"
              aria-label="Reset"
            >
              ↻
            </button>
          </div>
        </div>

        <div className="ucps-filters">
          <input
            className="ucps-input"
            placeholder="Search name or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <input
            className="ucps-input"
            placeholder="Country (e.g. UK)"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />

          <select
            className="ucps-input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All status</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>

          {/* Sort controls */}
          <select
            className="ucps-input"
            value={`${sortBy}:${sortDir}`}
            onChange={(e) => {
              const [sb, sd] = e.target.value.split(":");
              setSortBy(sb as any);
              setSortDir(sd as any);
            }}
            title="Sort"
          >
            <option value="createdAt:desc">Sort: Newest</option>
            <option value="createdAt:asc">Sort: Oldest</option>
            <option value="name:asc">Sort: Name A–Z</option>
            <option value="name:desc">Sort: Name Z–A</option>
            <option value="status:asc">Sort: Status A–Z</option>
            <option value="status:desc">Sort: Status Z–A</option>
            <option value="availability:desc">Sort: Availability (Yes first)</option>
            <option value="availability:asc">Sort: Availability (No first)</option>
          </select>
        </div>

        {error && (
          <div className="ucps-banner" style={{ marginTop: 12 }}>
            {error}
          </div>
        )}
      </div>

      <div className="ucps-card">
        <div className="ucps-cardHeader">
          <div>
            <h3 className="ucps-actionTitle" style={{ margin: 0 }}>Results</h3>
            <p className="ucps-actionText" style={{ margin: "6px 0 0 0" }}>
              Showing {showingFrom}-{showingTo} of {total}
            </p>
          </div>

          <div className="ucps-cardHeaderRight">
            <button
              className="ucps-btnPrimary"
              type="button"
              onClick={() => navigate("/engineers/create")}
            >
              Add engineer
            </button>
          </div>
        </div>

        {/* Availability range */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr auto auto",
            gap: 12,
            marginTop: 12,
            alignItems: "end",
          }}
        >
          <div>
            <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 6 }}>
              From
            </div>
            <input
              className="ucps-input"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div>
            <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 6 }}>
              To
            </div>
            <input
              className="ucps-input"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <button
            className="ucps-iconBtn"
            type="button"
            disabled={!canCheck || checkingAvail}
            onClick={checkAvailability}
            style={{ height: 44 }}
          >
            {checkingAvail ? "Checking…" : "Check"}
          </button>

          <button
            className="ucps-iconBtn"
            type="button"
            onClick={clearDates}
            disabled={!fromDate && !toDate && Object.keys(availMap).length === 0}
            style={{ height: 44 }}
            title="Clear dates"
          >
            Clear
          </button>
        </div>

        {availError && (
          <div className="ucps-banner" style={{ marginTop: 12 }}>
            {availError}
          </div>
        )}

        {sortBy === "availability" && (!fromDate || !toDate) && (
          <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 12 }}>
            Pick dates and click “Check” for availability sorting to be meaningful.
          </div>
        )}

        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                <th style={{ padding: "10px 8px" }}>Name</th>
                <th style={{ padding: "10px 8px" }}>Email</th>
                <th style={{ padding: "10px 8px" }}>Country</th>
                <th style={{ padding: "10px 8px" }}>Status</th>
                <th style={{ padding: "10px 8px" }}>Available in range</th>
                <th style={{ padding: "10px 8px" }}>Reasons</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td style={{ padding: 12 }} colSpan={6}>
                    Loading…
                  </td>
                </tr>
              ) : sortedItems.length === 0 ? (
                <tr>
                  <td style={{ padding: 12, color: "var(--muted)" }} colSpan={6}>
                    No engineers found.
                  </td>
                </tr>
              ) : (
                sortedItems.map((e) => {
                  const computed = availMap[e._id];

                  const availText =
                    fromDate && toDate
                      ? computed
                        ? computed.isAvailable
                          ? "Yes"
                          : "No"
                        : "Not checked"
                      : "-";

                  const reasonsText =
                    computed && computed.reasons?.length
                      ? computed.reasons.join(", ")
                      : computed
                        ? "-"
                        : "-";

                  return (
                    <tr
                      key={e._id}
                      className="ucps-rowClickable"
                      style={{ borderTop: "1px solid var(--border)" }}
onClick={() => {
  setSelected(e);
  setInviteMessage(null);
}}                    >
                      <td style={{ padding: "10px 8px", fontWeight: 800 }}>
                        {e.firstName} {e.lastName}
                        <div style={{ color: "var(--muted)", fontWeight: 500, fontSize: 12 }}>
                          {e.city || "-"}
                        </div>
                      </td>

                      <td style={{ padding: "10px 8px" }}>{e.email}</td>
                      <td style={{ padding: "10px 8px" }}>{e.country || "-"}</td>
                      <td style={{ padding: "10px 8px" }}>{e.status}</td>
                      <td style={{ padding: "10px 8px" }}>{availText}</td>
                      <td style={{ padding: "10px 8px", color: "var(--muted)" }}>
                        {reasonsText}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <button
            className="ucps-iconBtn"
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>

          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            Page {page} of {pages}
          </div>

          <button
            className="ucps-iconBtn"
            type="button"
            disabled={page >= pages || loading}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>

      {/* Drawer */}
      {selected && (
        <div className="ucps-drawerOverlay" onClick={() => setSelected(null)}>
          <div className="ucps-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="ucps-drawerHeader">
              <div>
                <h3 className="ucps-drawerTitle">
                  {selected.firstName} {selected.lastName}
                </h3>

                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="ucps-chip">{selected.status}</span>
                  {selected.country && <span className="ucps-chip">{selected.country}</span>}
                  {selected.city && <span className="ucps-chip">{selected.city}</span>}
                </div>
              </div>

              <button className="ucps-iconBtn" type="button" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>

            {inviteMessage && (
  <div className="ucps-infoBox" style={{ marginTop: 12 }}>
    {inviteMessage}
  </div>
)}

            <div className="ucps-kv">
              <div className="ucps-k">Email</div>
              <div className="ucps-v">{selected.email}</div>
            </div>

            <div className="ucps-kv">
              <div className="ucps-k">Phone</div>
              <div className="ucps-v">{selected.phone || "-"}</div>
            </div>

            <div className="ucps-kv">
              <div className="ucps-k">Skills</div>
              <div className="ucps-v">{(selected.skills || []).join(", ") || "-"}</div>
            </div>

            <div className="ucps-kv">
              <div className="ucps-k">Certifications</div>
              <div className="ucps-v">
                {(selected.certifications || []).join(", ") || "-"}
              </div>
            </div>

            <div className="ucps-kv">
              <div className="ucps-k">Created</div>
              <div className="ucps-v">
                {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "-"}
              </div>
            </div>

            <div className="ucps-kv">
              <div className="ucps-k">Availability in range</div>
              <div className="ucps-v">
                {fromDate && toDate ? (
                  availMap[selected._id] ? (
                    availMap[selected._id].isAvailable ? "Yes" : "No"
                  ) : (
                    "Not checked"
                  )
                ) : (
                  "Select dates"
                )}
              </div>
            </div>

            <div className="ucps-kv">
              <div className="ucps-k">Reasons</div>
              <div className="ucps-v" style={{ color: "var(--muted)" }}>
                {availMap[selected._id]?.reasons?.length
                  ? availMap[selected._id].reasons.join(", ")
                  : "-"}
              </div>
            </div>

<div
  style={{
    marginTop: 16,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  }}
>
  <button
    className="ucps-btnPrimary"
    type="button"
    onClick={() => handleResendEngineerInvite(selected)}
    disabled={inviteSubmitting}
  >
    {inviteSubmitting ? "Sending..." : "Resend invite"}
  </button>
</div>
            <div style={{ marginTop: 14, color: "var(--muted)", fontSize: 12 }}>
              Tip: press Esc to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
}