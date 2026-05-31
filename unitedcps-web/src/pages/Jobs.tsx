import { useNavigate } from "react-router-dom";

export default function Jobs() {
  const navigate = useNavigate();

  return (
    <div className="ucps-grid">
      <div className="ucps-card">
        <h3 className="ucps-actionTitle">Jobs</h3>
        <p className="ucps-actionText">
          Create new jobs or view and manage existing ones.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 12,
          }}
        >
          <button
            className="ucps-btnPrimary"
            type="button"
            onClick={() => navigate("/jobs/create")}
          >
            Create job
          </button>

          <button
            className="ucps-btnPrimary"
            type="button"
            onClick={() => navigate("/jobs/list")}
          >
            List jobs
          </button>
        </div>
      </div>
    </div>
  );
}