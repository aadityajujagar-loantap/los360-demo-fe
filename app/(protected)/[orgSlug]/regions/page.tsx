"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  type Region,
  type CreateRegionPayload,
  fetchRegions,
  createRegion,
  updateRegion,
  deleteRegion,
  isMakerResponse,
} from "../../../_lib/redux/services/adminApi";
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
  } catch (e) {
    return "—";
  }
}

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
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className={styles.modalHeaderWithClose}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

// ─── Region Form Content ─────────────────────────────────────────────────────

function RegionForm({ initial, onSubmit, onClose }: { initial: CreateRegionPayload, onSubmit: (d: any) => Promise<void>, onClose: () => void }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  return (
    <form
      className={styles.form}
      style={{ padding: "24px" }}
      onSubmit={async (e) => {
        e.preventDefault();
        const code = form.region_code.trim();
        const name = form.region_name.trim();

        if (!code || !name) {
          alert("All fields are required.");
          return;
        }

        // Validate Region Code (Alphanumeric, hyphens, underscores)
        if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
          alert(
            "Region Code should only contain letters, numbers, hyphens, or underscores.",
          );
          return;
        }

        // Validate Region Name (Letters, numbers, spaces, dots)
        if (!/^[a-zA-Z0-9\s.]+$/.test(name)) {
          alert(
            "Region Name should only contain letters, numbers, spaces, or dots.",
          );
          return;
        }

        // Prevent numeric-only names
        if (/^\d+$/.test(name)) {
          alert("Region Name cannot be numeric only.");
          return;
        }

        // Limit length to 200
        if (name.length > 200) {
          alert("Region Name cannot exceed 200 characters.");
          return;
        }

        setSaving(true);
        try {
          await onSubmit({
            ...form,
            region_code: code,
            region_name: name,
          });
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
        <input name="region_code" value={form.region_code} onChange={e => setForm({ ...form, region_code: e.target.value })} placeholder="Region Code" required className={styles.input} style={{ width: '100%' }} autoComplete="off" />
      </div>
      <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
        <input name="region_name" value={form.region_name} onChange={e => setForm({ ...form, region_name: e.target.value })} placeholder="Region Name" required className={styles.input} style={{ width: '100%' }} maxLength={200} autoComplete="off" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
        <button type="submit" className={styles.btnSearch} style={{ background: '#4f46e5', color: '#fff', padding: '10px 32px', borderRadius: '4px', border: 'none', fontWeight: 600, cursor: 'pointer' }} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
      </div>
    </form>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

type ModalState = { kind: "none" } | { kind: "create" } | { kind: "edit", region: Region } | { kind: "view", region: Region } | { kind: "confirm-delete", region: Region };

export default function RegionsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const [filters, setFilters] = useState({ search: "" });
  const [appliedFilters, setAppliedFilters] = useState({ search: "" });
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ last_page: 1, total: 0, per_page: 20 });

  const loadRegions = useCallback(async () => {
    try {
      const params: { search?: string; page?: number } = { page };
      if (appliedFilters.search) params.search = appliedFilters.search;
      const paginated = await fetchRegions(params);
      setRegions(paginated.data ?? []);
      setMeta({ last_page: paginated.last_page, total: paginated.total, per_page: paginated.per_page });
    } catch (e) {
      console.error(e);
      setRegions([]);
    }
  }, [page, appliedFilters]);

  useEffect(() => {
    loadRegions().then(() => setLoading(false));
  }, [loadRegions]);

  const handleCreate = async (d: any) => {
    try {
      const result = await createRegion(d);
      setModal({ kind: "none" });
      await loadRegions();
      if (isMakerResponse(result)) {
        setToast({ message: "Request submitted for checker approval.", type: "success" });
      } else {
        setToast({ message: "Region created successfully", type: "success" });
      }
    } catch (e: any) {
      console.error("CREATE ERR:", e);
      let msg = "Action failed";
      if (typeof e === 'string') msg = e;
      else if (e?.message) msg = e.message;
      else if (e?.errors) {
        const firstKey = Object.keys(e.errors)[0];
        msg = e.errors[firstKey][0];
      }
      setToast({ message: msg, type: "error" });
    }
  };

  const handleUpdate = async (region_code: string, d: any) => {
    try {
      const result = await updateRegion(region_code, d);
      setModal({ kind: "none" });
      await loadRegions();
      if (isMakerResponse(result)) {
        setToast({ message: "Request submitted for checker approval.", type: "success" });
      } else {
        setToast({ message: "Region updated successfully", type: "success" });
      }
    } catch (e: any) {
      console.error("UPDATE ERR:", e);
      let msg = "Action failed";
      if (typeof e === 'string') msg = e;
      else if (e?.message) msg = e.message;
      else if (e?.errors) {
        const firstKey = Object.keys(e.errors)[0];
        msg = e.errors[firstKey][0];
      }
      setToast({ message: msg, type: "error" });
    }
  };

  const handleDelete = async (region_code: string) => {
    try {
      const result = await deleteRegion(region_code);
      setModal({ kind: "none" });
      await loadRegions();
      if (isMakerResponse(result)) {
        setToast({ message: "Request submitted for checker approval.", type: "success" });
      } else {
        setToast({ message: "Region deleted", type: "success" });
      }
    } catch (e: any) {
      console.error("DELETE ERR:", e);
      let msg = "Delete failed";
      if (typeof e === 'string') msg = e;
      else if (e?.message) msg = e.message;
      else if (e?.errors) {
        const firstKey = Object.keys(e.errors)[0];
        msg = e.errors[firstKey][0];
      }
      setToast({ message: msg, type: "error" });
    }
  };

  if (loading) return <div className={styles.centered}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.main}>
      <header className={styles.topbar}>
        <div>
          {/* <div className={styles.breadcrumb}>Home / Admin panel/ Regions</div> */}
          <h1 className={styles.pageTitle}>Regions</h1>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input className={styles.searchInput} placeholder="Search code or name…" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') { setAppliedFilters({ ...filters }); setPage(1); } }} autoComplete="off" />
          {filters.search && (
            <button className={styles.searchClear} onClick={() => { setFilters({ search: "" }); setAppliedFilters({ search: "" }); setPage(1); }}>✕</button>
          )}
        </div>
        <button className={styles.btnSearch} style={{ background: 'var(--primary)', color: '#fff', fontWeight: 600, height: '40px', padding: '0 24px', borderRadius: '8px' }} onClick={() => { setAppliedFilters({ ...filters }); setPage(1); }}>Search</button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Region Code</th>
              <th className={styles.th}>Region Name</th>
              <th className={styles.th}>Created Date & Time</th>
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(regions) && regions.length > 0 ? (
              regions.map((r) => (
                <tr key={r.id} className={styles.tr} onClick={() => setModal({ kind: "view", region: r })} style={{ cursor: 'pointer' }}>
                  <td className={styles.td}>{r.region_code}</td>
                  <td className={styles.td}>{r.region_name}</td>
                  <td className={styles.td}>{formatDate(r.created_at)}</td>
                  <td className={styles.td} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className={styles.btnIcon} onClick={() => setModal({ kind: "confirm-delete", region: r })}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={4} className={styles.td} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No regions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {meta.last_page > 1 && (
        <div className={styles.pagination} style={{ justifyContent: 'center' }}>
          <div className={styles.paginationBtns}>
            <button className={styles.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            {Array.from({ length: meta.last_page }, (_, i) => i + 1).map(p => (
              <button key={p} className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ""}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className={styles.pageBtn} disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      )}

      {modal.kind === "create" && (
        <Modal title="Add Region" onClose={() => setModal({ kind: "none" })}>
          <RegionForm initial={{ region_code: "", region_name: "" }} onSubmit={handleCreate} onClose={() => setModal({ kind: "none" })} />
        </Modal>
      )}

      {modal.kind === "edit" && (
        <Modal title="Edit Region" onClose={() => setModal({ kind: "none" })}>
          <RegionForm initial={{ region_code: modal.region.region_code, region_name: modal.region.region_name }} onSubmit={(d) => handleUpdate(modal.region.region_code, d)} onClose={() => setModal({ kind: "none" })} />
        </Modal>
      )}

      {modal.kind === "view" && (
        <Modal title="Region Details" onClose={() => setModal({ kind: "none" })}>
          <div style={{ padding: '8px 0' }}>
            <div style={{ padding: '0 0 16px', color: '#64748b', fontSize: '0.85rem' }}>Home / Admin panel / Region</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Region Code</div>
                <div style={{ fontWeight: 500, color: '#1e293b' }}>{modal.region.region_code}</div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Region Name</div>
                <div style={{ fontWeight: 500, color: '#1e293b' }}>{modal.region.region_name}</div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Created Date & Time</div>
                <div style={{ fontWeight: 500, color: '#1e293b' }}>{formatDate(modal.region.created_at)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
              <button className={styles.btnEdit} style={{ background: 'var(--primary)', textTransform: 'uppercase', padding: '10px 24px' }} onClick={() => setModal({ kind: "edit", region: modal.region })}>EDIT</button>
              <button className={styles.btnDelete} style={{ background: '#1e1b4b', textTransform: 'uppercase', padding: '10px 24px' }} onClick={() => setModal({ kind: "confirm-delete", region: modal.region })}>DELETE</button>
            </div>
          </div>
        </Modal>
      )}

      {modal.kind === "confirm-delete" && (
        <Modal title="Confirm Delete" onClose={() => setModal({ kind: "none" })}>
          <div style={{ padding: '24px' }}>
            <p style={{ color: '#334155', marginBottom: '24px' }}>Are you sure you want to delete region <b>{modal.region.region_name}</b>?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className={styles.btnSecondary} onClick={() => setModal({ kind: "none" })}>Cancel</button>
              <button className={styles.btnDanger} onClick={() => handleDelete(modal.region.region_code)}>Delete</button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
