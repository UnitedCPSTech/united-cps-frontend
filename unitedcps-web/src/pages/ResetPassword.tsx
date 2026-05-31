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

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const token = params.get("token");

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
    try {
      await api.post("/auth/reset-password", {
        token,
        newPassword: data.password,
      });

      navigate("/");
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        "Invalid or expired reset token. Please request a new reset link.";
      setServerError(msg);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Invalid Link">
        <p>Token missing. Please request a new reset link.</p>
        <div style={{ marginTop: 16 }}>
          <Link to="/forgot-password">Go to forgot password</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
  <AuthLayout title="Set new password" subtitle="Choose a strong password you will remember.">
    <form onSubmit={handleSubmit(onSubmit)} style={{ marginTop: 16 }}>
      <div className="ucps-field">
        <div className="ucps-labelRow">
          <span className="ucps-label">New password</span>
        </div>

        <div className="ucps-inputWrap">
          <input
            className="ucps-input"
            aria-invalid={!!errors.password}
            type={showPassword ? "text" : "password"}
            placeholder="Enter new password"
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
          <span className="ucps-label">Confirm new password</span>
        </div>

        <input
          className="ucps-input"
          aria-invalid={!!errors.confirmPassword}
          type={showPassword ? "text" : "password"}
          placeholder="Re-enter new password"
          {...register("confirmPassword")}
        />

        {errors.confirmPassword && (
          <p className="ucps-error">{errors.confirmPassword.message}</p>
        )}
      </div>

      {serverError && <div className="ucps-banner">{serverError}</div>}

      <button className="ucps-btn" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Resetting..." : "Reset password"}
      </button>

      <div className="ucps-links">
        <Link className="ucps-link" to="/">Back to sign in</Link>
        <Link className="ucps-link" to="/forgot-password">Request new link</Link>
      </div>
    </form>
  </AuthLayout>
);
}