import AuthLayout from "../components/AuthLayout";

export default function EngineerRedirect() {
  // Put real links later
  const androidLink = "#";
  const iosLink = "#";

  return (
    <AuthLayout
      title="Use the UnitedCPS Mobile App"
      subtitle="Your account is an Engineer account. Please sign in from the mobile app."
    >
      <div style={{ marginTop: 16 }}>
        <div className="ucps-banner" style={{ background: "rgba(10,132,193,0.08)", borderColor: "rgba(10,132,193,0.25)", color: "rgb(12,74,110)" }}>
          Managers use this web CRM. Engineers use the mobile app.
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <a className="ucps-btn" href={androidLink} target="_blank" rel="noreferrer">
            Download for Android
          </a>

          <a className="ucps-btn" href={iosLink} target="_blank" rel="noreferrer">
            Download for iOS
          </a>
        </div>

        <div className="ucps-links" style={{ marginTop: 14 }}>
          <a className="ucps-link" href="mailto:support@unitedcpssms.com">
            Contact support
          </a>
          <span style={{ color: "var(--muted)" }}>If you’re a manager, ask for the correct invite</span>
        </div>
      </div>
    </AuthLayout>
  );
}