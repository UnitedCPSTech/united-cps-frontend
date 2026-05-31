import axios from "axios";

export const clientsApi = axios.create({
  baseURL: import.meta.env.VITE_CLIENTS_API_URL,
});

clientsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type ClientItem = {
  _id: string;
  name: string;
  country: string;
  addressLine1: string;
  city: string;
  postcode: string;
  region: string;
  timeZone: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateClientPayload = {
  name: string;
  country: string;
  addressLine1: string;
  city: string;
  postcode: string;
  region: string;
  timeZone?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive?: boolean;
};

export type UpdateClientPayload = Partial<CreateClientPayload> & {
  isActive?: boolean;
};

export async function listClients(params?: {
  country?: string;
  search?: string;
  isActive?: string;
}) {
  const { data } = await clientsApi.get("/clients", { params });
  return data as ClientItem[];
}

export async function getClient(id: string) {
  const { data } = await clientsApi.get(`/clients/${id}`);
  return data as ClientItem;
}

export async function createClient(payload: CreateClientPayload) {
  const { data } = await clientsApi.post("/clients", payload);
  return data as ClientItem;
}

export async function updateClient(id: string, payload: UpdateClientPayload) {
  const { data } = await clientsApi.patch(`/clients/${id}`, payload);
  return data as ClientItem;
}

export async function activateClient(id: string) {
  const { data } = await clientsApi.patch(`/clients/${id}/activate`);
  return data as ClientItem;
}

export async function deactivateClient(id: string) {
  const { data } = await clientsApi.patch(`/clients/${id}/deactivate`);
  return data as ClientItem;
}