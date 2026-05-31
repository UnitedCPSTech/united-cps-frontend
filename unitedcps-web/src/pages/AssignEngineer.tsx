import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getJob, type JobItem } from "../api/jobsApi";
import {
  createAssignment,
  listAssignmentsByJob,
  type AssignmentItem,
} from "../api/assignmentsApi";
import { listEngineers, type EngineerItem } from "../api/engineersApi";
import { getJobDates } from "../api/jobDatesApi";
import {
  checkBulkAvailability,
  type AvailabilityResult,
} from "../api/availabilityApi";

type JobDatesData = {
  _id?: string;
  jobId?: string;
  country?: string;
  dateType?: "RANGE" | "MULTI";
  dateFrom?: string | null;
  dateTo?: string | null;
  specificDates?: string[];
};

type AggregatedAvailability = {
  isAvailable: boolean;
  reasons: string[];
  checkedDates: string[];
};

function toUtcMidnightIso(dateStr: string) {
  return new Date(`${dateStr}T00:00:00.000Z`).toISOString();
}

function addDaysToIsoDate(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return value.slice(0, 10);
}

function normalizeCert(value: string) {
  return value.trim().toUpperCase();
}

function getMissingCertificates(engineer: EngineerItem, job: JobItem) {
  const required = (job.requiredCertificateTypes ?? []).map(normalizeCert);
  const engineerCerts = (engineer.certifications ?? []).map(normalizeCert);

  return required.filter((cert) => !engineerCerts.includes(cert));
}

