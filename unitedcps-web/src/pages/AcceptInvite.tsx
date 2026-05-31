import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "../api/axios";
import AuthLayout from "../components/AuthLayout";
import { useState } from "react";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

type AcceptInviteResponse = {
  status: "ACCOUNT_CREATED";
  accessToken: string;
  refreshToken: string;
};

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = params.get("token");

  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!token) return;

    setServerError(null);
    setSuccessMessage(null);

    try {
      const res = await api.post<AcceptInviteResponse>("/auth/accept-invite", {
        token,
        password: data.password,
      });

      const { accessToken, refreshToken } = res.data;

      localStorage.setItem("token", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      let role: string | null = null;

      try {
        const meRes = await api.get("/auth/me", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const me = meRes.data;
        if (me?.role) {
          role = me.role;
          localStorage.setItem("role", me.role);
        }
        if (me?.email) {
          localStorage.setItem("email", me.email);
        }
      } catch {
        // fallback below
      }

      setSuccessMessage("Account created successfully. Redirecting...");

      setTimeout(() => {
        if (role === "ENGINEER") {
          navigate("/engineer-redirect", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      }, 900);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        "Invite invalid or expired. Please request a new invite.";
      setServerError(Array.isArray(msg) ? msg.join(", ") : msg);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Invalid invite" subtitle="This link is missing a token.">
        <div style={{ marginTop: 16 }}>
          <div className="ucps-banner">
            Token missing. Please ask an admin to send a new invite.
          </div>

          <div className="ucps-links">
            <Link className="ucps-link" to="/">
              Back to sign in
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Accept invitation"
      subtitle="Set a password to activate your UnitedCPS account."
    >
      <form onSubmit={handleSubmit(onSubmit)} style={{ marginTop: 16 }}>
        <div className="ucps-field">
          <div className="ucps-labelRow">
            <span className="ucps-label">Password</span>
          </div>

          <div className="ucps-inputWrap">
            <input
              className="ucps-input"
              aria-invalid={!!errors.password}
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              {...register("password")}
            />
            <button
              className="ucps-toggle"
              type="button"
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {errors.password && <p className="ucps-error">{errors.password.message}</p>}
        </div>

        <div className="ucps-field">
          <div className="ucps-labelRow">
            <span className="ucps-label">Confirm password</span>
          </div>

          <input
            className="ucps-input"
            aria-invalid={!!errors.confirmPassword}
            type={showPassword ? "text" : "password"}
            placeholder="Confirm your password"
            {...register("confirmPassword")}
          />

          {errors.confirmPassword && (
            <p className="ucps-error">{errors.confirmPassword.message}</p>
          )}
        </div>

        {serverError && <div className="ucps-banner">{serverError}</div>}
        {successMessage && <div className="ucps-infoBox">{successMessage}</div>}

        <button className="ucps-btn" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Activating..." : "Create account"}
        </button>

        <div className="ucps-links">
          <Link className="ucps-link" to="/">
            Back to sign in
          </Link>
          <span style={{ color: "var(--muted)" }}>
            Link expired? Ask for a new invite
          </span>
        </div>
      </form>
    </AuthLayout>
  );
}