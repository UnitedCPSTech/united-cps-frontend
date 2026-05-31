import axios from "axios";

export const engineersApi = axios.create({
  baseURL: import.meta.env.VITE_ENGINEERS_API_URL,
});

engineersApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type EngineerItem = {
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

export type EngineersResponse = {
  page: number;
  limit: number;
  total: number;
  pages: number;
  items: EngineerItem[];
};

export type CreateEngineerPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country?: string;
  city?: string;
  skills?: string[];
  certifications?: string[];
  isAvailable?: boolean;
};

export async function listEngineers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  country?: string;
  city?: string;
  status?: string;
}) {
  const { data } = await engineersApi.get("/engineers", { params });
  return data as EngineersResponse;
}

export async function createEngineer(payload: CreateEngineerPayload) {
  const { data } = await engineersApi.post("/engineers", payload);
  return data as EngineerItem;
}