import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  activateCertificate,
  deactivateCertificate,
  listCertificates,
  updateCertificate,
  type CertificateItem,
} from "../api/certificatesApi";

type EditForm = {
  code: string;
  name: string;
  country: string;
  isActive: boolean;
};

function toEditForm(item: CertificateItem): EditForm {
  return {
    code: item.code,
    name: item.name,
    country: item.country,
    isActive: item.isActive,
  };
}

export default function Certificates() {
  const navigate = useNavigate();

  const [items, setItems] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [isActive, setIsActive] = useState("true");

  const [selected, setSelected] = useState<CertificateItem | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
        setEditForm(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (search.trim()) params.search = search.trim();
    if (country.trim()) params.country = country.trim();
    if (isActive) params.isActive = isActive;
    return params;
  }, [search, country, isActive]);

  async function fetchCertificates() {
    setLoading(true);
    setServerError("");

    try {
      const data = await listCertificates(queryParams);
      setItems(data ?? []);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load certificates.";
      setServerError(Array.isArray(message) ? message.join(", ") : message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCertificates();
  }, [queryParams]);

  function openDrawer(item: CertificateItem) {
    setSelected(item);
    setEditForm(toEditForm(item));
    setServerError("");
    setSuccessMessage("");
  }

  function closeDrawer() {
    setSelected(null);
    setEditForm(null);
  }

  async function handleSaveEdit() {
    if (!selected || !editForm) return;

    setSavingEdit(true);
    setServerError("");
    setSuccessMessage("");

    try {
      const updated = await updateCertificate(selected._id, {
        code: editForm.code.trim().toUpperCase(),
        name: editForm.name.trim(),
        country: editForm.country.trim().toUpperCase(),
      });

      setItems((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));
      setSelected(updated);
      setEditForm(toEditForm(updated));
      setSuccessMessage("Certificate updated successfully.");
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update certificate.";
      setServerError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleToggleActive() {
    if (!selected) return;

    setTogglingStatus(true);
    setServerError("");
    setSuccessMessage("");

    try {
      const updated = selected.isActive
        ? await deactivateCertificate(selected._id)
        : await activateCertificate(selected._id);

      setItems((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));
      setSelected(updated);
      setEditForm(toEditForm(updated));
      setSuccessMessage(
        updated.isActive
          ? "Certificate activated successfully."
          : "Certificate deactivated successfully.",
      );
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to change certificate status.";
      setServerError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setTogglingStatus(false);
    }
  }

  return (
    <div className="ucps-grid">
      <div className="ucps-card">
        <div className="ucps-cardHeader">
          <div>
            <h3 className="ucps-actionTitle" style={{ margin: 0 }}>
              Certificates
            </h3>
            <p className="ucps-actionText" style={{ margin: "6px 0 0 0" }}>
              View, create and maintain certificate records.
            </p>
          </div>

          <div className="ucps-cardHeaderRight">
            <button
              className="ucps-btnPrimary"
              type="button"
              onClick={() => navigate("/certificates/create")}
            >
              Create certificate
            </button>
          </div>
        </div>

        <div className="ucps-filters">
          <input
            className="ucps-input"
            placeholder="Search by code or name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <input
            className="ucps-input"
            placeholder="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />

          <select
            className="ucps-input"
            value={isActive}
            onChange={(e) => setIsActive(e.target.value)}
          >
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
            <option value="">All status</option>
          </select>
        </div>

        {serverError ? <div className="ucps-banner">{serverError}</div> : null}
        {successMessage ? <div className="ucps-infoBox">{successMessage}</div> : null}

        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                <th style={{ padding: "10px 8px" }}>Code</th>
                <th style={{ padding: "10px 8px" }}>Name</th>
                <th style={{ padding: "10px 8px" }}>Country</th>
                <th style={{ padding: "10px 8px" }}>Status</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td style={{ padding: 12 }} colSpan={4}>
                    Loading...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td style={{ padding: 12, color: "var(--muted)" }} colSpan={4}>
                    No certificates found.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item._id}
                    className="ucps-rowClickable"
                    style={{ borderTop: "1px solid var(--border)" }}
                    onClick={() => openDrawer(item)}
                  >
                    <td style={{ padding: "10px 8px", fontWeight: 800 }}>{item.code}</td>
                    <td style={{ padding: "10px 8px" }}>{item.name}</td>
                    <td style={{ padding: "10px 8px" }}>{item.country}</td>
                    <td style={{ padding: "10px 8px" }}>
                      {item.isActive ? "ACTIVE" : "INACTIVE"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && editForm && (
        <div className="ucps-drawerOverlay" onClick={closeDrawer}>
          <div className="ucps-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="ucps-drawerHeader">
              <div>
                <h3 className="ucps-drawerTitle">{selected.code}</h3>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="ucps-chip">{selected.isActive ? "ACTIVE" : "INACTIVE"}</span>
                  <span className="ucps-chip">{selected.country}</span>
                </div>
              </div>

              <button className="ucps-iconBtn" type="button" onClick={closeDrawer}>
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <input
                className="ucps-input"
                value={editForm.code}
                onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                placeholder="Code"
              />
              <input
                className="ucps-input"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Name"
              />
              <input
                className="ucps-input"
                value={editForm.country}
                onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                placeholder="Country"
              />
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className="ucps-btnPrimary"
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? "Saving..." : "Save changes"}
              </button>

              <button
                className="ucps-iconBtn"
                type="button"
                onClick={handleToggleActive}
                disabled={togglingStatus}
              >
                {togglingStatus
                  ? "Updating..."
                  : selected.isActive
                  ? "Deactivate certificate"
                  : "Activate certificate"}
              </button>
            </div>

            <div className="ucps-kv" style={{ marginTop: 20 }}>
              <div className="ucps-k">Created</div>
              <div className="ucps-v">
                {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "-"}
              </div>
            </div>

            <div className="ucps-kv">
              <div className="ucps-k">Last updated</div>
              <div className="ucps-v">
                {selected.updatedAt ? new Date(selected.updatedAt).toLocaleString() : "-"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}