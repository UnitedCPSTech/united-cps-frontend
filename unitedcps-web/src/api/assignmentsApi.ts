import axios from "axios";

export const assignmentsApi = axios.create({
  baseURL: import.meta.env.VITE_JOBS_API_URL,
});

assignmentsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type AssignmentItem = {
  _id: string;
  jobId: string;
  engineerId: string;
  engineerUserId?: string;
  engineerNameSnapshot: string;
  country: string;
  assignedByUserId?: string;
  assignmentStatus:
    | "PENDING_ACCEPTANCE"
    | "ACCEPTED"
    | "DECLINED"
    | "CANCELLED";
  acceptanceDeadlineAt?: string | null;
  acceptedAt?: string | null;
  declinedAt?: string | null;
  declineReason?: string | null;
  cancelledAt?: string | null;
  cancelledByUserId?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateAssignmentPayload = {
  jobId: string;
  engineerId: string;
  engineerUserId: string;
  engineerNameSnapshot: string;
  country: string;
  acceptanceDeadlineAt?: string;
};

export async function listAssignments(params?: {
  jobId?: string;
  engineerId?: string;
  status?: string;
}) {
  const { data } = await assignmentsApi.get("/assignments", { params });
  return data as AssignmentItem[];
}

export async function listAssignmentsByJob(jobId: string) {
  return listAssignments({ jobId });
}

export async function createAssignment(payload: CreateAssignmentPayload) {
  const { data } = await assignmentsApi.post("/assignments", payload);
  return data as AssignmentItem;
}

export async function setAssignmentStatus(
  id: string,
  payload: {
    status: "PENDING_ACCEPTANCE" | "ACCEPTED" | "DECLINED" | "CANCELLED";
    note?: string;
  },
) {
  const { data } = await assignmentsApi.patch(`/assignments/${id}/status`, payload);
  return data as AssignmentItem;
}