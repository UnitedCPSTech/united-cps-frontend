import { useEffect, useMemo, useState } from "react";
import {
  listAssignments,
  setAssignmentStatus,
  type AssignmentItem,
} from "../api/assignmentsApi";
import { getJob } from "../api/jobsApi";

type SortDir = "desc" | "asc";

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function Assignments() {
  const [items, setItems] = useState<AssignmentItem[]>([]);
  const [jobTitleMap, setJobTitleMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<AssignmentItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function loadAssignments() {
    try {
      setLoading(true);
      setError("");

      const data = await listAssignments(
        statusFilter ? { status: statusFilter } : undefined,
      );

      setItems(data);

      const uniqueJobIds = Array.from(new Set(data.map((x) => x.jobId)));
      const pairs = await Promise.all(
        uniqueJobIds.map(async (jobId) => {
          try {
            const job = await getJob(jobId);
            return [jobId, job.jobTitle] as const;
          } catch {
            return [jobId, "Unknown job"] as const;
          }
        }),
      );

      const nextMap: Record<string, string> = {};
      for (const [jobId, title] of pairs) {
        nextMap[jobId] = title;
      }
      setJobTitleMap(nextMap);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load assignments";
      setError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssignments();
  }, [statusFilter]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    let result = items;

    if (q) {
      result = result.filter((item) => {
        const jobTitle = (jobTitleMap[item.jobId] ?? "").toLowerCase();

        return (
          item.engineerNameSnapshot.toLowerCase().includes(q) ||
          item.country.toLowerCase().includes(q) ||
          item.jobId.toLowerCase().includes(q) ||
          item.engineerId.toLowerCase().includes(q) ||
          jobTitle.includes(q)
        );
      });
    }

    result = [...result].sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortDir === "desc" ? bt - at : at - bt;
    });

    return result;
  }, [items, search, jobTitleMap, sortDir]);

  const summary = useMemo(() => {
    return {
      total: items.length,
      pending: items.filter((x) => x.assignmentStatus === "PENDING_ACCEPTANCE").length,
      accepted: items.filter((x) => x.assignmentStatus === "ACCEPTED").length,
      declined: items.filter((x) => x.assignmentStatus === "DECLINED").length,
      cancelled: items.filter((x) => x.assignmentStatus === "CANCELLED").length,
    };
  }, [items]);

  async function handleManagerAction(
    status: "ACCEPTED" | "DECLINED" | "CANCELLED",
  ) {
    if (!selected) return;

    let note: string | undefined;

    if (status === "DECLINED") {
      const reason = window.prompt("Enter decline reason");
      if (!reason || !reason.trim()) return;
      note = reason.trim();
    }

    if (status === "CANCELLED") {
      const reason = window.prompt("Enter cancel reason");
      if (!reason || !reason.trim()) return;
      note = reason.trim();
    }

    try {
      setActionLoading(true);
      setError("");

      const updated = await setAssignmentStatus(selected._id, {
        status,
        note,
      });

      setSelected(updated);
      await loadAssignments();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update assignment status";
      setError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="ucps-grid">
      <div className="ucps-card">
        <div className="ucps-cardHeader">
          <div>
            <h3 className="ucps-actionTitle">Assignments</h3>
            <p className="ucps-actionText">
              View job assignments and track acceptance status.
            </p>
          </div>
        </div>

        {error ? <div className="ucps-banner">{error}</div> : null}

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span className="ucps-chip">Total: {summary.total}</span>
          <span className="ucps-chip">Pending: {summary.pending}</span>
          <span className="ucps-chip">Accepted: {summary.accepted}</span>
          <span className="ucps-chip">Declined: {summary.declined}</span>
          <span className="ucps-chip">Cancelled: {summary.cancelled}</span>
        </div>

        <div className="ucps-filters" style={{ marginTop: 12 }}>
          <input
            className="ucps-input"
            placeholder="Search by engineer name, job title, job id, engineer id, country"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="ucps-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="PENDING_ACCEPTANCE">Pending acceptance</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="DECLINED">Declined</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            className="ucps-input"
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value as SortDir)}
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>

        <div style={{ marginTop: 14 }}>
          {loading ? (
            <p className="ucps-actionText">Loading assignments...</p>
          ) : filteredItems.length === 0 ? (
            <p className="ucps-actionText">No assignments found.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {filteredItems.map((item) => (
                <div
                  key={item._id}
                  className="ucps-card ucps-rowClickable"
                  style={{ boxShadow: "none" }}
                  onClick={() => setSelected(item)}
                >
                  <div className="ucps-cardHeader">
                    <div>
                      <h4 className="ucps-actionTitle" style={{ marginBottom: 4 }}>
                        {item.engineerNameSnapshot}
                      </h4>
                      <p className="ucps-actionText" style={{ marginBottom: 0 }}>
                        Job: {jobTitleMap[item.jobId] ?? "Loading..."}
                      </p>
                    </div>

                    <span className="ucps-chip">{item.assignmentStatus}</span>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div className="ucps-kv">
                      <div className="ucps-k">Country</div>
                      <div className="ucps-v">{item.country}</div>
                    </div>
                    <div className="ucps-kv">
                      <div className="ucps-k">Acceptance deadline</div>
                      <div className="ucps-v">
                        {formatDateTime(item.acceptanceDeadlineAt)}
                      </div>
                    </div>
                    <div className="ucps-kv">
                      <div className="ucps-k">Created</div>
                      <div className="ucps-v">{formatDateTime(item.createdAt)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected ? (
        <div className="ucps-drawerOverlay" onClick={() => setSelected(null)}>
          <div className="ucps-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="ucps-drawerHeader">
              <div>
                <h3 className="ucps-drawerTitle">Assignment details</h3>
                <p className="ucps-actionText" style={{ marginTop: 6 }}>
                  Review the selected assignment.
                </p>
              </div>

              <button className="ucps-iconBtn" type="button" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>

            <div style={{ marginTop: 16 }}>
              <div className="ucps-kv">
                <div className="ucps-k">Engineer</div>
                <div className="ucps-v">{selected.engineerNameSnapshot}</div>
              </div>
              <div className="ucps-kv">
                <div className="ucps-k">Job title</div>
                <div className="ucps-v">{jobTitleMap[selected.jobId] ?? "Loading..."}</div>
              </div>
              <div className="ucps-kv">
                <div className="ucps-k">Assignment status</div>
                <div className="ucps-v">{selected.assignmentStatus}</div>
              </div>
              <div className="ucps-kv">
                <div className="ucps-k">Job ID</div>
                <div className="ucps-v">{selected.jobId}</div>
              </div>
              <div className="ucps-kv">
                <div className="ucps-k">Engineer ID</div>
                <div className="ucps-v">{selected.engineerId}</div>
              </div>
              <div className="ucps-kv">
                <div className="ucps-k">Engineer user ID</div>
                <div className="ucps-v">{selected.engineerUserId}</div>
              </div>
              <div className="ucps-kv">
                <div className="ucps-k">Country</div>
                <div className="ucps-v">{selected.country}</div>
              </div>
              <div className="ucps-kv">
                <div className="ucps-k">Acceptance deadline</div>
                <div className="ucps-v">
                  {formatDateTime(selected.acceptanceDeadlineAt)}
                </div>
              </div>
              <div className="ucps-kv">
                <div className="ucps-k">Accepted at</div>
                <div className="ucps-v">{formatDateTime(selected.acceptedAt)}</div>
              </div>
              <div className="ucps-kv">
                <div className="ucps-k">Declined at</div>
                <div className="ucps-v">{formatDateTime(selected.declinedAt)}</div>
              </div>
              <div className="ucps-kv">
                <div className="ucps-k">Decline reason</div>
                <div className="ucps-v">{selected.declineReason || "—"}</div>
              </div>
              <div className="ucps-kv">
                <div className="ucps-k">Cancelled at</div>
                <div className="ucps-v">{formatDateTime(selected.cancelledAt)}</div>
              </div>
              <div className="ucps-kv">
                <div className="ucps-k">Cancel reason</div>
                <div className="ucps-v">{selected.cancelReason || "—"}</div>
              </div>
              <div className="ucps-kv">
                <div className="ucps-k">Created</div>
                <div className="ucps-v">{formatDateTime(selected.createdAt)}</div>
              </div>
              <div className="ucps-kv">
                <div className="ucps-k">Updated</div>
                <div className="ucps-v">{formatDateTime(selected.updatedAt)}</div>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <h4 className="ucps-actionTitle">Manager actions</h4>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                {selected.assignmentStatus !== "ACCEPTED" &&
                selected.assignmentStatus !== "CANCELLED" ? (
                  <button
                    className="ucps-btnPrimary"
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleManagerAction("ACCEPTED")}
                  >
                    {actionLoading ? "Saving..." : "Accept"}
                  </button>
                ) : null}

                {selected.assignmentStatus !== "DECLINED" &&
                selected.assignmentStatus !== "CANCELLED" ? (
                  <button
                    className="ucps-btnPrimary"
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleManagerAction("DECLINED")}
                  >
                    {actionLoading ? "Saving..." : "Decline"}
                  </button>
                ) : null}

                {selected.assignmentStatus !== "CANCELLED" ? (
                  <button
                    className="ucps-btnPrimary"
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleManagerAction("CANCELLED")}
                  >
                    {actionLoading ? "Saving..." : "Cancel"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}