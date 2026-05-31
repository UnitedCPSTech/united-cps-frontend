import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "../api/axios";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useState } from "react";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function SignIn() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
  setServerError(null);
  try {
    const res = await api.post("/auth/login", data);

    const token = res.data.accessToken;
    localStorage.setItem("token", token);

    // Store role too (so you can guard routes without decoding JWT)
    const role = res.data.user?.role;
    localStorage.setItem("role", role);

    if (role === "ENGINEER") {
      navigate("/engineer-redirect");
      return;
    }

    navigate("/dashboard");
  } catch (e: any) {
    const msg = e?.response?.data?.message || "Invalid email or password.";
    setServerError(msg);
  }
};

  return (
    <AuthLayout title="Sign in" subtitle="Welcome back. Please enter your details.">
      <form onSubmit={handleSubmit(onSubmit)} style={{ marginTop: 16 }}>
        <div className="ucps-field">
          <div className="ucps-labelRow">
            <span className="ucps-label">Email</span>
          </div>

          <input
            className="ucps-input"
            aria-invalid={!!errors.email}
            placeholder="name@company.com"
            {...register("email")}
          />

          {errors.email && <p className="ucps-error">{errors.email.message}</p>}
        </div>

        <div className="ucps-field">
          <div className="ucps-labelRow">
            <span className="ucps-label">Password</span>
            <Link className="ucps-link" to="/forgot-password">
              Forgot password?
            </Link>
          </div>

          <input
            className="ucps-input"
            aria-invalid={!!errors.password}
            type="password"
            placeholder="Enter your password"
            {...register("password")}
          />

          {errors.password && <p className="ucps-error">{errors.password.message}</p>}
        </div>

        {serverError && <div className="ucps-banner">{serverError}</div>}

        <button className="ucps-btn" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>

        <div className="ucps-links">
          <span style={{ color: "var(--muted)" }}>Need access?</span>
          <span style={{ color: "var(--muted)" }}>Ask an admin for an invite</span>
        </div>
      </form>
    </AuthLayout>
  );
}