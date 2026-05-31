import axios from "axios";

export const jobDatesApi = axios.create({
  baseURL: import.meta.env.VITE_JOBS_API_URL,
});

jobDatesApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type JobDateType = "RANGE" | "MULTI";

export type UpsertJobDatesPayload = {
  country: string;
  dateType: JobDateType;
  dateFrom?: string;
  dateTo?: string;
  specificDates?: string[];
};

export async function getJobDates(jobId: string) {
  const { data } = await jobDatesApi.get(`/jobs/${jobId}/dates`);
  return data;
}

export async function upsertJobDates(jobId: string, payload: UpsertJobDatesPayload) {
  const { data } = await jobDatesApi.post(`/jobs/${jobId}/dates`, payload);
  return data;
}