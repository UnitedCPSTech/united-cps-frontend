import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  activateClient,
  deactivateClient,
  listClients,
  updateClient,
  type ClientItem,
} from "../api/clientsApi";

type EditForm = {
  name: string;
  country: string;
  addressLine1: string;
  city: string;
  postcode: string;
  region: string;
  timeZone: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  isActive: boolean;
};

function toEditForm(client: ClientItem): EditForm {
  return {
    name: client.name,
    country: client.country,
    addressLine1: client.addressLine1,
    city: client.city,
    postcode: client.postcode,
    region: client.region,
    timeZone: client.timeZone,
    contactName: client.contactName ?? "",
    contactEmail: client.contactEmail ?? "",
    contactPhone: client.contactPhone ?? "",
    isActive: client.isActive,
  };
}

export default function Clients() {
  const navigate = useNavigate();

  const [items, setItems] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [isActive, setIsActive] = useState("true");

  const [selected, setSelected] = useState<ClientItem | null>(null);
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

  async function fetchClients() {
    setLoading(true);
    setServerError("");

    try {
      const data = await listClients(queryParams);
      setItems(data ?? []);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load clients.";
      setServerError(Array.isArray(message) ? message.join(", ") : message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClients();
  }, [queryParams]);

  function openDrawer(client: ClientItem) {
    setSelected(client);
    setEditForm(toEditForm(client));
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
      const updated = await updateClient(selected._id, {
        name: editForm.name.trim(),
        country: editForm.country.trim(),
        addressLine1: editForm.addressLine1.trim(),
        city: editForm.city.trim(),
        postcode: editForm.postcode.trim(),
        region: editForm.region.trim(),
        timeZone: editForm.timeZone.trim(),
        contactName: editForm.contactName.trim() || undefined,
        contactEmail: editForm.contactEmail.trim() || undefined,
        contactPhone: editForm.contactPhone.trim() || undefined,
        isActive: editForm.isActive,
      });

      setItems((prev) =>
        prev.map((x) => (x._id === updated._id ? updated : x)),
      );
      setSelected(updated);
      setEditForm(toEditForm(updated));
      setSuccessMessage("Client updated successfully.");
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update client.";
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
        ? await deactivateClient(selected._id)
        : await activateClient(selected._id);

      setItems((prev) =>
        prev.map((x) => (x._id === updated._id ? updated : x)),
      );
      setSelected(updated);
      setEditForm(toEditForm(updated));
      setSuccessMessage(
        updated.isActive ? "Client activated successfully." : "Client deactivated successfully.",
      );
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to change client status.";
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
            <h3 className="ucps-actionTitle" style={{ margin: 0 }}>Clients</h3>
            <p className="ucps-actionText" style={{ margin: "6px 0 0 0" }}>
              View, create and maintain client records for jobs.
            </p>
          </div>

          <div className="ucps-cardHeaderRight">
            <button
              className="ucps-btnPrimary"
              type="button"
              onClick={() => navigate("/clients/create")}
            >
              Create client
            </button>
          </div>
        </div>

        <div className="ucps-filters">
          <input
            className="ucps-input"
            placeholder="Search by client, city, postcode or contact"
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
                <th style={{ padding: "10px 8px" }}>Client</th>
                <th style={{ padding: "10px 8px" }}>City</th>
                <th style={{ padding: "10px 8px" }}>Country</th>
                <th style={{ padding: "10px 8px" }}>Contact</th>
                <th style={{ padding: "10px 8px" }}>Status</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td style={{ padding: 12 }} colSpan={5}>Loading...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td style={{ padding: 12, color: "var(--muted)" }} colSpan={5}>
                    No clients found.
                  </td>
                </tr>
              ) : (
                items.map((client) => (
                  <tr
                    key={client._id}
                    className="ucps-rowClickable"
                    style={{ borderTop: "1px solid var(--border)" }}
                    onClick={() => openDrawer(client)}
                  >
                    <td style={{ padding: "10px 8px", fontWeight: 800 }}>{client.name}</td>
                    <td style={{ padding: "10px 8px" }}>{client.city}</td>
                    <td style={{ padding: "10px 8px" }}>{client.country}</td>
                    <td style={{ padding: "10px 8px" }}>
                      {client.contactName || client.contactEmail || "-"}
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      {client.isActive ? "ACTIVE" : "INACTIVE"}
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
                <h3 className="ucps-drawerTitle">{selected.name}</h3>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="ucps-chip">{selected.isActive ? "ACTIVE" : "INACTIVE"}</span>
                  <span className="ucps-chip">{selected.country}</span>
                  <span className="ucps-chip">{selected.city}</span>
                </div>
              </div>

              <button className="ucps-iconBtn" type="button" onClick={closeDrawer}>
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <input
                className="ucps-input"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Client name"
              />
              <input
                className="ucps-input"
                value={editForm.country}
                onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                placeholder="Country"
              />
              <input
                className="ucps-input"
                value={editForm.addressLine1}
                onChange={(e) => setEditForm({ ...editForm, addressLine1: e.target.value })}
                placeholder="Address line 1"
              />
              <input
                className="ucps-input"
                value={editForm.city}
                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                placeholder="City"
              />
              <input
                className="ucps-input"
                value={editForm.postcode}
                onChange={(e) => setEditForm({ ...editForm, postcode: e.target.value })}
                placeholder="Postcode"
              />
              <input
                className="ucps-input"
                value={editForm.region}
                onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                placeholder="Region"
              />
              <input
                className="ucps-input"
                value={editForm.timeZone}
                onChange={(e) => setEditForm({ ...editForm, timeZone: e.target.value })}
                placeholder="Time zone"
              />
              <input
                className="ucps-input"
                value={editForm.contactName}
                onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                placeholder="Contact name"
              />
              <input
                className="ucps-input"
                value={editForm.contactEmail}
                onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                placeholder="Contact email"
              />
              <input
                className="ucps-input"
                value={editForm.contactPhone}
                onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                placeholder="Contact phone"
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
                  ? "Deactivate client"
                  : "Activate client"}
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