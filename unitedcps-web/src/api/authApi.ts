import { api } from "./axios";

export type SendInvitePayload = {
  email: string;
  role: "ENGINEER" | "OPS_MANAGER";
  country: string;
};

export async function sendInvite(payload: SendInvitePayload) {
  const { data } = await api.post("/auth/invites", payload);
  return data as { status: "INVITE_SENT" };
}