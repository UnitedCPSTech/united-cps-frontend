import axios from "axios";

export const availabilityApi = axios.create({
  baseURL: import.meta.env.VITE_ENGINEERS_API_URL,
});

availabilityApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type AvailabilityResult = {
  engineerId: string;
  from: string;
  to: string;
  isAvailable: boolean;
  reasons: string[];
};

export type BulkAvailabilityResponse = {
  from: string;
  to: string;
  total: number;
  results: AvailabilityResult[];
};

export async function checkBulkAvailability(payload: {
  engineerIds: string[];
  from: string;
  to: string;
}) {
  const { data } = await availabilityApi.post<BulkAvailabilityResponse>(
    "/availability/check-bulk",
    payload,
  );
  return data;
}