export default function AssignEngineer() {
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId: string }>();

  const [job, setJob] = useState<JobItem | null>(null);
  const [jobDates, setJobDates] = useState<JobDatesData | null>(null);
  const [engineers, setEngineers] = useState<EngineerItem[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<AssignmentItem[]>([]);
  const [availabilityMap, setAvailabilityMap] = useState<
    Record<string, AggregatedAvailability>
  >({});
  const [loading, setLoading] = useState(true);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available">(
    "available",
  );
  const [qualificationFilter, setQualificationFilter] = useState<
    "all" | "qualified"
  >("qualified");
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!jobId) {
        setServerError("Missing job id");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setServerError("");

        const [jobData, jobDatesData, engineersData, assignmentsData] =
          await Promise.all([
            getJob(jobId),
            getJobDates(jobId).catch(() => null),
            listEngineers({ page: 1, limit: 100, status: "ACTIVE" }),
            listAssignmentsByJob(jobId),
          ]);

        if (cancelled) return;

        setJob(jobData);
        setJobDates(jobDatesData);
        setEngineers(engineersData.items ?? []);
        setExistingAssignments(assignmentsData ?? []);
      } catch (error: any) {
        if (cancelled) return;

        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to load assignment data";
        setServerError(Array.isArray(message) ? message.join(", ") : message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      if (!jobDates || engineers.length === 0) {
        setAvailabilityMap({});
        return;
      }

      if (jobDates.dateType !== "RANGE" && jobDates.dateType !== "MULTI") {
        setAvailabilityMap({});
        return;
      }

      const engineerIds = engineers.map((e) => e._id);
      if (engineerIds.length === 0) {
        setAvailabilityMap({});
        return;
      }

      try {
        setCheckingAvailability(true);

        if (
          jobDates.dateType === "RANGE" &&
          jobDates.dateFrom &&
          jobDates.dateTo
        ) {
          const fromDay = formatDate(jobDates.dateFrom);
          const toDay = formatDate(jobDates.dateTo);

          const bulk = await checkBulkAvailability({
            engineerIds,
            from: toUtcMidnightIso(fromDay),
            to: addDaysToIsoDate(toDay, 1),
          });

          if (cancelled) return;

          const nextMap: Record<string, AggregatedAvailability> = {};
          for (const result of bulk.results ?? []) {
            nextMap[result.engineerId] = {
              isAvailable: result.isAvailable,
              reasons: result.reasons ?? [],
              checkedDates: [fromDay, toDay],
            };
          }

          setAvailabilityMap(nextMap);
          return;
        }

        if (
          jobDates.dateType === "MULTI" &&
          Array.isArray(jobDates.specificDates) &&
          jobDates.specificDates.length > 0
        ) {
          const uniqueDates = uniqueStrings(
            jobDates.specificDates.map((d) => formatDate(d)).filter(Boolean),
          );

          const checks = await Promise.all(
            uniqueDates.map((date) =>
              checkBulkAvailability({
                engineerIds,
                from: toUtcMidnightIso(date),
                to: addDaysToIsoDate(date, 1),
              }),
            ),
          );

          if (cancelled) return;

          const nextMap: Record<string, AggregatedAvailability> = {};

          for (const engineerId of engineerIds) {
            const perDateResults: AvailabilityResult[] = checks
              .map(
                (check) =>
                  check.results?.find((r) => r.engineerId === engineerId) ?? null,
              )
              .filter(Boolean) as AvailabilityResult[];

            const isAvailable =
              perDateResults.length === uniqueDates.length &&
              perDateResults.every((r) => r.isAvailable);

            const reasons = uniqueStrings(
              perDateResults.flatMap((r, index) => {
                const date = uniqueDates[index];
                const rawReasons = r.reasons ?? [];
                return rawReasons.length > 0
                  ? rawReasons.map((reason) => `${date}: ${reason}`)
                  : [];
              }),
            );

            nextMap[engineerId] = {
              isAvailable,
              reasons,
              checkedDates: uniqueDates,
            };
          }

          setAvailabilityMap(nextMap);
          return;
        }

        setAvailabilityMap({});
      } catch (error: any) {
        if (cancelled) return;

        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to check engineer availability for this job";
        setServerError(Array.isArray(message) ? message.join(", ") : message);
        setAvailabilityMap({});
      } finally {
        if (!cancelled) {
          setCheckingAvailability(false);
        }
      }
    }

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [jobDates, engineers]);

  const activeAssignmentMap = useMemo(() => {
    const map = new Map<
      string,
      { assignmentId: string; status: "PENDING_ACCEPTANCE" | "ACCEPTED" }
    >();

    for (const assignment of existingAssignments) {
      if (
        assignment.assignmentStatus === "PENDING_ACCEPTANCE" ||
        assignment.assignmentStatus === "ACCEPTED"
      ) {
        map.set(assignment.engineerId, {
          assignmentId: assignment._id,
          status: assignment.assignmentStatus,
        });
      }
    }

    return map;
  }, [existingAssignments]);

  const hasJobDates =
    !!jobDates &&
    ((jobDates.dateType === "RANGE" && jobDates.dateFrom && jobDates.dateTo) ||
      (jobDates.dateType === "MULTI" &&
        Array.isArray(jobDates.specificDates) &&
        jobDates.specificDates.length > 0));

  const filteredEngineers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = engineers.filter((e) => e.status === "ACTIVE");

    let searched = !q
      ? base
      : base.filter((e) => {
        const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
        return (
          fullName.includes(q) ||
          e.email.toLowerCase().includes(q) ||
          (e.city ?? "").toLowerCase().includes(q) ||
          (e.country ?? "").toLowerCase().includes(q)
        );
      });

    if (job) {
      if (availabilityFilter === "available") {
        searched = searched.filter((e) => {
          const av = availabilityMap[e._id];
          return !!av && av.isAvailable;
        });
      }

      if (qualificationFilter === "qualified") {
        searched = searched.filter((e) => {
          return getMissingCertificates(e, job).length === 0;
        });
      }
    }

    return [...searched].sort((a, b) => {
      const avA = availabilityMap[a._id];
      const avB = availabilityMap[b._id];

      const rankA = avA ? (avA.isAvailable ? 2 : 1) : 0;
      const rankB = avB ? (avB.isAvailable ? 2 : 1) : 0;

      if (rankA !== rankB) return rankB - rankA;

      const missA = job ? getMissingCertificates(a, job).length : 999;
      const missB = job ? getMissingCertificates(b, job).length : 999;
      if (missA !== missB) return missA - missB;

      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [engineers, search, availabilityMap, job, availabilityFilter, qualificationFilter]);

  async function handleAssign(engineer: EngineerItem) {
    if (!jobId || !job) return;

    if (!hasJobDates) {
      setServerError("Please set job dates before assigning engineers.");
      return;
    }

    const computed = availabilityMap[engineer._id];
    if (computed && !computed.isAvailable) {
      setServerError(
        `${engineer.firstName} ${engineer.lastName} cannot be assigned because they are not available for these job dates.`,
      );
      return;
    }

    const missingCertificates = getMissingCertificates(engineer, job);
    if (missingCertificates.length > 0) {
      setServerError(
        `${engineer.firstName} ${engineer.lastName} cannot be assigned because they are missing required certificates: ${missingCertificates.join(", ")}.`,
      );
      return;
    }

    if (!engineer.userId) {
      setServerError(
        `Engineer ${engineer.firstName} ${engineer.lastName} does not have a linked user account yet.`,
      );
      return;
    }

    setServerError("");
    setSuccessMessage("");
    setSubmittingId(engineer._id);

    try {
      const engineerNameSnapshot = `${engineer.firstName} ${engineer.lastName}`.trim();

      await createAssignment({
        jobId,
        engineerId: engineer._id,
        engineerUserId: engineer.userId,
        engineerNameSnapshot,
        country: job.country,
      });

      setSuccessMessage(`Assigned ${engineerNameSnapshot} successfully`);

      const refreshedAssignments = await listAssignmentsByJob(jobId);
      setExistingAssignments(refreshedAssignments);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to assign engineer";
      setServerError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setSubmittingId(null);
    }
  }

  if (loading) {
    return (
      <div className="ucps-grid">
        <div className="ucps-card">
          <p className="ucps-actionText">Loading assignment page...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="ucps-grid">
        <div className="ucps-card">
          <p className="ucps-actionText">Job not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ucps-grid">
      <div className="ucps-card">
        <div className="ucps-cardHeader">
          <div>
            <h2 className="ucps-actionTitle">Assign engineer</h2>
            <p className="ucps-actionText">
              Select an engineer for this job.
            </p>
          </div>

          <div className="ucps-cardHeaderRight">
            <button
              className="ucps-iconBtn"
              type="button"
              onClick={() => navigate("/jobs/list")}
            >
              Back
            </button>
          </div>
        </div>

        {serverError ? <div className="ucps-banner">{serverError}</div> : null}
        {successMessage ? <div className="ucps-card">{successMessage}</div> : null}

        {!hasJobDates ? (
          <div className="ucps-banner" style={{ marginTop: 12 }}>
            This job does not have dates yet. Set job dates before assigning engineers.
          </div>
        ) : null}

        <div className="ucps-card" style={{ boxShadow: "none", marginTop: 12 }}>
          <h3 className="ucps-actionTitle" style={{ marginBottom: 8 }}>
            Job summary
          </h3>

          <div className="ucps-kv">
            <div className="ucps-k">Job</div>
            <div className="ucps-v">{job.jobTitle}</div>
          </div>
          <div className="ucps-kv">
            <div className="ucps-k">Client</div>
            <div className="ucps-v">{job.clientNameSnapshot}</div>
          </div>
          <div className="ucps-kv">
            <div className="ucps-k">Location</div>
            <div className="ucps-v">{job.locationText}</div>
          </div>
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
            <div className="ucps-k">Dates</div>
            <div className="ucps-v">
              {!jobDates ? (
                "No dates set"
              ) : jobDates.dateType === "RANGE" ? (
                `${formatDate(jobDates.dateFrom)} to ${formatDate(jobDates.dateTo)}`
              ) : (
                jobDates.specificDates?.map((d) => formatDate(d)).join(", ") || "No dates set"
              )}
            </div>
          </div>
          <div className="ucps-kv">
            <div className="ucps-k">Required certificates</div>
            <div className="ucps-v">
              {job.requiredCertificateTypes?.length
                ? job.requiredCertificateTypes.join(", ")
                : "None"}
            </div>
          </div>
        </div>

        <div className="ucps-filters" style={{ marginTop: 12 }}>
          <input
            className="ucps-input"
            placeholder="Search engineer by name, email, city or country"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="ucps-input"
            value={availabilityFilter}
            onChange={(e) =>
              setAvailabilityFilter(e.target.value as "all" | "available")
            }
          >
            <option value="available">Available only</option>
            <option value="all">All availability</option>
          </select>

          <select
            className="ucps-input"
            value={qualificationFilter}
            onChange={(e) =>
              setQualificationFilter(e.target.value as "all" | "qualified")
            }
          >
            <option value="qualified">Qualified only</option>
            <option value="all">All qualifications</option>
          </select>
        </div>

        {checkingAvailability ? (
          <p className="ucps-actionText" style={{ marginTop: 12 }}>
            Checking engineer availability for the selected job dates...
          </p>
        ) : null}

        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          {filteredEngineers.length === 0 ? (
            <div className="ucps-card" style={{ boxShadow: "none" }}>
              <p className="ucps-actionText" style={{ margin: 0 }}>
                No active engineers found.
              </p>
            </div>
          ) : (
            filteredEngineers.map((engineer) => {
              const activeAssignment = activeAssignmentMap.get(engineer._id);
              const alreadyAssigned = !!activeAssignment; const fullName = `${engineer.firstName} ${engineer.lastName}`.trim();
              const computedAvailability = availabilityMap[engineer._id];
              const missingCertificates = getMissingCertificates(engineer, job);
              const isQualified = missingCertificates.length === 0;
              const isUnavailable =
                !!computedAvailability && !computedAvailability.isAvailable;

              let availabilityLabel = "Not checked";
              if (hasJobDates) {
                availabilityLabel = computedAvailability
                  ? computedAvailability.isAvailable
                    ? "Available for this job"
                    : "Not available for this job"
                  : "Not checked";
              }

              return (
                <div key={engineer._id} className="ucps-card" style={{ boxShadow: "none" }}>
                  <div className="ucps-cardHeader">
                    <div>
                      <h3 className="ucps-actionTitle" style={{ marginBottom: 4 }}>
                        {fullName}
                      </h3>
                      <p className="ucps-actionText" style={{ marginBottom: 0 }}>
                        {engineer.email}
                        {engineer.city || engineer.country
                          ? `, ${[engineer.city, engineer.country]
                            .filter(Boolean)
                            .join(", ")}`
                          : ""}
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span className="ucps-chip">{engineer.status}</span>
                      <span className="ucps-chip">{availabilityLabel}</span>
                      <span className="ucps-chip">
                        {isQualified ? "Qualified" : "Missing certificates"}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div className="ucps-kv">
                      <div className="ucps-k">Skills</div>
                      <div className="ucps-v">
                        {engineer.skills?.length ? engineer.skills.join(", ") : "—"}
                      </div>
                    </div>

                    <div className="ucps-kv">
                      <div className="ucps-k">Certifications</div>
                      <div className="ucps-v">
                        {engineer.certifications?.length
                          ? engineer.certifications.join(", ")
                          : "—"}
                      </div>
                    </div>

                    <div className="ucps-kv">
                      <div className="ucps-k">Qualification</div>
                      <div className="ucps-v">
                        {isQualified
                          ? "Meets all required certificates"
                          : `Missing: ${missingCertificates.join(", ")}`}
                      </div>
                    </div>

                    <div className="ucps-kv">
                      <div className="ucps-k">Availability reasons</div>
                      <div className="ucps-v">
                        {computedAvailability?.reasons?.length
                          ? computedAvailability.reasons.join(", ")
                          : "—"}
                      </div>
                    </div>
                  </div>

                  {alreadyAssigned || isUnavailable || !isQualified ? (
                    <div className="ucps-banner" style={{ marginTop: 12 }}>
                      {alreadyAssigned
                        ? activeAssignment?.status === "PENDING_ACCEPTANCE"
                          ? "This engineer already has a pending assignment for this job."
                          : "This engineer already has an accepted assignment for this job."
                        : isUnavailable
                          ? "You cannot assign this engineer because they are not available for the selected job dates."
                          : `You cannot assign this engineer because they do not meet the certificate requirements. Missing: ${missingCertificates.join(", ")}.`}
                    </div>
                  ) : null}

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
                      disabled={
                        !hasJobDates ||
                        alreadyAssigned ||
                        submittingId === engineer._id ||
                        isUnavailable ||
                        !isQualified
                      }
                      onClick={() => handleAssign(engineer)}
                    >
                      {alreadyAssigned
                        ? activeAssignment?.status === "PENDING_ACCEPTANCE"
                          ? "Pending assignment exists"
                          : "Already accepted"
                        : submittingId === engineer._id
                          ? "Assigning..."
                          : "Assign engineer"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}