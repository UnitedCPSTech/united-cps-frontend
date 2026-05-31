import axios from "axios";

export const certificatesApi = axios.create({
  baseURL: import.meta.env.VITE_CERTIFICATES_API_URL,
});

certificatesApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type CertificateItem = {
  _id: string;
  code: string;
  name: string;
  country: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateCertificatePayload = {
  code: string;
  name: string;
  country: string;
};

export type UpdateCertificatePayload = Partial<CreateCertificatePayload>;

export async function listCertificates(params?: {
  search?: string;
  country?: string;
  isActive?: string;
}) {
  const { data } = await certificatesApi.get("/certificates", { params });
  return data as CertificateItem[];
}

export async function getCertificate(id: string) {
  const { data } = await certificatesApi.get(`/certificates/${id}`);
  return data as CertificateItem;
}

export async function createCertificate(payload: CreateCertificatePayload) {
  const { data } = await certificatesApi.post("/certificates", payload);
  return data as CertificateItem;
}

export async function updateCertificate(
  id: string,
  payload: UpdateCertificatePayload,
) {
  const { data } = await certificatesApi.patch(`/certificates/${id}`, payload);
  return data as CertificateItem;
}

export async function activateCertificate(id: string) {
  const { data } = await certificatesApi.patch(`/certificates/${id}/activate`);
  return data as CertificateItem;
}

export async function deactivateCertificate(id: string) {
  const { data } = await certificatesApi.patch(`/certificates/${id}/deactivate`);
  return data as CertificateItem;
}