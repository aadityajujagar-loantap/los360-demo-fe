"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  type AppStatus,
  type CreateAppStatusPayload,
  fetchAppStatuses,
  createAppStatus,
  updateAppStatus,
  deleteAppStatus,
  isMakerResponse,
} from "../../../_lib/redux/services/adminApi";
import styles from "../users/users.module.css";
import { get } from "@/app/_lib/redux/services/apiClient";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Toast ───────────────────────────────────────────────────────────────────

type ToastType = "success" | "error";

function Toast({
  message,
  type,
  onDone,
}: {
  message: string;
  type: ToastType;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className={`${styles.toast} ${type === "error" ? styles.toastError : styles.toastSuccess}`}
    >
      <span>{type === "success" ? "✓" : "✕"}</span>
      {message}
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalBox}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

// ─── App Status Form ─────────────────────────────────────────────────────────

function AppStatusForm({
  initial,
  isEdit,
  onSubmit,
  onClose,
}: {
  initial: CreateAppStatusPayload;
  isEdit: boolean;
  onSubmit: (data: CreateAppStatusPayload) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CreateAppStatusPayload>(initial);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
    setErrors((prev) => { const n = { ...prev }; delete n[e.target.name]; return n; });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const code = form.status_code.trim();
    const name = form.status_name.trim();

    if (!code || !name) {
      setErrors({ _: ["All fields are required."] });
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
      setErrors({ status_code: ["Status Code should only contain letters, numbers, hyphens, or underscores."] });
      return;
    }

    if (!/^[a-zA-Z0-9\s.]+$/.test(name)) {
      setErrors({ status_name: ["Display Name should only contain letters, numbers, spaces, or dots."] });
      return;
    }

    if (name.length > 200) {
      setErrors({ status_name: ["Display Name cannot exceed 200 characters."] });
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      await onSubmit({ ...form, status_code: code, status_name: name });
    } catch (err: any) {
      if (err?.errors) setErrors(err.errors);
      else if (err?.message) setErrors({ _: [err.message] });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label className={styles.label}>Status Code (System Key)*</label>
        <input name="status_code" type="text" value={form.status_code} onChange={handleChange} required className={styles.input} />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Display Name*</label>
        <input name="status_name" type="text" value={form.status_name} onChange={handleChange} required className={styles.input} />
      </div>

      <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
        <input name="is_default" type="checkbox" checked={form.is_default} onChange={handleChange} style={{ width: '20px', height: '20px' }} />
        <label className={styles.label} style={{ marginBottom: 0 }}>Set as Default Status for new applications</label>
      </div>

      {errors._ && <p className={styles.formErr}>{errors._[0]}</p>}

      <div className={styles.formFooter}>
        <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button type="submit" className={styles.btnPrimary} disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Update Status" : "Create Status"}
        </button>
      </div>
    </form>
  );
}

// ─── Modal State ─────────────────────────────────────────────────────────────

type ModalState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; status: AppStatus }
  | { kind: "confirm-delete"; status: AppStatus };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AppStatusesPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();

  const [authUser, setAuthUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [statuses, setStatuses] = useState<AppStatus[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ last_page: 1, total: 0, per_page: 20 });
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    (async () => {
      const res = await get("/user");
      if (res.ok) setAuthUser(await res.json());
      else router.push(`/${orgSlug}/login`);
      setAuthLoading(false);
    })();
  }, [router, orgSlug]);

  const loadData = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const params: { search?: string; page?: number } = { page };
      if (appliedSearch) params.search = appliedSearch;
      const paginated = await fetchAppStatuses(params);
      setStatuses(paginated.data);
      setMeta({ last_page: paginated.last_page, total: paginated.total, per_page: paginated.per_page });
    } catch (e: any) {
      setListError(e?.message || "Failed to load statuses.");
    } finally {
      setListLoading(false);
    }
  }, [page, appliedSearch]);

  useEffect(() => {
    if (!authLoading && authUser) loadData();
  }, [authLoading, authUser, loadData]);

  function showToast(message: string, type: ToastType) {
    setToast({ message, type });
  }

  async function handleCreate(form: CreateAppStatusPayload) {
    const result = await createAppStatus(form);
    setModal({ kind: "none" });
    showToast(isMakerResponse(result) ? "Request submitted for checker approval." : "Status created.", "success");
    loadData();
  }

  async function handleUpdate(s: AppStatus, form: CreateAppStatusPayload) {
    const result = await updateAppStatus(s.status_code, form);
    setModal({ kind: "none" });
    showToast(isMakerResponse(result) ? "Request submitted for checker approval." : "Status updated.", "success");
    loadData();
  }

  async function handleDelete(s: AppStatus) {
    try {
      const result = await deleteAppStatus(s.status_code);
      showToast(isMakerResponse(result) ? "Request submitted for checker approval." : "Status deleted.", "success");
    } catch (e: any) {
      showToast(e?.message || "Failed to delete.", "error");
    }
    setModal({ kind: "none" });
    loadData();
  }

  if (authLoading) return <div className={styles.centered}><div className={styles.spinner} /></div>;

  return (
    <>
      <header className={styles.topbar}>
        <div>
          <h1 className={styles.pageTitle}>Application Statuses</h1>
          <p className={styles.pageSubtitle}>Manage lifecycle stages for loan applications</p>
        </div>
        <div className={styles.topbarRight}>
          <button className={styles.btnPrimary} onClick={() => setModal({ kind: "create" })}>+ New Status</button>
        </div>
      </header>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "var(--primary-light)" }}>🚦</div>
          <div><div className={styles.statValue}>{statuses.length}</div><div className={styles.statLabel}>Total Statuses</div></div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input className={styles.searchInput} placeholder="Search statuses..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { setAppliedSearch(search); setPage(1); } }} />
        </div>
        <button className={styles.btnSearch} onClick={() => { setAppliedSearch(search); setPage(1); }}>Search</button>
        {appliedSearch && (
          <button className={styles.btnSecondary} onClick={() => { setSearch(""); setAppliedSearch(""); setPage(1); }}>Clear</button>
        )}
      </div>

      <div className={styles.tableWrap}>
        {listLoading ? <div className={styles.tableLoader}><div className={styles.spinner} /></div> : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Code</th>
                <th className={styles.th}>Label</th>
                <th className={styles.th}>Default</th>
                <th className={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {listError && <tr><td colSpan={4} className={styles.td} style={{ textAlign: 'center', color: '#ef4444' }}>{listError}</td></tr>}
              {!listError && statuses.map(s => (
                <tr key={s.id} className={styles.tr}>
                  <td className={styles.td}><span className={styles.badge}>{s.status_code}</span></td>
                  <td className={styles.td}>{s.status_name}</td>
                  <td className={styles.td}>{s.is_default ? "✅ Yes" : "—"}</td>
                  <td className={styles.td}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className={styles.btnIcon} onClick={() => setModal({ kind: "edit", status: s })}>✏️</button>
                      <button className={styles.btnIcon} onClick={() => setModal({ kind: "confirm-delete", status: s })}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!listError && statuses.length === 0 && !listLoading && (
                <tr><td colSpan={4} className={styles.td} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No statuses found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {meta.last_page >= 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', fontSize: '0.875rem', color: '#64748b' }}>
          <span>{meta.total > 0 ? `Showing ${statuses.length} of ${meta.total} statuses` : "No statuses found"}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className={styles.btnSecondary} disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '4px 12px' }}>← Prev</button>
            <span style={{ fontWeight: 600, color: '#334155' }}>Page {page} / {meta.last_page}</span>
            <button className={styles.btnSecondary} disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)} style={{ padding: '4px 12px' }}>Next →</button>
          </div>
        </div>
      )}

      {modal.kind === "create" && (
        <Modal title="New Status" onClose={() => setModal({ kind: "none" })}>
          <AppStatusForm initial={{ status_code: "", status_name: "", is_default: false }} isEdit={false} onSubmit={handleCreate} onClose={() => setModal({ kind: "none" })} />
        </Modal>
      )}

      {modal.kind === "edit" && (
        <Modal title="Edit Status" onClose={() => setModal({ kind: "none" })}>
          <AppStatusForm initial={{ ...modal.status }} isEdit={true} onSubmit={(f) => handleUpdate(modal.status, f)} onClose={() => setModal({ kind: "none" })} />
        </Modal>
      )}

      {modal.kind === "confirm-delete" && (
        <Modal title="Confirm Delete" onClose={() => setModal({ kind: "none" })}>
          <div className={styles.confirmBox}>
            <p className={styles.confirmMsg}>Delete status <strong>{modal.status.status_name}</strong>?</p>
            <div className={styles.confirmActions}>
              <button className={styles.btnSecondary} onClick={() => setModal({ kind: "none" })}>Cancel</button>
              <button className={styles.btnDanger} onClick={() => handleDelete(modal.status)}>Delete</button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </>
  );
}
