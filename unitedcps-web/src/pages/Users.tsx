import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendInvite } from "../api/authApi";

export default function Users() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("UK");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleResendManagerInvite() {
    setServerError("");
    setSuccessMessage("");

    if (!email.trim()) {
      setServerError("Manager email is required.");
      return;
    }

    if (!country.trim()) {
      setServerError("Country is required.");
      return;
    }

    setSubmitting(true);

    try {
      await sendInvite({
        email: email.trim().toLowerCase(),
        role: "OPS_MANAGER",
        country: country.trim().toUpperCase(),
      });

      setSuccessMessage("Manager invite sent successfully.");
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to send manager invite.";
      setServerError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ucps-grid">
      <div className="ucps-card">
        <div className="ucps-cardHeader">
          <div>
            <h3 className="ucps-actionTitle" style={{ margin: 0 }}>
              Users
            </h3>
            <p className="ucps-actionText" style={{ margin: "6px 0 0 0" }}>
              Manage manager access and invitations.
            </p>
          </div>

          <div className="ucps-cardHeaderRight">
            <button
              className="ucps-btnPrimary"
              type="button"
              onClick={() => navigate("/users/create")}
            >
              Add manager
            </button>
          </div>
        </div>

        {serverError ? <div className="ucps-banner">{serverError}</div> : null}
        {successMessage ? <div className="ucps-infoBox">{successMessage}</div> : null}

        <div className="ucps-card" style={{ marginTop: 12, boxShadow: "none" }}>
          <h4 className="ucps-actionTitle" style={{ marginBottom: 6 }}>
            Manager invites
          </h4>
          <p className="ucps-actionText" style={{ marginBottom: 12 }}>
            Invite a new manager or resend an invite to an existing manager profile that has not completed setup.
          </p>

          <div className="ucps-filters">
            <input
              className="ucps-input"
              type="email"
              placeholder="Manager email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="ucps-input"
              placeholder="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              className="ucps-btnPrimary"
              type="button"
              onClick={() => navigate("/users/create")}
            >
              Add manager
            </button>

            <button
              className="ucps-iconBtn"
              type="button"
              onClick={handleResendManagerInvite}
              disabled={submitting}
            >
              {submitting ? "Sending..." : "Resend manager invite"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}