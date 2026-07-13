"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  useGetMakerRequestsQuery,
  useApproveMakerRequestMutation,
  useRejectMakerRequestMutation,
} from "../../../_lib/redux/services/adminApiSlice";
import { MakerRequest, MakerRequestFilters } from "../../../_lib/redux/services/adminApi";
import styles from "../users/users.module.css";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
}

function humanize(s: string | null | undefined) {
  if (!s) return "—";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function DataTable({ data }: { data: Record<string, any> | any[] | null }) {
  if (!data) return <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>;

  const thStyle: React.CSSProperties = {
    textAlign: "left", padding: "6px 10px", background: "#e2e8f0",
    color: "#475569", fontWeight: 600, borderBottom: "1px solid #cbd5e1",
  };
  const tdKey: React.CSSProperties = {
    padding: "6px 10px", fontWeight: 500, color: "#475569",
    whiteSpace: "nowrap", borderBottom: "1px solid #e2e8f0", width: "38%",
  };
  const tdVal: React.CSSProperties = {
    padding: "6px 10px", color: "#1e293b", wordBreak: "break-all",
    borderBottom: "1px solid #e2e8f0",
  };

  if (Array.isArray(data)) {
    if (data.length === 0) return <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>;
    const keys = Object.keys(data[0] ?? {});
    return (
      <div style={{ overflowX: "auto"}}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
          <thead><tr>{keys.map(k => <th key={k} style={thStyle}>{humanize(k)}</th>)}</tr></thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                {keys.map(k => (
                  <td key={k} style={tdVal}>
                    {row[k] === null || row[k] === undefined
                      ? <span style={{ color: "#94a3b8" }}>—</span>
                      : String(row[k])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const entries = Object.entries(data);
  if (entries.length === 0) return <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
        <thead>
          <tr>
            <th style={thStyle}>Field</th>
            <th style={thStyle}>Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, val], i) => (
            <tr key={key} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
              <td style={tdKey}>{humanize(key)}</td>
              <td style={tdVal}>
                {val === null
                  ? <span style={{ color: "#94a3b8" }}>null</span>
                  : typeof val === "object"
                    ? <pre style={{ margin: 0, fontSize: "0.7rem", whiteSpace: "pre-wrap" }}>{JSON.stringify(val, null, 2)}</pre>
                    : String(val)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ACTION_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  add:    { bg: "#dcfce7", color: "#166534" },
  update: { bg: "#dbeafe", color: "#1e40af" },
  delete: { bg: "#fee2e2", color: "#991b1b" },
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:  { bg: "#fef3c7", color: "#92400e" },
  approved: { bg: "#dcfce7", color: "#166534" },
  rejected: { bg: "#fee2e2", color: "#991b1b" },
};

// ─── Shared Components ───────────────────────────────────────────────────────

type ToastType = "success" | "error";

function Toast({ message, type, onDone }: { message: string; type: ToastType; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className={`${styles.toast} ${type === "error" ? styles.toastError : styles.toastSuccess}`}>
      <span>{type === "success" ? "✓" : "✕"}</span>
      {message}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "1000px", width: "90vw" }}>
        <div className={styles.modalHeaderWithClose}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

type StatusTab = "pending" | "approved" | "rejected";

export default function MakerRequestsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  // ── Filters ────────────────────────────────────────────────────────────────
  const [statusTab, setStatusTab]     = useState<StatusTab>("pending");
  const [groupFilter, setGroupFilter] = useState("");
  const [actionFilter, setActionFilter] = useState<"" | "add" | "update" | "delete">("");
  const [page, setPage]               = useState(1);

  const filters: MakerRequestFilters = {
    status: statusTab,
    ...(groupFilter  ? { group: groupFilter }                           : {}),
    ...(actionFilter ? { action_type: actionFilter as MakerRequestFilters["action_type"] } : {}),
    page,
    per_page: 15,
  };

  const { data, isLoading, isFetching } = useGetMakerRequestsQuery(filters);
  const [approveRequest, { isLoading: approving }] = useApproveMakerRequestMutation();
  const [rejectRequest,  { isLoading: rejecting }] = useRejectMakerRequestMutation();

  // ── UI State ───────────────────────────────────────────────────────────────
  const [toast, setToast]             = useState<{ message: string; type: ToastType } | null>(null);
  const [viewRequest, setViewRequest] = useState<MakerRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<MakerRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const requests   = data?.data        ?? [];
  const totalPages = data?.last_page   ?? 1;
  const totalItems = data?.total       ?? 0;

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [statusTab, groupFilter, actionFilter]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleApprove(uuid: string) {
    try {
      await approveRequest(uuid).unwrap();
      setToast({ message: "Request approved and action executed.", type: "success" });
      setViewRequest(null);
    } catch (e: any) {
      setToast({ message: e?.data?.message || "Approval failed.", type: "error" });
    }
  }

  function openRejectModal(r: MakerRequest) {
    setRejectTarget(r);
    setRejectReason("");
    setViewRequest(null);
  }

  async function handleRejectSubmit() {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setToast({ message: "Rejection reason is required.", type: "error" });
      return;
    }
    try {
      await rejectRequest({ uuid: rejectTarget.uuid, rejection_reason: rejectReason.trim() }).unwrap();
      setToast({ message: "Request rejected.", type: "success" });
      setRejectTarget(null);
    } catch (e: any) {
      setToast({ message: e?.data?.message || "Rejection failed.", type: "error" });
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) return <div className={styles.centered}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.main}>
      <header className={styles.topbar}>
        <div>
          
          <h1 className={styles.pageTitle}>Maker Requests</h1>
        </div>
      </header>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "24px", flexWrap: "wrap" }}>
        {/* Status tabs */}
        <div style={{ display: "flex", borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
          {(["pending", "approved", "rejected"] as StatusTab[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusTab(s)}
              style={{
                padding: "7px 18px",
                fontSize: "0.8rem",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                textTransform: "capitalize",
                background: statusTab === s ? "var(--primary)" : "#fff",
                color:      statusTab === s ? "#fff"    : "#64748b",
                transition: "all 0.15s",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Group filter */}
        <input
          type="text"
          placeholder="Filter by group (e.g. user, lead)…"
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          style={{
            padding: "7px 12px",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "0.8rem",
            minWidth: "220px",
            outline: "none",
          }}
        />

        {/* Action type filter */}
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value as typeof actionFilter)}
          style={{
            padding: "7px 12px",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "0.8rem",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          <option value="">All actions</option>
          <option value="add">Add</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
        </select>

        <span style={{ fontSize: "0.8rem", color: "#94a3b8", marginLeft: "auto" }}>
          {isFetching ? "Refreshing…" : `${totalItems} result${totalItems !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className={styles.tableWrap} style={{ marginTop: "16px" }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Group</th>
              <th className={styles.th}>Action Type</th>
              <th className={styles.th}>Maker</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Requested At</th>
              {statusTab !== "pending" && <th className={styles.th}>Reviewed At</th>}
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length > 0 ? (
              requests.map((r) => {
                const actionColors = ACTION_TYPE_COLORS[r.action_type] ?? { bg: "#f1f5f9", color: "#475569" };
                const statusColors = STATUS_COLORS[r.status]          ?? { bg: "#f1f5f9", color: "#475569" };
                return (
                  <tr
                    key={r.uuid}
                    className={styles.tr}
                    onClick={() => setViewRequest(r)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className={styles.td} style={{ textTransform: "capitalize" }}>
                      {humanize(r.group)}
                    </td>
                    <td className={styles.td}>
                      <span style={{ ...actionColors, padding: "3px 8px", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 600 }}>
                        {r.action_type.toUpperCase()}
                      </span>
                    </td>
                    <td className={styles.td}>{r.maker_name || `Maker #${r.requested_by}`}</td>
                    <td className={styles.td}>
                      <span style={{ ...statusColors, padding: "3px 8px", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 600 }}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                    <td className={styles.td}>{formatDate(r.created_at)}</td>
                    {statusTab !== "pending" && (
                      <td className={styles.td}>{formatDate(r.reviewed_at)}</td>
                    )}
                    <td className={styles.td} onClick={(e) => e.stopPropagation()}>
                      {r.status === "pending" && (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            className={styles.btnIcon}
                            title="Approve"
                            disabled={approving}
                            onClick={() => handleApprove(r.uuid)}
                          >✅</button>
                          <button
                            className={styles.btnIcon}
                            title="Reject"
                            disabled={rejecting}
                            onClick={() => openRejectModal(r)}
                          >❌</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={statusTab !== "pending" ? 7 : 6}
                  className={styles.td}
                  style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}
                >
                  No {statusTab} requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", marginTop: "20px" }}>
          <button
            className={styles.btnIcon}
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >‹ Prev</button>
          <span style={{ fontSize: "0.85rem", color: "#475569" }}>
            Page {page} of {totalPages}
          </span>
          <button
            className={styles.btnIcon}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >Next ›</button>
        </div>
      )}

      {/* ── Detail Modal ─────────────────────────────────────────────────── */}
      {viewRequest && (
        <Modal title="Request Details" onClose={() => setViewRequest(null)}>
          <div>
            {/* Meta grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
              {[
                { label: "Group",        value: humanize(viewRequest.group),           badge: null as { bg: string; color: string } | null },
                { label: "Action Type",  value: viewRequest.action_type.toUpperCase(), badge: ACTION_TYPE_COLORS[viewRequest.action_type] ?? null },
                { label: "Status",       value: viewRequest.status.toUpperCase(),      badge: STATUS_COLORS[viewRequest.status] ?? null },
                { label: "Maker",        value: viewRequest.maker_name || `Maker #${viewRequest.requested_by}`, badge: null },
                { label: "Requested At", value: formatDate(viewRequest.created_at),    badge: null },
                ...(viewRequest.reviewed_at ? [
                  { label: "Reviewer",    value: viewRequest.reviewer_name || `Reviewer #${viewRequest.reviewed_by}`, badge: null },
                  { label: "Reviewed At", value: formatDate(viewRequest.reviewed_at),  badge: null },
                ] : []),
              ].map(({ label, value, badge }) => (
                <div key={label}>
                  <div style={{ fontWeight: 600, fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>{label}</div>
                  {badge
                    ? <span style={{ ...badge, padding: "3px 10px", borderRadius: "4px", fontSize: "0.78rem", fontWeight: 700, display: "inline-block" }}>{value}</span>
                    : <div style={{ fontSize: "0.9rem", color: "#1e293b" }}>{value}</div>
                  }
                </div>
              ))}
            </div>

            {/* Rejection reason */}
            {viewRequest.rejection_reason && (
              <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px" }}>
                <div style={{ fontWeight: 700, fontSize: "0.7rem", color: "#be123c", textTransform: "uppercase", marginBottom: "4px" }}>Rejection Reason</div>
                <div style={{ fontSize: "0.875rem", color: "#1e293b" }}>{viewRequest.rejection_reason}</div>
              </div>
            )}

            {/* Data diff */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontWeight: 600, fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", marginBottom: "10px" }}>Data</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 700, marginBottom: "8px" }}>ORIGINAL DATA</div>
                  <DataTable data={viewRequest.original_data} />
                </div>
                <div style={{ background: "#f0fdf4", padding: "12px", borderRadius: "8px", border: "1px solid #dcfce7" }}>
                  <div style={{ fontSize: "0.65rem", color: "#6366f1", fontWeight: 700, marginBottom: "8px" }}>REQUEST DATA</div>
                  <DataTable data={viewRequest.request_data} />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            {viewRequest.status === "pending" && (
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: "18px" }}>
                <button
                  className={styles.btnEdit}
                  style={{ background: "var(--primary)", padding: "10px 28px" }}
                  disabled={approving}
                  onClick={() => handleApprove(viewRequest.uuid)}
                >
                  {approving ? "Approving…" : "APPROVE"}
                </button>
                <button
                  className={styles.btnDelete}
                  style={{ background: "#991b1b", padding: "10px 28px" }}
                  onClick={() => openRejectModal(viewRequest)}
                >
                  REJECT
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Reject Reason Modal ──────────────────────────────────────────── */}
      {rejectTarget && (
        <Modal title="Reject Request" onClose={() => setRejectTarget(null)}>
          <div>
            <p style={{ fontSize: "0.875rem", color: "#475569", marginBottom: "16px" }}>
              Rejecting: <strong>{humanize(rejectTarget.group)}</strong> — <strong>{rejectTarget.action_type.toUpperCase()}</strong>
              {rejectTarget.maker_name && <> by <strong>{rejectTarget.maker_name}</strong></>}
            </p>
            <label style={{ display: "block", fontWeight: 600, fontSize: "0.8rem", color: "#374151", marginBottom: "6px" }}>
              Rejection Reason <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide a clear reason for rejection…"
              rows={4}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "0.875rem",
                resize: "vertical",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "20px" }}>
              <button
                className={styles.btnEdit}
                style={{ background: "#64748b", padding: "10px 20px" }}
                onClick={() => setRejectTarget(null)}
              >
                Cancel
              </button>
              <button
                className={styles.btnDelete}
                style={{ background: "#991b1b", padding: "10px 28px" }}
                disabled={rejecting || !rejectReason.trim()}
                onClick={handleRejectSubmit}
              >
                {rejecting ? "Rejecting…" : "CONFIRM REJECT"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}

