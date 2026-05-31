import axios from "axios";

export const jobsApi = axios.create({
  baseURL: import.meta.env.VITE_JOBS_API_URL,
});

jobsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type JobItem = {
  _id: string;
  country: string;
  clientId?: string | null;
  clientNameSnapshot: string;
  jobTitle: string;
  locationText: string;
  location: {
    addressLine1?: string;
    city?: string;
    postcode?: string | null;
    region?: string;
    country: string;
  };
  timeZone?: string;
  startTimeLocal: string;
  endTimeLocal: string;
  description?: string;
  requiredCertificateTypes?: string[];
  status: "OPEN" | "CANCELLED" | "COMPLETED";
  cancelReason?: string | null;
  cancelledAt?: string | null;
  cancelledByUserId?: string | null;
  completedAt?: string | null;
  completedByUserId?: string | null;
  completionNote?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateJobPayload = {
  country: string;
  clientId: string;
  clientNameSnapshot: string;
  jobTitle: string;
  locationText: string;
  location: {
    addressLine1?: string;
    city?: string;
    postcode?: string | null;
    region?: string;
    country: string;
  };
  timeZone?: string;
  startTimeLocal: string;
  endTimeLocal: string;
  description?: string;
  requiredCertificateTypes?: string[];
};

export type UpdateJobPayload = Partial<CreateJobPayload>;

export async function createJob(payload: CreateJobPayload) {
  const { data } = await jobsApi.post("/jobs", payload);
  return data;
}

export async function listJobs(params?: { country?: string; status?: string }) {
  const { data } = await jobsApi.get("/jobs", { params });
  return data as JobItem[];
}

export async function getJob(id: string) {
  const { data } = await jobsApi.get(`/jobs/${id}`);
  return data as JobItem;
}

export async function updateJob(id: string, payload: UpdateJobPayload) {
  const { data } = await jobsApi.patch(`/jobs/${id}`, payload);
  return data as JobItem;
}

export async function cancelJob(id: string, reason: string) {
  const { data } = await jobsApi.patch(`/jobs/${id}/cancel`, { reason });
  return data as JobItem;
}

export async function completeJob(id: string, note?: string) {
  const { data } = await jobsApi.patch(`/jobs/${id}/complete`, { note });
  return data as JobItem;
}