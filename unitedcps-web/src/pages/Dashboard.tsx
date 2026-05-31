import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listJobs, type JobItem } from "../api/jobsApi";
import { listAssignments, type AssignmentItem } from "../api/assignmentsApi";
import { listEngineers, type EngineerItem } from "../api/engineersApi";
import { listClients, type ClientItem } from "../api/clientsApi";
import {
  listCertificates,
  type CertificateItem,
} from "../api/certificatesApi";

type ActivityItem = {
  id: string;
  type:
    | "job_created"
    | "assignment_created"
    | "engineer_added"
    | "client_created"
    | "certificate_created";
  title: string;
  subtitle: string;
  createdAt: string;
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function getCurrentUserIdFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const payload = JSON.parse(atob(parts[1]));
    return payload?.sub ?? null;
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [engineers, setEngineers] = useState<EngineerItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [recentError, setRecentError] = useState("");

  const actions = [
  {
    title: "Create job",
    text: "Add a new job request and required skills.",
    cta: "Create job",
    onClick: () => navigate("/jobs/create"),
  },
  {
    title: "Add engineer",
    text: "Register a new engineer, skills and location.",
    cta: "Add engineer",
    onClick: () => navigate("/engineers/create"),
  },
  {
    title: "Assign engineer",
    text: "Match an engineer to an open job.",
    cta: "Assign",
    onClick: () => navigate("/assignments"),
  },
  {
    title: "Clients",
    text: "Add and manage client records used for jobs.",
    cta: "Clients",
    onClick: () => navigate("/clients"),
  },
  {
    title: "Certificates",
    text: "Add and manage reusable certificate records.",
    cta: "Certificates",
    onClick: () => navigate("/certificates"),
  },
];

  useEffect(() => {
    let cancelled = false;

    async function loadRecent() {
      try {
        setLoadingRecent(true);
        setRecentError("");

        const [
          jobsData,
          assignmentsData,
          engineersData,
          clientsData,
          certificatesData,
        ] = await Promise.all([
          listJobs(),
          listAssignments(),
          listEngineers({ page: 1, limit: 50 }),
          listClients(),
          listCertificates({ isActive: "" }),
        ]);

        if (cancelled) return;

        setJobs(jobsData ?? []);
        setAssignments(assignmentsData ?? []);
        setEngineers(engineersData.items ?? []);
        setClients(clientsData ?? []);
        setCertificates(certificatesData ?? []);
      } catch (error: any) {
        if (cancelled) return;

        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to load recent activity";
        setRecentError(Array.isArray(message) ? message.join(", ") : message);
      } finally {
        if (!cancelled) setLoadingRecent(false);
      }
    }

    loadRecent();

    return () => {
      cancelled = true;
    };
  }, []);

  const recentActivities = useMemo(() => {
    const userId = getCurrentUserIdFromToken();
    const now = Date.now();
    const daysBack = 5;
    const cutoff = now - daysBack * 24 * 60 * 60 * 1000;

    const items: ActivityItem[] = [];

    for (const job of jobs) {
      const createdAt = new Date(job.createdAt).getTime();
      if (createdAt >= cutoff && (!userId || job.createdByUserId === userId)) {
        items.push({
          id: `job-${job._id}`,
          type: "job_created",
          title: `Created job, ${job.jobTitle}`,
          subtitle: `${job.clientNameSnapshot}, ${job.locationText}`,
          createdAt: job.createdAt,
        });
      }
    }

    for (const assignment of assignments) {
      const createdAt = assignment.createdAt
        ? new Date(assignment.createdAt).getTime()
        : 0;
      const assignedByUserId = assignment.assignedByUserId;

      if (
        assignment.createdAt &&
        createdAt >= cutoff &&
        (!userId || assignedByUserId === userId)
      ) {
        items.push({
          id: `assignment-${assignment._id}`,
          type: "assignment_created",
          title: `Assigned engineer, ${assignment.engineerNameSnapshot}`,
          subtitle: `Status: ${assignment.assignmentStatus}`,
          createdAt: assignment.createdAt,
        });
      }
    }

    for (const engineer of engineers) {
      const createdAt = engineer.createdAt
        ? new Date(engineer.createdAt).getTime()
        : 0;

      if (engineer.createdAt && createdAt >= cutoff) {
        items.push({
          id: `engineer-${engineer._id}`,
          type: "engineer_added",
          title: `Engineer added, ${engineer.firstName} ${engineer.lastName}`,
          subtitle: engineer.email,
          createdAt: engineer.createdAt,
        });
      }
    }

    for (const client of clients) {
      const createdAt = client.createdAt
        ? new Date(client.createdAt).getTime()
        : 0;

      if (client.createdAt && createdAt >= cutoff) {
        items.push({
          id: `client-${client._id}`,
          type: "client_created",
          title: `Client added, ${client.name}`,
          subtitle: `${client.city}, ${client.country}`,
          createdAt: client.createdAt,
        });
      }
    }

    for (const certificate of certificates) {
      const createdAt = certificate.createdAt
        ? new Date(certificate.createdAt).getTime()
        : 0;

      if (certificate.createdAt && createdAt >= cutoff) {
        items.push({
          id: `certificate-${certificate._id}`,
          type: "certificate_created",
          title: `Certificate added, ${certificate.code}`,
          subtitle: certificate.name,
          createdAt: certificate.createdAt,
        });
      }
    }

    return items
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 15);
  }, [jobs, assignments, engineers, clients, certificates]);

  return (
    <div className="ucps-grid">
      <div className="ucps-card">
        <h2 className="ucps-actionTitle">Welcome</h2>
        <p className="ucps-actionText">
          Use the actions below to manage jobs, engineers, assignments, and
          master data.
        </p>
      </div>

      <div className="ucps-actions">
        {actions.map((a) => (
          <div key={a.title} className="ucps-card">
            <h3 className="ucps-actionTitle">{a.title}</h3>
            <p className="ucps-actionText">{a.text}</p>
            <button className="ucps-primary" type="button" onClick={a.onClick}>
              {a.cta}
            </button>
          </div>
        ))}
      </div>

      <div className="ucps-card">
        <h3 className="ucps-actionTitle">Recent activity</h3>
        <p className="ucps-actionText">
          Showing recent activity from the last 5 days.
        </p>

        {recentError ? <div className="ucps-banner">{recentError}</div> : null}

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {loadingRecent ? (
            <p className="ucps-actionText">Loading recent activity...</p>
          ) : recentActivities.length === 0 ? (
            <p className="ucps-actionText">No recent activity found.</p>
          ) : (
            recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="ucps-card"
                style={{ boxShadow: "none", padding: 12 }}
              >
                <h4 className="ucps-actionTitle" style={{ marginBottom: 4 }}>
                  {activity.title}
                </h4>
                <p className="ucps-actionText" style={{ marginBottom: 6 }}>
                  {activity.subtitle}
                </p>
                <p
                  className="ucps-actionText"
                  style={{ margin: 0, fontSize: 12 }}
                >
                  {formatDateTime(activity.createdAt)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}