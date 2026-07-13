"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  type SubRegion,
  type CreateSubRegionPayload,
  type Region,
  fetchSubRegions,
  createSubRegion,
  updateSubRegion,
  deleteSubRegion,
  fetchRegionsDropdown,
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

// ─── Form Content ─────────────────────────────────────────────────────────────

function SubRegionForm({ initial, isEdit, regions, onSubmit }: { initial: CreateSubRegionPayload, isEdit: boolean, regions: Region[], onSubmit: (d: any) => Promise<void> }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  return (
    <form className={styles.form} style={{ padding: '24px' }} onSubmit={async (e) => { 
      e.preventDefault(); 
      
      const code = form.sub_region_code.trim();
      const name = form.sub_region_name.trim();

      if (!code || !name || !form.region_code) {
        alert("All fields are required.");
        return;
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
        alert("Sub-Region Code should only contain letters, numbers, hyphens, or underscores.");
        return;
      }

      if (!/^[a-zA-Z0-9\s.]+$/.test(name)) {
        alert("Sub-Region Name should only contain letters, numbers, spaces, or dots.");
        return;
      }

      if (/^\d+$/.test(name)) {
        alert("Sub-Region Name cannot be numeric only.");
        return;
      }

      if (name.length > 200) {
        alert("Sub-Region Name cannot exceed 200 characters.");
        return;
      }

      setSaving(true); 
      try { 
        await onSubmit({ ...form, sub_region_code: code, sub_region_name: name }); 
      } finally { 
        setSaving(false); 
      } 
    }}>
      <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
        <select name="region_code" value={form.region_code} onChange={e => {
          setForm({ ...form, region_code: e.target.value });
        }} required className={styles.filterSelect} autoComplete="off">
          <option value="">Select Region</option>
          {regions.map((r, idx) => (
            <option key={r.id || idx} value={r.region_code}>{r.region_name}</option>
          ))}
        </select>
      </div>
      <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
        <input name="sub_region_code" value={form.sub_region_code} onChange={e => setForm({ ...form, sub_region_code: e.target.value })} placeholder="Sub-Region Code" required className={styles.input} style={{ width: '100%' }} autoComplete="off" />
      </div>
      <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
        <input name="sub_region_name" value={form.sub_region_name} onChange={e => setForm({ ...form, sub_region_name: e.target.value })} placeholder="Sub-Region Name" required className={styles.input} style={{ width: '100%' }} maxLength={200} autoComplete="off" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
        <button type="submit" className={styles.btnSearch} style={{ background: '#4f46e5', color: '#fff', padding: '10px 32px', borderRadius: '4px', border: 'none', fontWeight: 600, cursor: 'pointer' }} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
      </div>
    </form>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

type ModalState = { kind: "none" } | { kind: "create" } | { kind: "edit", subRegion: SubRegion } | { kind: "view", subRegion: SubRegion } | { kind: "confirm-delete", subRegion: SubRegion };

export default function SubRegionsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  const [subRegions, setSubRegions] = useState<SubRegion[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const [filters, setFilters] = useState({ search: "", region_code: "" });
  const [appliedFilters, setAppliedFilters] = useState({ search: "", region_code: "" });
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ last_page: 1, total: 0, per_page: 20 });

  const loadData = useCallback(async () => {
    try {
      const params: { search?: string; region_code?: string; page?: number } = { page };
      if (appliedFilters.search) params.search = appliedFilters.search;
      if (appliedFilters.region_code) params.region_code = appliedFilters.region_code;
      const [paginated, r] = await Promise.all([fetchSubRegions(params), fetchRegionsDropdown()]);
      setSubRegions(paginated.data ?? []);
      setMeta({ last_page: paginated.last_page, total: paginated.total, per_page: paginated.per_page });
      setRegions(Array.isArray(r) ? r : []);
    } catch (e) {
      console.error(e);
      setSubRegions([]);
    }
  }, [page, appliedFilters]);

  useEffect(() => {
    loadData().then(() => setLoading(false));
  }, [loadData]);

  const handleCreate = async (d: any) => {
    try {
      const result = await createSubRegion(d);
      setModal({ kind: "none" });
      await loadData();
      if (isMakerResponse(result)) {
        setToast({ message: "Request submitted for checker approval.", type: "success" });
      } else {
        setToast({ message: "Sub-region created successfully", type: "success" });
      }
    } catch (e: any) {
      let msg = "Action failed";
      if (e?.errors) { const k = Object.keys(e.errors)[0]; msg = e.errors[k][0]; }
      else if (e?.message) msg = e.message;
      setToast({ message: msg, type: "error" });
    }
  };

  const handleUpdate = async (sub_region_code: string, d: any) => {
    try {
      const result = await updateSubRegion(sub_region_code, d);
      setModal({ kind: "none" });
      await loadData();
      if (isMakerResponse(result)) {
        setToast({ message: "Request submitted for checker approval.", type: "success" });
      } else {
        setToast({ message: "Sub-region updated successfully", type: "success" });
      }
    } catch (e: any) {
      let msg = "Update failed";
      if (e?.errors) { const k = Object.keys(e.errors)[0]; msg = e.errors[k][0]; }
      else if (e?.message) msg = e.message;
      setToast({ message: msg, type: "error" });
    }
  };

  const handleDelete = async (sub_region_code: string) => {
    try {
      const result = await deleteSubRegion(sub_region_code);
      setModal({ kind: "none" });
      await loadData();
      if (isMakerResponse(result)) {
        setToast({ message: "Request submitted for checker approval.", type: "success" });
      } else {
        setToast({ message: "Sub-region deleted", type: "success" });
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
          {/* <div className={styles.breadcrumb}>Home / Admin panel / Sub Regions</div> */}
          <h1 className={styles.pageTitle}>Sub Regions</h1>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input className={styles.searchInput} placeholder="Search code or name…" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') { setAppliedFilters({ ...filters }); setPage(1); } }} autoComplete="off" />
          {filters.search && (
            <button className={styles.searchClear} onClick={() => { setFilters({ ...filters, search: "" }); setAppliedFilters({ ...appliedFilters, search: "" }); setPage(1); }}>✕</button>
          )}
        </div>
        <div className={styles.searchWrap} style={{ flex: '0 0 160px' }}>
          <input className={styles.searchInput} placeholder="Region Code" value={filters.region_code} onChange={e => setFilters(f => ({ ...f, region_code: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') { setAppliedFilters({ ...filters }); setPage(1); } }} autoComplete="off" style={{ paddingLeft: '12px' }} />
          {filters.region_code && (
            <button className={styles.searchClear} onClick={() => { setFilters({ ...filters, region_code: "" }); setAppliedFilters({ ...appliedFilters, region_code: "" }); setPage(1); }}>✕</button>
          )}
        </div>
        <button className={styles.btnSearch} style={{ background: 'var(--primary)', color: '#fff', fontWeight: 600, height: '40px', padding: '0 24px', borderRadius: '8px' }} onClick={() => { setAppliedFilters({ ...filters }); setPage(1); }}>Search</button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Sub Region Code</th>
              <th className={styles.th}>Sub Region Name</th>
              <th className={styles.th}>Region</th>
              <th className={styles.th}>Created Date & Time</th>
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subRegions.length > 0 ? (
              subRegions.map((sr) => (
                <tr key={sr.id} className={styles.tr} onClick={() => setModal({ kind: "view", subRegion: sr })} style={{ cursor: 'pointer' }}>
                  <td className={styles.td}>{sr.sub_region_code}</td>
                  <td className={styles.td}>{sr.sub_region_name}</td>
                  <td className={styles.td}>{sr.region_code || "—"}</td>
                  <td className={styles.td}>{formatDate(sr.created_at)}</td>
                  <td className={styles.td} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className={styles.btnIcon} onClick={() => setModal({ kind: "confirm-delete", subRegion: sr })}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className={styles.td} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No sub-regions found.</td></tr>
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
        <Modal title="Add Sub Region" onClose={() => setModal({ kind: "none" })}>
          <SubRegionForm initial={{ region_code: "", sub_region_code: "", sub_region_name: "" }} isEdit={false} regions={regions} onSubmit={handleCreate} />
        </Modal>
      )}

      {modal.kind === "edit" && (
        <Modal title="Edit Sub Region" onClose={() => setModal({ kind: "none" })}>
          <SubRegionForm initial={{ region_code: modal.subRegion.region_code, sub_region_code: modal.subRegion.sub_region_code, sub_region_name: modal.subRegion.sub_region_name }} isEdit={true} regions={regions} onSubmit={(d) => handleUpdate(modal.subRegion.sub_region_code, d)} />
        </Modal>
      )}

      {modal.kind === "view" && (
        <Modal title="Sub Region Details" onClose={() => setModal({ kind: "none" })}>
          <div style={{ padding: '8px 0' }}>
            <div style={{ padding: '0 0 16px', color: '#64748b', fontSize: '0.85rem' }}>Home / Admin panel / Sub Region</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
              <div><div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Code</div><div style={{ fontWeight: 500 }}>{modal.subRegion.sub_region_code}</div></div>
              <div><div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Name</div><div style={{ fontWeight: 500 }}>{modal.subRegion.sub_region_name}</div></div>
              <div><div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Region</div><div style={{ fontWeight: 500 }}>{modal.subRegion.region_code || "—"}</div></div>
              <div><div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Created</div><div style={{ fontWeight: 500 }}>{formatDate(modal.subRegion.created_at)}</div></div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
              <button className={styles.btnEdit} style={{ background: 'var(--primary)', textTransform: 'uppercase', padding: '10px 24px' }} onClick={() => setModal({ kind: "edit", subRegion: modal.subRegion })}>EDIT</button>
              <button className={styles.btnDelete} style={{ background: '#1e1b4b', textTransform: 'uppercase', padding: '10px 24px' }} onClick={() => setModal({ kind: "confirm-delete", subRegion: modal.subRegion })}>DELETE</button>
            </div>
          </div>
        </Modal>
      )}

      {modal.kind === "confirm-delete" && (
        <Modal title="Confirm Delete" onClose={() => setModal({ kind: "none" })}>
          <div style={{ padding: '24px' }}>
            <p style={{ color: '#334155', marginBottom: '24px' }}>Delete sub-region <b>{modal.subRegion.sub_region_name}</b>?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className={styles.btnSecondary} onClick={() => setModal({ kind: "none" })}>Cancel</button>
              <button className={styles.btnDanger} onClick={() => handleDelete(modal.subRegion.sub_region_code)}>Delete</button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
