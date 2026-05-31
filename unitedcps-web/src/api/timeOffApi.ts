import axios from "axios";

export const timeOffApi = axios.create({
  baseURL: import.meta.env.VITE_ENGINEERS_API_URL,
});

timeOffApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type TimeOffStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type TimeOffDateType = "RANGE" | "MULTI";

export type TimeOffItem = {
  _id: string;
  engineerId: string;
  country: string;
  status: TimeOffStatus;
  dateType: TimeOffDateType;
  dateFrom?: string | null;
  dateTo?: string | null;
  specificDates?: string[];
  days?: string[];
  reason?: string;
  requestedAt?: string;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  updatedAt?: string;
};

export type CreateTimeOffPayload = {
  engineerId: string;
  country: string;
  dateType: TimeOffDateType;
  dateFrom?: string;
  dateTo?: string;
  specificDates?: string[];
  reason?: string;
};

export async function listTimeOffByEngineer(
  engineerId: string,
  params?: { from?: string; to?: string },
) {
  const { data } = await timeOffApi.get(`/timeoff/engineer/${engineerId}`, {
    params,
  });
  return data as TimeOffItem[];
}

export async function createTimeOff(payload: CreateTimeOffPayload) {
  const { data } = await timeOffApi.post("/timeoff", payload);
  return data as TimeOffItem;
}

export async function updateTimeOffStatus(
  id: string,
  payload: { status: "APPROVED" | "REJECTED"; reviewNote?: string },
) {
  const { data } = await timeOffApi.patch(`/timeoff/${id}/status`, payload);
  return data as TimeOffItem;
}