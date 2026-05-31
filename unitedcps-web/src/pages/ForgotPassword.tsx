import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "../api/axios";
import AuthLayout from "../components/AuthLayout";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const lastEmailRef = useRef<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (cooldown <= 0) return;

    const t = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);

    return () => clearInterval(t);
  }, [cooldown]);

  const sendReset = async (email: string) => {
    setServerError(null);

    // Backend returns OK always to avoid account enumeration.
    // UI should always show success.
    try {
      await api.post("/auth/forgot-password", { email });
    } catch (e: any) {
      // Even if SendGrid fails, you may still want to show a generic message.
      // But for dev visibility we can surface it:
      const msg =
        e?.response?.data?.message ||
        "We couldn’t send the email right now. Please try again.";
      setServerError(msg);
    } finally {
      lastEmailRef.current = email;
      setSent(true);
      setCooldown(60);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (cooldown > 0) return;
    await sendReset(data.email);
  };

  const onResend = async () => {
    if (cooldown > 0) return;

    const email = lastEmailRef.current || getValues("email");
    if (!email) return;

    await sendReset(email);
  };

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="Enter your email and we’ll send a password reset link."
    >
      {!sent ? (
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

          {serverError && <div className="ucps-banner">{serverError}</div>}

          <button className="ucps-btn" type="submit" disabled={isSubmitting || cooldown > 0}>
            {isSubmitting ? "Sending..." : cooldown > 0 ? `Wait ${cooldown}s` : "Send reset link"}
          </button>

          <div className="ucps-links">
            <Link className="ucps-link" to="/">
              Back to sign in
            </Link>
            <span style={{ color: "var(--muted)" }}>We won’t reveal if the email exists</span>
          </div>
        </form>
      ) : (
        <div style={{ marginTop: 16 }}>
          <p className="ucps-card__hint" style={{ marginTop: 0 }}>
            If that email exists, we’ve sent a reset link. Please check your inbox (and spam).
          </p>

          {serverError && <div className="ucps-banner">{serverError}</div>}

          <button className="ucps-btn" type="button" onClick={onResend} disabled={isSubmitting || cooldown > 0}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : isSubmitting ? "Sending..." : "Resend link"}
          </button>

          <div className="ucps-links">
            <Link className="ucps-link" to="/">
              Back to sign in
            </Link>
            <span style={{ color: "var(--muted)" }}>
              Didn’t receive it? Try spam, or wait and resend.
            </span>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}