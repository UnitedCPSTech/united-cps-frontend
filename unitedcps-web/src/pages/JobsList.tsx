import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  cancelJob,
  completeJob,
  getJob,
  listJobs,
  type JobItem,
} from "../api/jobsApi";
import { getJobDates } from "../api/jobDatesApi";
import {
  listAssignmentsByJob,
  type AssignmentItem,
} from "../api/assignmentsApi";

type JobDatesData = {
  _id?: string;
  jobId?: string;
  country?: string;
  dateType?: "RANGE" | "MULTI";
  dateFrom?: string | null;
  dateTo?: string | null;
  specificDates?: string[];
};

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

function summarizeAssignments(assignments: AssignmentItem[]) {
  const counts = {
    PENDING_ACCEPTANCE: 0,
    ACCEPTED: 0,
    DECLINED: 0,
    CANCELLED: 0,
  };

  assignments.forEach((a) => {
    counts[a.assignmentStatus] += 1;
  });

  return counts;
}

export default function JobsList() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null);
  const [selectedJobDates, setSelectedJobDates] =
    useState<JobDatesData | null>(null);
  const [selectedAssignments, setSelectedAssignments] = useState<
    AssignmentItem[]
  >([]);
  const [loadingDrawer, setLoadingDrawer] = useState(false);
  const [drawerError, setDrawerError] = useState("");

  const [actionLoading, setActionLoading] = useState(false);

  async function loadJobs() {
    try {
      setLoading(true);
      setError("");

      const data = await listJobs(
        statusFilter ? { status: statusFilter } : undefined
      );

      setJobs(data);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || "Failed to load jobs";

      setError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, [statusFilter]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;

    return jobs.filter((job) => {
      return (
        job.jobTitle.toLowerCase().includes(q) ||
        job.clientNameSnapshot.toLowerCase().includes(q) ||
        job.locationText.toLowerCase().includes(q) ||
        job.country.toLowerCase().includes(q)
      );
    });
  }, [jobs, search]);

  async function openDrawer(jobId: string) {
    try {
      setDrawerOpen(true);
      setLoadingDrawer(true);
      setDrawerError("");

      const [job, jobDates, assignments] = await Promise.all([
        getJob(jobId),
        getJobDates(jobId).catch(() => null),
        listAssignmentsByJob(jobId).catch(() => []),
      ]);

      setSelectedJob(job);
      setSelectedJobDates(jobDates);
      setSelectedAssignments(assignments);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load job details";

      setDrawerError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setLoadingDrawer(false);
    }
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelectedJob(null);
    setSelectedJobDates(null);
    setSelectedAssignments([]);
    setDrawerError("");
  }

  async function handleCancelJob() {
    if (!selectedJob) return;

    const reason = window.prompt("Enter cancel reason");
    if (!reason || !reason.trim()) return;

    try {
      setActionLoading(true);
      const updated = await cancelJob(selectedJob._id, reason.trim());
      setSelectedJob(updated);
      await loadJobs();
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || "Failed to cancel job";

      setDrawerError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCompleteJob() {
    if (!selectedJob) return;

    const note = window.prompt("Enter completion note (optional)") ?? "";

    try {
      setActionLoading(true);
      const updated = await completeJob(
        selectedJob._id,
        note.trim() || undefined
      );

      setSelectedJob(updated);
      await loadJobs();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to complete job";

      setDrawerError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setActionLoading(false);
    }
  }

  const selectedAssignmentSummary = summarizeAssignments(selectedAssignments);

  return (
    <div className="ucps-grid">
      <div className="ucps-card">
        <div className="ucps-cardHeader">
          <div>
            <h3 className="ucps-actionTitle">Job list</h3>
            <p className="ucps-actionText">
              View jobs and continue to dates, assignments, or job completion.
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

            <button
              className="ucps-btnPrimary"
              type="button"
              onClick={() => navigate("/jobs/create")}
            >
              Create job
            </button>
          </div>
        </div>

        {error ? <div className="ucps-banner">{error}</div> : null}

        <div className="ucps-filters">
          <input
            className="ucps-input"
            placeholder="Search by title, client, location or country"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="ucps-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All job statuses</option>
            <option value="OPEN">Open</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <div style={{ marginTop: 14 }}>
          {loading ? (
            <p className="ucps-actionText">Loading jobs...</p>
          ) : filteredJobs.length === 0 ? (
            <p className="ucps-actionText">No jobs found.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {filteredJobs.map((job) => (
                <div
                  key={job._id}
                  className="ucps-card"
                  style={{ boxShadow: "none" }}
                >
                  <div className="ucps-cardHeader">
                    <div>
                      <h4
                        className="ucps-actionTitle"
                        style={{ marginBottom: 4 }}
                      >
                        {job.jobTitle}
                      </h4>

                      <p
                        className="ucps-actionText"
                        style={{ marginBottom: 0 }}
                      >
                        {job.clientNameSnapshot}, {job.locationText}
                      </p>
                    </div>

                    <span className="ucps-chip">{job.status}</span>
                  </div>

                  <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    <div className="ucps-kv">
                      <div className="ucps-k">Country</div>
                      <div className="ucps-v">{job.country}</div>
                    </div>

                    <div className="ucps-kv">
                      <div className="ucps-k">Time</div>
                      <div className="ucps-v">
                        {job.startTimeLocal} to {job.endTimeLocal}
                      </div>
                    </div>

                    <div className="ucps-kv">
                      <div className="ucps-k">Certificates</div>
                      <div className="ucps-v">
                        {job.requiredCertificateTypes?.length
                          ? job.requiredCertificateTypes.join(", ")
                          : "None"}
                      </div>
                    </div>
                  </div>

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
                      onClick={() => navigate(`/jobs/${job._id}/dates`)}
                    >
                      Set dates
                    </button>

                    <button
                      className="ucps-btnPrimary"
                      type="button"
                      onClick={() => openDrawer(job._id)}
                    >
                      View details
                    </button>

                    <button
                      className="ucps-btnPrimary"
                      type="button"
                      onClick={() => navigate(`/jobs/${job._id}/assign`)}
                    >
                      Assign engineer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {drawerOpen ? (
        <div className="ucps-drawerOverlay" onClick={closeDrawer}>
          <div className="ucps-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="ucps-drawerHeader">
              <div>
                <h3 className="ucps-drawerTitle">Job details</h3>
                <p className="ucps-actionText" style={{ marginTop: 6 }}>
                  Review job details, dates, and assignments.
                </p>
              </div>

              <button
                className="ucps-iconBtn"
                type="button"
                onClick={closeDrawer}
              >
                Close
              </button>
            </div>

            {drawerError ? (
              <div className="ucps-banner">{drawerError}</div>
            ) : null}

            {loadingDrawer || !selectedJob ? (
              <p className="ucps-actionText" style={{ marginTop: 16 }}>
                Loading details...
              </p>
            ) : (
              <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
                <div className="ucps-card" style={{ boxShadow: "none" }}>
                  <div className="ucps-cardHeader">
                    <div>
                      <h3
                        className="ucps-actionTitle"
                        style={{ marginBottom: 4 }}
                      >
                        {selectedJob.jobTitle}
                      </h3>

                      <p
                        className="ucps-actionText"
                        style={{ marginBottom: 0 }}
                      >
                        {selectedJob.clientNameSnapshot}
                      </p>
                    </div>

                    <span className="ucps-chip">{selectedJob.status}</span>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div className="ucps-kv">
                      <div className="ucps-k">Country</div>
                      <div className="ucps-v">{selectedJob.country}</div>
                    </div>

                    <div className="ucps-kv">
                      <div className="ucps-k">Location</div>
                      <div className="ucps-v">{selectedJob.locationText}</div>
                    </div>

                    <div className="ucps-kv">
                      <div className="ucps-k">Address</div>
                      <div className="ucps-v">
                        {[
                          selectedJob.location.addressLine1,
                          selectedJob.location.city,
                          selectedJob.location.region,
                          selectedJob.location.postcode,
                          selectedJob.location.country,
                        ]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </div>
                    </div>

                    <div className="ucps-kv">
                      <div className="ucps-k">Time</div>
                      <div className="ucps-v">
                        {selectedJob.startTimeLocal} to{" "}
                        {selectedJob.endTimeLocal}
                      </div>
                    </div>

                    <div className="ucps-kv">
                      <div className="ucps-k">Time zone</div>
                      <div className="ucps-v">
                        {selectedJob.timeZone || "—"}
                      </div>
                    </div>

                    <div className="ucps-kv">
                      <div className="ucps-k">Certificates</div>
                      <div className="ucps-v">
                        {selectedJob.requiredCertificateTypes?.length
                          ? selectedJob.requiredCertificateTypes.join(", ")
                          : "None"}
                      </div>
                    </div>

                    <div className="ucps-kv">
                      <div className="ucps-k">Description</div>
                      <div className="ucps-v">
                        {selectedJob.description || "—"}
                      </div>
                    </div>

                    <div className="ucps-kv">
                      <div className="ucps-k">Created</div>
                      <div className="ucps-v">
                        {formatDateTime(selectedJob.createdAt)}
                      </div>
                    </div>

                    <div className="ucps-kv">
                      <div className="ucps-k">Last updated</div>
                      <div className="ucps-v">
                        {formatDateTime(selectedJob.updatedAt)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ucps-card" style={{ boxShadow: "none" }}>
                  <h4 className="ucps-actionTitle">Job dates</h4>

                  {!selectedJobDates ? (
                    <p className="ucps-actionText">No dates set yet.</p>
                  ) : (
                    <div style={{ marginTop: 12 }}>
                      <div className="ucps-kv">
                        <div className="ucps-k">Date type</div>
                        <div className="ucps-v">
                          {selectedJobDates.dateType || "—"}
                        </div>
                      </div>

                      {selectedJobDates.dateType === "RANGE" ? (
                        <>
                          <div className="ucps-kv">
                            <div className="ucps-k">From</div>
                            <div className="ucps-v">
                              {formatDate(selectedJobDates.dateFrom)}
                            </div>
                          </div>

                          <div className="ucps-kv">
                            <div className="ucps-k">To</div>
                            <div className="ucps-v">
                              {formatDate(selectedJobDates.dateTo)}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="ucps-kv">
                          <div className="ucps-k">Specific dates</div>
                          <div className="ucps-v">
                            {selectedJobDates.specificDates?.length
                              ? selectedJobDates.specificDates
                                  .map((d) => formatDate(d))
                                  .join(", ")
                              : "—"}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ marginTop: 12 }}>
                    <button
                      className="ucps-btnPrimary"
                      type="button"
                      onClick={() =>
                        navigate(`/jobs/${selectedJob._id}/dates`)
                      }
                    >
                      Edit dates
                    </button>
                  </div>
                </div>

                <div className="ucps-card" style={{ boxShadow: "none" }}>
                  <h4 className="ucps-actionTitle">Assignments</h4>

                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <span className="ucps-chip">
                      Pending:{" "}
                      {selectedAssignmentSummary.PENDING_ACCEPTANCE}
                    </span>

                    <span className="ucps-chip">
                      Accepted: {selectedAssignmentSummary.ACCEPTED}
                    </span>

                    <span className="ucps-chip">
                      Declined: {selectedAssignmentSummary.DECLINED}
                    </span>

                    <span className="ucps-chip">
                      Cancelled: {selectedAssignmentSummary.CANCELLED}
                    </span>
                  </div>

                  <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                    {selectedAssignments.length === 0 ? (
                      <p className="ucps-actionText">No assignments yet.</p>
                    ) : (
                      selectedAssignments.map((assignment) => (
                        <div
                          key={assignment._id}
                          className="ucps-card"
                          style={{ boxShadow: "none", padding: 12 }}
                        >
                          <div className="ucps-cardHeader">
                            <div>
                              <h5
                                className="ucps-actionTitle"
                                style={{ marginBottom: 4 }}
                              >
                                {assignment.engineerNameSnapshot}
                              </h5>

                              <p
                                className="ucps-actionText"
                                style={{ marginBottom: 0 }}
                              >
                                Deadline:{" "}
                                {formatDateTime(
                                  assignment.acceptanceDeadlineAt
                                )}
                              </p>
                            </div>

                            <span className="ucps-chip">
                              {assignment.assignmentStatus}
                            </span>
                          </div>

                          {assignment.declineReason ? (
                            <p
                              className="ucps-actionText"
                              style={{ marginTop: 10 }}
                            >
                              Decline reason: {assignment.declineReason}
                            </p>
                          ) : null}

                          {assignment.cancelReason ? (
                            <p
                              className="ucps-actionText"
                              style={{ marginTop: 10 }}
                            >
                              Cancel reason: {assignment.cancelReason}
                            </p>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="ucps-card" style={{ boxShadow: "none" }}>
                  <h4 className="ucps-actionTitle">Job actions</h4>

                  {selectedJob.status === "CANCELLED" ? (
                    <p className="ucps-actionText" style={{ marginTop: 12 }}>
                      Cancel reason: {selectedJob.cancelReason || "—"}
                    </p>
                  ) : null}

                  {selectedJob.status === "COMPLETED" ? (
                    <p className="ucps-actionText" style={{ marginTop: 12 }}>
                      Completion note: {selectedJob.completionNote || "—"}
                    </p>
                  ) : null}

                  <div
                    style={{
                      marginTop: 14,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    {selectedJob.status === "OPEN" ? (
                      <>
                        <button
                          className="ucps-btnPrimary"
                          type="button"
                          onClick={() =>
                            navigate(`/jobs/${selectedJob._id}/edit`)
                          }
                        >
                          Edit job
                        </button>

                        <button
                          className="ucps-btnPrimary"
                          type="button"
                          onClick={handleCompleteJob}
                          disabled={actionLoading}
                        >
                          {actionLoading ? "Saving..." : "Mark complete"}
                        </button>

                        <button
                          className="ucps-btnPrimary"
                          type="button"
                          onClick={handleCancelJob}
                          disabled={actionLoading}
                        >
                          Cancel job
                        </button>

                        <button
                          className="ucps-btnPrimary"
                          type="button"
                          onClick={() =>
                            navigate(`/jobs/${selectedJob._id}/assign`)
                          }
                        >
                          Assign engineer
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}