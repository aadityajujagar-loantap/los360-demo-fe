"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  type Branch,
  type District,
  type State,
  type Region,
  type SubRegion,
  type CreateBranchPayload,
  type CreateDistrictPayload,
  type CreateStatePayload,
  type CreateRegionPayload,
  type CreateSubRegionPayload,
  type BranchFilters,
  fetchBranches,
  fetchBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  fetchDistricts,
  createDistrict,
  updateDistrict,
  deleteDistrict,
  fetchStates,
  createState,
  updateState,
  deleteState,
  fetchRegions,
  createRegion,
  updateRegion,
  deleteRegion,
  fetchSubRegions,
  createSubRegion,
  updateSubRegion,
  deleteSubRegion,
  fetchRegionsDropdown,
  fetchSubRegionsDropdown,
  fetchStatesDropdown,
  isMakerResponse,
  fetchDistrictsDropdown,
} from "../../../_lib/redux/services/adminApi";
import styles from "../users/users.module.css";
import { get, post, put } from "@/app/_lib/redux/services/apiClient";


// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function trimTo90Limit(val: string): string {
  if (!val) return "";
  let newVal = val;
  if (newVal.length > 90) {
    newVal = newVal.slice(0, 90);
  }
  const words = newVal.trim().split(/\s+/);
  if (words.length > 90) {
    newVal = words.slice(0, 90).join(" ");
  }
  return newVal;
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
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

// ─── Region Form ─────────────────────────────────────────────────────────────

function RegionFormInline({ initial, onSubmit, onClose }: { initial: CreateRegionPayload; onSubmit: (d: any) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  return (
    <form className={styles.form} style={{ padding: '24px' }} onSubmit={async (e) => {
      e.preventDefault();
      const code = form.region_code.trim();
      const name = form.region_name.trim();

      if (!code || !name) {
        alert("All fields are required.");
        return;
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
        alert("Region Code should only contain letters, numbers, hyphens, or underscores.");
        return;
      }

      if (!/^[a-zA-Z0-9\s.]+$/.test(name)) {
        alert("Region Name should only contain letters, numbers, spaces, or dots.");
        return;
      }

      if (/^\d+$/.test(name)) {
        alert("Region Name cannot be numeric only.");
        return;
      }

      if (name.length > 90) {
        alert("Region Name cannot exceed 90 characters.");
        return;
      }

      setSaving(true);
      try {
        await onSubmit({ ...form, region_code: code, region_name: name });
      } finally {
        setSaving(false);
      }
    }}>
      <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
        <input name="region_code" value={form.region_code} onChange={e => setForm(f => ({ ...f, region_code: trimTo90Limit(e.target.value) }))} placeholder="Region Code" required className={styles.input} style={{ width: '100%' }} maxLength={90} />
      </div>
      <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
        <input name="region_name" value={form.region_name} onChange={e => setForm(f => ({ ...f, region_name: trimTo90Limit(e.target.value) }))} placeholder="Region Name" required className={styles.input} style={{ width: '100%' }} maxLength={90} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
        <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button type="submit" className={styles.btnSearch} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}

// ─── Sub-Region Form ──────────────────────────────────────────────────────────

function SubRegionFormInline({ initial, regionsDropdown, onSubmit, onClose }: { initial: CreateSubRegionPayload; regionsDropdown: Region[]; onSubmit: (d: any) => Promise<void>; onClose: () => void }) {
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

      if (name.length > 90) {
        alert("Sub-Region Name cannot exceed 90 characters.");
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
        <select name="region_code" value={form.region_code} onChange={e => setForm(f => ({ ...f, region_code: e.target.value }))} required className={styles.filterSelect} style={{ width: '100%' }}>
          <option value="">Select Region</option>
          {regionsDropdown.map((r, idx) => <option key={r.id ?? idx} value={r.region_code}>{r.region_name}</option>)}
        </select>
      </div>
      <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
        <input name="sub_region_code" value={form.sub_region_code} onChange={e => setForm(f => ({ ...f, sub_region_code: trimTo90Limit(e.target.value) }))} placeholder="Sub-Region Code" required className={styles.input} style={{ width: '100%' }} maxLength={90} />
      </div>
      <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
        <input name="sub_region_name" value={form.sub_region_name} onChange={e => setForm(f => ({ ...f, sub_region_name: trimTo90Limit(e.target.value) }))} placeholder="Sub-Region Name" required className={styles.input} style={{ width: '100%' }} maxLength={90} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
        <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button type="submit" className={styles.btnSearch} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}

// ─── Branch Management ──────────────────────────────────────────────────────

function BranchForm({ initial, isEdit, regions, onSubmit, onClose }: { initial: CreateBranchPayload, isEdit: boolean, regions: any[], onSubmit: (d: any) => Promise<void>, onClose: () => void }) {
  const [form, setForm] = useState<CreateBranchPayload>(initial);
  const [subRegions, setSubRegions] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (form.region_code) fetchSubRegionsDropdown(form.region_code).then(setSubRegions).catch(console.error);
    else setSubRegions([]);
  }, [form.region_code]);

  useEffect(() => {
    fetchDistrictsDropdown().then(setDistricts).catch(console.error);
  }, []);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: trimTo90Limit(value) });
  };

  return (
    <form className={styles.form} onSubmit={async (e) => {
      e.preventDefault();

      const name = form.branch_name?.trim();
      const code = form.branch_code?.trim();

      if (!name) {
        alert("Branch Name is required.");
        return;
      }

      if (code && !/^[a-zA-Z0-9_-]+$/.test(code)) {
        alert("Branch Code should only contain letters, numbers, hyphens, or underscores.");
        return;
      }

      if (!/^[a-zA-Z0-9\s.]+$/.test(name)) {
        alert("Branch Name should only contain letters, numbers, spaces, or dots.");
        return;
      }

      if (/^\d+$/.test(name)) {
        alert("Branch Name cannot be numeric only.");
        return;
      }

      if (name.length > 90) {
        alert("Branch Name cannot exceed 90 characters.");
        return;
      }

      setSaving(true);
      try { await onSubmit(form); } finally { setSaving(false); }
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className={styles.formGroup}><label className={styles.label}>Name*</label><input name="branch_name" value={form.branch_name ?? ""} onChange={handleChange} required disabled={isEdit} className={styles.input} maxLength={90} /></div>
        <div className={styles.formGroup}><label className={styles.label}>Code*</label><input name="branch_code" value={form.branch_code ?? ""} onChange={handleChange} required disabled={isEdit} className={styles.input} maxLength={90} /></div>
      </div>
      <div className={styles.formGroup}><label className={styles.label}>Number*</label><input name="branch_number" value={form.branch_number ?? ""} onChange={handleChange} required disabled={isEdit} className={styles.input} maxLength={90} /></div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className={styles.formGroup}><label className={styles.label}>Region*</label>
          {isEdit ? (
            <input
              value={(form as any).region_name || (initial as any).region_name || (form as any).region_code || (initial as any).region_code || ""}
              disabled
              className={styles.input}
            />
          ) : (
            <select name="region_code" value={form.region_code} onChange={handleChange} required className={styles.filterSelect} style={{ width: '100%' }}>
              <option value="">Select Region</option>
              {regions.map((r, idx) => <option key={r.region_code ?? idx} value={r.region_code}>{r.region_name}</option>)}
            </select>
          )}
        </div>
        <div className={styles.formGroup}><label className={styles.label}>Sub-Region*</label>
          {isEdit ? (
            <input
              value={(form as any).sub_region_name || (initial as any).sub_region_name || (form as any).sub_region_code || (initial as any).sub_region_code || ""}
              disabled
              className={styles.input}
            />
          ) : (
            <select name="sub_region_code" value={form.sub_region_code} onChange={handleChange} required className={styles.filterSelect} style={{ width: '100%' }}>
              <option value="">Select Sub-Region</option>
              {subRegions.map((sr, idx) => <option key={sr.sub_region_code ?? idx} value={sr.sub_region_code}>{sr.sub_region_name}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className={styles.formGroup}><label className={styles.label}>District*</label>
        <select name="district_code" value={form.district_code} onChange={handleChange} required className={styles.filterSelect} style={{ width: '100%' }}>
          <option value="">Select District</option>
          {districts.map((d, idx) => <option key={d.district_code ?? idx} value={d.district_code}>{d.district_name}</option>)}
        </select>
      </div>

      <div className={styles.formFooter}>
        <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? "Saving..." : isEdit ? "Update" : "Create"}</button>
      </div>
    </form>
  );
}


// ─── District Management ────────────────────────────────────────────────────

function DistrictForm({ initial, isEdit, states, onSubmit, onClose }: { initial: CreateDistrictPayload, isEdit: boolean, states: any[], onSubmit: (d: any) => Promise<void>, onClose: () => void }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const handleChange = (e: any) => setForm({ ...form, [e.target.name]: trimTo90Limit(e.target.value) });
  return (
    <form className={styles.form} onSubmit={async (e) => {
      e.preventDefault();

      const name = form.district_name?.trim();
      const code = form.district_code?.trim();

      if (!name) {
        alert("District Name is required.");
        return;
      }

      if (code && !/^[a-zA-Z0-9_-]+$/.test(code)) {
        alert("District Code should only contain letters, numbers, hyphens, or underscores.");
        return;
      }

      if (!/^[a-zA-Z0-9\s.]+$/.test(name)) {
        alert("District Name should only contain letters, numbers, spaces, or dots.");
        return;
      }

      if (/^\d+$/.test(name)) {
        alert("District Name cannot be numeric only.");
        return;
      }

      if (name.length > 90) {
        alert("District Name cannot exceed 90 characters.");
        return;
      }

      setSaving(true);
      try { await onSubmit(form); } finally { setSaving(false); }
    }}>
      <div className={styles.formGroup}><label className={styles.label}>State*</label>
        <select name="state_code" value={form.state_code} onChange={handleChange} required className={styles.filterSelect} style={{ width: '100%' }}>
          <option value="">Select State</option>
          {states.map((s, idx) => <option key={s.id ?? idx} value={s.state_code}>{s.state_name}</option>)}
        </select>
      </div>
      <div className={styles.formGroup}><label className={styles.label}>Code*</label><input name="district_code" value={form.district_code ?? ""} onChange={handleChange} required className={styles.input} maxLength={90} /></div>
      <div className={styles.formGroup}><label className={styles.label}>Name*</label><input name="district_name" value={form.district_name ?? ""} onChange={handleChange} required className={styles.input} maxLength={90} /></div>
      <div className={styles.formFooter}><button type="button" className={styles.btnSecondary} onClick={onClose}>Cancel</button><button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? "Saving..." : isEdit ? "Update" : "Create"}</button></div>
    </form>
  );
}

// ─── State Management ───────────────────────────────────────────────────────

function StateForm({ initial, isEdit, onSubmit, onClose }: { initial: CreateStatePayload, isEdit: boolean, onSubmit: (d: any) => Promise<void>, onClose: () => void }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const handleChange = (e: any) => setForm({ ...form, [e.target.name]: trimTo90Limit(e.target.value) });
  return (
    <form className={styles.form} onSubmit={async (e) => {
      e.preventDefault();

      const name = form.state_name?.trim();
      const code = form.state_code?.trim();

      if (!name) {
        alert("State Name is required.");
        return;
      }

      if (code && !/^[a-zA-Z0-9_-]+$/.test(code)) {
        alert("State Code should only contain letters, numbers, hyphens, or underscores.");
        return;
      }

      if (!/^[a-zA-Z0-9\s.]+$/.test(name)) {
        alert("State Name should only contain letters, numbers, spaces, or dots.");
        return;
      }

      if (/^\d+$/.test(name)) {
        alert("State Name cannot be numeric only.");
        return;
      }

      if (name.length > 90) {
        alert("State Name cannot exceed 90 characters.");
        return;
      }

      setSaving(true);
      try { await onSubmit(form); } finally { setSaving(false); }
    }}>
      <div className={styles.formGroup}><label className={styles.label}>Code*</label><input name="state_code" value={form.state_code ?? ""} onChange={handleChange} required className={styles.input} maxLength={90} /></div>
      <div className={styles.formGroup}><label className={styles.label}>Name*</label><input name="state_name" value={form.state_name ?? ""} onChange={handleChange} required className={styles.input} maxLength={90} /></div>
      <div className={styles.formFooter}><button type="button" className={styles.btnSecondary} onClick={onClose}>Cancel</button><button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? "Saving..." : isEdit ? "Update" : "Create"}</button></div>
    </form>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

type Tab = "REGION" | "SUB-REGION" | "STATE" | "DISTRICT" | "BRANCH";

export default function BranchesPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>("STATE");
  const [authUser, setAuthUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem("nav_permissions");
    if (cached) {
      try {
        const perms = JSON.parse(cached);
        setIsSuperAdmin(!!perms.is_super_admin);
      } catch (e) { }
    }
  }, []);

  // Branch filters & pagination
  const [branchFilters, setBranchFilters] = useState({ search: "", region_code: "", sub_region_code: "", district_code: "" });
  const [appliedFilters, setAppliedFilters] = useState({ search: "", region_code: "", sub_region_code: "", district_code: "" });
  const [branchPage, setBranchPage] = useState(1);
  const [branchMeta, setBranchMeta] = useState({ last_page: 1, total: 0, per_page: 20 });

  // State filters & pagination
  const [stateFilters, setStateFilters] = useState({ search: "" });
  const [appliedStateFilters, setAppliedStateFilters] = useState({ search: "" });
  const [statePage, setStatePage] = useState(1);
  const [stateMeta, setStateMeta] = useState({ last_page: 1, total: 0, per_page: 20 });

  // District filters & pagination
  const [districtFilters, setDistrictFilters] = useState({ search: "", state_code: "" });
  const [appliedDistrictFilters, setAppliedDistrictFilters] = useState({ search: "", state_code: "" });
  const [districtPage, setDistrictPage] = useState(1);
  const [districtMeta, setDistrictMeta] = useState({ last_page: 1, total: 0, per_page: 20 });

  // Region filters & pagination
  const [regionFilters, setRegionFilters] = useState({ search: "" });
  const [appliedRegionFilters, setAppliedRegionFilters] = useState({ search: "" });
  const [regionPage, setRegionPage] = useState(1);
  const [regionMeta, setRegionMeta] = useState({ last_page: 1, total: 0, per_page: 20 });

  // Sub-Region filters & pagination
  const [subRegionFilters, setSubRegionFilters] = useState({ search: "", region_code: "" });
  const [appliedSubRegionFilters, setAppliedSubRegionFilters] = useState({ search: "", region_code: "" });
  const [subRegionPage, setSubRegionPage] = useState(1);
  const [subRegionMeta, setSubRegionMeta] = useState({ last_page: 1, total: 0, per_page: 20 });

  // Data
  const [branches, setBranches] = useState<Branch[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [regionsList, setRegionsList] = useState<Region[]>([]);
  const [subRegionsList, setSubRegionsList] = useState<SubRegion[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);  // dropdown for BranchForm / SubRegionFormInline
  const [statesDropdown, setStatesDropdown] = useState<any[]>([]);

  const [modal, setModal] = useState<{ kind: string, data?: any }>({ kind: "none" });
  const [toast, setToast] = useState<{ msg: string, type: ToastType } | null>(null);
  const [syncing, setSyncing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      if (activeTab === "BRANCH") {
        const filters: BranchFilters = { page: branchPage };
        if (appliedFilters.search) filters.search = appliedFilters.search;
        if (appliedFilters.region_code) filters.region_code = appliedFilters.region_code;
        if (appliedFilters.sub_region_code) filters.sub_region_code = appliedFilters.sub_region_code;
        if (appliedFilters.district_code) filters.district_code = appliedFilters.district_code;
        const [paginated, r] = await Promise.all([fetchBranches(filters), fetchRegionsDropdown()]);
        setBranches(paginated.data);
        setBranchMeta({ last_page: paginated.last_page, total: paginated.total, per_page: paginated.per_page });
        setRegions(r);
      } else if (activeTab === "DISTRICT") {
        const params: { search?: string; state_code?: string; page?: number } = { page: districtPage };
        if (appliedDistrictFilters.search) params.search = appliedDistrictFilters.search;
        if (appliedDistrictFilters.state_code) params.state_code = appliedDistrictFilters.state_code;
        const [paginated, s] = await Promise.all([fetchDistricts(params), fetchStatesDropdown()]);
        setDistricts(paginated.data);
        setDistrictMeta({ last_page: paginated.last_page, total: paginated.total, per_page: paginated.per_page });
        setStatesDropdown(s);
      } else if (activeTab === "STATE") {
        const params: { search?: string; page?: number } = { page: statePage };
        if (appliedStateFilters.search) params.search = appliedStateFilters.search;
        const paginated = await fetchStates(params);
        setStates(paginated.data);
        setStateMeta({ last_page: paginated.last_page, total: paginated.total, per_page: paginated.per_page });
      } else if (activeTab === "REGION") {
        const params: { search?: string; page?: number } = { page: regionPage };
        if (appliedRegionFilters.search) params.search = appliedRegionFilters.search;
        const paginated = await fetchRegions(params);
        setRegionsList(paginated.data);
        setRegionMeta({ last_page: paginated.last_page, total: paginated.total, per_page: paginated.per_page });
      } else if (activeTab === "SUB-REGION") {
        const params: { search?: string; region_code?: string; page?: number } = { page: subRegionPage };
        if (appliedSubRegionFilters.search) params.search = appliedSubRegionFilters.search;
        if (appliedSubRegionFilters.region_code) params.region_code = appliedSubRegionFilters.region_code;
        const [paginated, r] = await Promise.all([fetchSubRegions(params), fetchRegionsDropdown()]);
        setSubRegionsList(paginated.data);
        setSubRegionMeta({ last_page: paginated.last_page, total: paginated.total, per_page: paginated.per_page });
        setRegions(r);
      }
    } catch (e) { console.error(e); }
  }, [activeTab, branchPage, appliedFilters, districtPage, appliedDistrictFilters, statePage, appliedStateFilters, regionPage, appliedRegionFilters, subRegionPage, appliedSubRegionFilters]);

  const handleSyncBranches = async () => {
    try {
      setSyncing(true);
      const res = await post("/admin/branches/sync", {});
      const json = await res.json();
      if (res.ok) {
        setToast({
          msg: `Sync completed: ${json.data.inserted} inserted, ${json.data.updated} updated.`,
          type: "success",
        });
        loadData();
        setModal({ kind: "none" });
      } else {
        throw new Error(json.message || "Sync failed");
      }
    } catch (e: any) {
      setToast({ msg: e.message || "Sync failed.", type: "error" });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    get("/user").then((res: any) => res.ok ? res.json().then(setAuthUser) : router.push(`/${orgSlug}/login`)).finally(() => setLoading(false));
  }, [router, orgSlug]);


  useEffect(() => { if (authUser) loadData(); }, [authUser, loadData]);

  if (loading) return <div className={styles.centered}><div className={styles.spinner} /></div>;

  return (
    <>
      <header className={styles.topbar}>
        <div>

          <h1 className={styles.pageTitle}>Branches</h1>
        </div>
      </header>

      <div className={styles.tabsWrap}>
        {(["REGION", "SUB-REGION", "STATE", "DISTRICT", "BRANCH"] as Tab[]).map(t => (
          <button key={t} className={`${styles.tabBtn} ${activeTab === t ? styles.tabBtnActive : ""}`} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      <div className={styles.toolbar}>
        {activeTab === "BRANCH" && (
          <>
            <input className={styles.searchInput} autoComplete="off" placeholder="Search name / code…" value={branchFilters.search} onChange={e => setBranchFilters(f => ({ ...f, search: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') { setAppliedFilters({ ...branchFilters }); setBranchPage(1); } }} style={{ flex: '1 1 150px', minWidth: '120px' }} />
            <input className={styles.searchInput} autoComplete="off" placeholder="Region Code" value={branchFilters.region_code} onChange={e => setBranchFilters(f => ({ ...f, region_code: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') { setAppliedFilters({ ...branchFilters }); setBranchPage(1); } }} style={{ flex: '1 1 120px', minWidth: '100px' }} />
            <input className={styles.searchInput} autoComplete="off" placeholder="Sub-Region Code" value={branchFilters.sub_region_code} onChange={e => setBranchFilters(f => ({ ...f, sub_region_code: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') { setAppliedFilters({ ...branchFilters }); setBranchPage(1); } }} style={{ flex: '1 1 130px', minWidth: '110px' }} />
            <input className={styles.searchInput} autoComplete="off" placeholder="District Code" value={branchFilters.district_code} onChange={e => setBranchFilters(f => ({ ...f, district_code: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') { setAppliedFilters({ ...branchFilters }); setBranchPage(1); } }} style={{ flex: '1 1 120px', minWidth: '100px' }} />
            <button className={styles.btnSearch} onClick={() => { setAppliedFilters({ ...branchFilters }); setBranchPage(1); }}>Search</button>
            {(appliedFilters.search || appliedFilters.region_code || appliedFilters.sub_region_code || appliedFilters.district_code) && (
              <button className={styles.btnSecondary} onClick={() => { const e = { search: "", region_code: "", sub_region_code: "", district_code: "" }; setBranchFilters(e); setAppliedFilters(e); setBranchPage(1); }}>Clear</button>
            )}
          </>
        )}
        {activeTab === "STATE" && (
          <>
            <input className={styles.searchInput} autoComplete="off" placeholder="Search code or name…" value={stateFilters.search} onChange={e => setStateFilters(f => ({ ...f, search: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') { setAppliedStateFilters({ ...stateFilters }); setStatePage(1); } }} style={{ flex: '1 1 200px', minWidth: '160px' }} />
            <button className={styles.btnSearch} onClick={() => { setAppliedStateFilters({ ...stateFilters }); setStatePage(1); }}>Search</button>
            {appliedStateFilters.search && (
              <button className={styles.btnSecondary} onClick={() => { setStateFilters({ search: "" }); setAppliedStateFilters({ search: "" }); setStatePage(1); }}>Clear</button>
            )}
          </>
        )}
        {activeTab === "DISTRICT" && (
          <>
            <input className={styles.searchInput} autoComplete="off" placeholder="Search code or name…" value={districtFilters.search} onChange={e => setDistrictFilters(f => ({ ...f, search: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') { setAppliedDistrictFilters({ ...districtFilters }); setDistrictPage(1); } }} style={{ flex: '1 1 180px', minWidth: '140px' }} />
            <select
              className={styles.searchInput}
              value={districtFilters.state_code}
              onChange={e => setDistrictFilters(f => ({ ...f, state_code: e.target.value }))}
              style={{ flex: '1 1 130px', minWidth: '110px' }}
            >
              <option value="">Select State</option>
              {statesDropdown.map((s, idx) => (
                <option key={s.id ?? s.state_code ?? idx} value={s.state_code}>{s.state_name}</option>
              ))}
            </select>
            <button className={styles.btnSearch} onClick={() => { setAppliedDistrictFilters({ ...districtFilters }); setDistrictPage(1); }}>Search</button>
            {(appliedDistrictFilters.search || appliedDistrictFilters.state_code) && (
              <button className={styles.btnSecondary} onClick={() => { const e = { search: "", state_code: "" }; setDistrictFilters(e); setAppliedDistrictFilters(e); setDistrictPage(1); }}>Clear</button>
            )}
          </>
        )}
        {activeTab === "REGION" && (
          <>
            <input className={styles.searchInput} autoComplete="off" placeholder="Search code or name…" value={regionFilters.search} onChange={e => setRegionFilters(f => ({ ...f, search: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') { setAppliedRegionFilters({ ...regionFilters }); setRegionPage(1); } }} style={{ flex: '1 1 200px', minWidth: '160px' }} />
            <button className={styles.btnSearch} onClick={() => { setAppliedRegionFilters({ ...regionFilters }); setRegionPage(1); }}>Search</button>
            {appliedRegionFilters.search && (
              <button className={styles.btnSecondary} onClick={() => { setRegionFilters({ search: "" }); setAppliedRegionFilters({ search: "" }); setRegionPage(1); }}>Clear</button>
            )}
          </>
        )}
        {activeTab === "SUB-REGION" && (
          <>
            <input className={styles.searchInput} autoComplete="off" placeholder="Search code or name…" value={subRegionFilters.search} onChange={e => setSubRegionFilters(f => ({ ...f, search: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') { setAppliedSubRegionFilters({ ...subRegionFilters }); setSubRegionPage(1); } }} style={{ flex: '1 1 180px', minWidth: '140px' }} />
            <input className={styles.searchInput} autoComplete="off" placeholder="Region Code" value={subRegionFilters.region_code} onChange={e => setSubRegionFilters(f => ({ ...f, region_code: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') { setAppliedSubRegionFilters({ ...subRegionFilters }); setSubRegionPage(1); } }} style={{ flex: '1 1 130px', minWidth: '110px' }} />
            <button className={styles.btnSearch} onClick={() => { setAppliedSubRegionFilters({ ...subRegionFilters }); setSubRegionPage(1); }}>Search</button>
            {(appliedSubRegionFilters.search || appliedSubRegionFilters.region_code) && (
              <button className={styles.btnSecondary} onClick={() => { const e = { search: "", region_code: "" }; setSubRegionFilters(e); setAppliedSubRegionFilters(e); setSubRegionPage(1); }}>Clear</button>
            )}
          </>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {activeTab === "BRANCH" && (
            <button
              className={styles.btnAddUser}
              style={{ whiteSpace: 'nowrap', background: '#0284c7' }}
              onClick={() => setModal({ kind: "sync-confirm" })}
            >
              🔄 Sync CBS Branches
            </button>
          )}
          {isSuperAdmin && (
            <button
              className={styles.btnAddUser}
              style={{ whiteSpace: 'nowrap', background: '#10b981' }}
              onClick={() => setModal({ kind: "create" })}
            >
              + Add {activeTab === "SUB-REGION" ? "Sub-Region" : activeTab === "REGION" ? "Region" : activeTab === "STATE" ? "State" : activeTab === "DISTRICT" ? "District" : "Branch"}
            </button>
          )}
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            {activeTab === "BRANCH" && <tr><th className={styles.th}>Branch Code</th><th className={styles.th}>Branch Name</th><th className={styles.th}>Region</th><th className={styles.th}>Sub-Region</th><th className={styles.th}>District</th><th className={styles.th}>Actions</th></tr>}
            {activeTab === "DISTRICT" && <tr><th className={styles.th}>District Code</th><th className={styles.th}>District Name</th><th className={styles.th}>State</th><th className={styles.th}>Created</th><th className={styles.th}>Actions</th></tr>}
            {activeTab === "STATE" && <tr><th className={styles.th}>State Code</th><th className={styles.th}>State Name</th><th className={styles.th}>Created</th><th className={styles.th}>Actions</th></tr>}
            {activeTab === "REGION" && <tr><th className={styles.th}>Region Code</th><th className={styles.th}>Region Name</th><th className={styles.th}>Created</th><th className={styles.th}>Actions</th></tr>}
            {activeTab === "SUB-REGION" && <tr><th className={styles.th}>Sub-Region Code</th><th className={styles.th}>Sub-Region Name</th><th className={styles.th}>Region</th><th className={styles.th}>Created</th><th className={styles.th}>Actions</th></tr>}
          </thead>
          <tbody>
            {activeTab === "BRANCH" && branches.map(b => (
              <tr key={b.id} className={styles.tr}>
                <td className={styles.td}>{b.branch_code}</td><td className={styles.td}>{b.branch_name}</td><td className={styles.td}>{b.region_name || b.region_code || "—"}</td><td className={styles.td}>{b.sub_region_name || b.sub_region_code || "—"}</td><td className={styles.td}>{b.district_name || b.district_code || "—"}</td>
                <td className={styles.td}>
                  <button className={styles.btnIcon} title="View" onClick={async () => { try { const detail = await fetchBranch(b.branch_code); setModal({ kind: "view-branch", data: detail }); } catch (e: any) { setToast({ msg: e?.message || "Failed to load branch.", type: "error" }); } }}>👁️</button>
                  {isSuperAdmin && <button className={styles.btnIcon} title="Edit" onClick={() => setModal({ kind: "edit", data: b })}>✏️</button>}
                  <button className={styles.btnIcon} onClick={async () => { try { const r = await deleteBranch(b.branch_code); setToast({ msg: isMakerResponse(r) ? "Request submitted for checker approval." : "Branch deleted.", type: "success" }); loadData(); } catch (e: any) { const msg = e?.errors ? e.errors[Object.keys(e.errors)[0]][0] : e?.message || "Delete failed."; setToast({ msg, type: "error" }); } }}>🗑️</button>
                </td>
              </tr>
            ))}
            {activeTab === "DISTRICT" && districts.map(d => (
              <tr key={d.id} className={styles.tr}>
                <td className={styles.td}>{d.district_code}</td><td className={styles.td}>{d.district_name}</td><td className={styles.td}>{d.state_name || statesDropdown.find(s => s.state_code === d.state_code)?.state_name || d.state_code}</td><td className={styles.td}>{formatDate(d.created_at)}</td>
                <td className={styles.td}>
                  {isSuperAdmin && <button className={styles.btnIcon} title="Edit" onClick={() => setModal({ kind: "edit", data: d })}>✏️</button>}
                  <button className={styles.btnIcon} onClick={async () => { try { const r = await deleteDistrict(d.district_code); setToast({ msg: isMakerResponse(r) ? "Request submitted for checker approval." : "District deleted.", type: "success" }); loadData(); } catch (e: any) { const msg = e?.errors ? e.errors[Object.keys(e.errors)[0]][0] : e?.message || "Delete failed."; setToast({ msg, type: "error" }); } }}>🗑️</button>
                </td>
              </tr>
            ))}
            {activeTab === "STATE" && states.map(s => (
              <tr key={s.id} className={styles.tr}>
                <td className={styles.td}>{s.state_code}</td><td className={styles.td}>{s.state_name}</td><td className={styles.td}>{formatDate(s.created_at)}</td>
                <td className={styles.td}>
                  {isSuperAdmin && <button className={styles.btnIcon} title="Edit" onClick={() => setModal({ kind: "edit", data: s })}>✏️</button>}
                  <button className={styles.btnIcon} onClick={async () => { try { const r = await deleteState(s.state_code); setToast({ msg: isMakerResponse(r) ? "Request submitted for checker approval." : "State deleted.", type: "success" }); loadData(); } catch (e: any) { const msg = e?.errors ? e.errors[Object.keys(e.errors)[0]][0] : e?.message || "Delete failed."; setToast({ msg, type: "error" }); } }}>🗑️</button>
                </td>
              </tr>
            ))}
            {activeTab === "REGION" && regionsList.map(r => (
              <tr key={r.id} className={styles.tr}>
                <td className={styles.td}>{r.region_code}</td><td className={styles.td}>{r.region_name}</td><td className={styles.td}>{formatDate(r.created_at)}</td>
                <td className={styles.td}>
                  {isSuperAdmin && <button className={styles.btnIcon} title="Edit" onClick={() => setModal({ kind: "edit", data: r })}>✏️</button>}
                  <button className={styles.btnIcon} onClick={async () => { try { const res = await deleteRegion(r.region_code); setToast({ msg: isMakerResponse(res) ? "Request submitted for checker approval." : "Region deleted.", type: "success" }); loadData(); } catch (e: any) { const msg = e?.errors ? e.errors[Object.keys(e.errors)[0]][0] : e?.message || "Delete failed."; setToast({ msg, type: "error" }); } }}>🗑️</button>
                </td>
              </tr>
            ))}
            {activeTab === "SUB-REGION" && subRegionsList.map(sr => (
              <tr key={sr.id} className={styles.tr}>
                <td className={styles.td}>{sr.sub_region_code}</td><td className={styles.td}>{sr.sub_region_name}</td><td className={styles.td}>{sr.region_code}</td><td className={styles.td}>{formatDate(sr.created_at)}</td>
                <td className={styles.td}>
                  {isSuperAdmin && <button className={styles.btnIcon} title="Edit" onClick={() => setModal({ kind: "edit", data: sr })}>✏️</button>}
                  <button className={styles.btnIcon} onClick={async () => { try { const res = await deleteSubRegion(sr.sub_region_code); setToast({ msg: isMakerResponse(res) ? "Request submitted for checker approval." : "Sub-region deleted.", type: "success" }); loadData(); } catch (e: any) { const msg = e?.errors ? e.errors[Object.keys(e.errors)[0]][0] : e?.message || "Delete failed."; setToast({ msg, type: "error" }); } }}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeTab === "BRANCH" && branchMeta.last_page > 1 && (
        <div className={styles.pagination} style={{ justifyContent: 'center' }}>
          <div className={styles.paginationBtns}>
            <button className={styles.pageBtn} disabled={branchPage === 1} onClick={() => setBranchPage(p => p - 1)}>← Prev</button>
            {Array.from({ length: branchMeta.last_page }, (_, i) => i + 1).map(p => (
              <button key={p} className={`${styles.pageBtn} ${p === branchPage ? styles.pageBtnActive : ""}`} onClick={() => setBranchPage(p)}>{p}</button>
            ))}
            <button className={styles.pageBtn} disabled={branchPage >= branchMeta.last_page} onClick={() => setBranchPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      )}

      {activeTab === "STATE" && stateMeta.last_page > 1 && (
        <div className={styles.pagination} style={{ justifyContent: 'center' }}>
          <div className={styles.paginationBtns}>
            <button className={styles.pageBtn} disabled={statePage === 1} onClick={() => setStatePage(p => p - 1)}>← Prev</button>
            {Array.from({ length: stateMeta.last_page }, (_, i) => i + 1).map(p => (
              <button key={p} className={`${styles.pageBtn} ${p === statePage ? styles.pageBtnActive : ""}`} onClick={() => setStatePage(p)}>{p}</button>
            ))}
            <button className={styles.pageBtn} disabled={statePage >= stateMeta.last_page} onClick={() => setStatePage(p => p + 1)}>Next →</button>
          </div>
        </div>
      )}

      {activeTab === "DISTRICT" && districtMeta.last_page > 1 && (
        <div className={styles.pagination} style={{ justifyContent: 'center' }}>
          <div className={styles.paginationBtns}>
            <button className={styles.pageBtn} disabled={districtPage === 1} onClick={() => setDistrictPage(p => p - 1)}>← Prev</button>
            {Array.from({ length: districtMeta.last_page }, (_, i) => i + 1).map(p => (
              <button key={p} className={`${styles.pageBtn} ${p === districtPage ? styles.pageBtnActive : ""}`} onClick={() => setDistrictPage(p)}>{p}</button>
            ))}
            <button className={styles.pageBtn} disabled={districtPage >= districtMeta.last_page} onClick={() => setDistrictPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      )}

      {activeTab === "REGION" && regionMeta.last_page > 1 && (
        <div className={styles.pagination} style={{ justifyContent: 'center' }}>
          <div className={styles.paginationBtns}>
            <button className={styles.pageBtn} disabled={regionPage === 1} onClick={() => setRegionPage(p => p - 1)}>← Prev</button>
            {Array.from({ length: regionMeta.last_page }, (_, i) => i + 1).map(p => (
              <button key={p} className={`${styles.pageBtn} ${p === regionPage ? styles.pageBtnActive : ""}`} onClick={() => setRegionPage(p)}>{p}</button>
            ))}
            <button className={styles.pageBtn} disabled={regionPage >= regionMeta.last_page} onClick={() => setRegionPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      )}

      {activeTab === "SUB-REGION" && subRegionMeta.last_page > 1 && (
        <div className={styles.pagination} style={{ justifyContent: 'center' }}>
          <div className={styles.paginationBtns}>
            <button className={styles.pageBtn} disabled={subRegionPage === 1} onClick={() => setSubRegionPage(p => p - 1)}>← Prev</button>
            {Array.from({ length: subRegionMeta.last_page }, (_, i) => i + 1).map(p => (
              <button key={p} className={`${styles.pageBtn} ${p === subRegionPage ? styles.pageBtnActive : ""}`} onClick={() => setSubRegionPage(p)}>{p}</button>
            ))}
            <button className={styles.pageBtn} disabled={subRegionPage >= subRegionMeta.last_page} onClick={() => setSubRegionPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      )}

      {modal.kind === "view-branch" && modal.data && (
        <Modal title="Branch Details" onClose={() => setModal({ kind: "none" })}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '8px 0' }}>
            {([
              ["Branch Code", modal.data.branch_code],
              ["Branch Name", modal.data.branch_name],
              ["Branch Number", modal.data.branch_number],
              ["Region Code", modal.data.region_code],
              ["Sub-Region Code", modal.data.sub_region_code],
              ["District Code", modal.data.district_code ?? "—"],
              ["Created At", formatDate(modal.data.created_at)],
              ["Updated At", formatDate(modal.data.updated_at)],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748b', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontWeight: 500, color: '#1e293b' }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button className={styles.btnSecondary} onClick={() => setModal({ kind: "none" })}>Close</button>
          </div>
        </Modal>
      )}

      {modal.kind === "sync-confirm" && (
        <Modal title="Sync CBS Branches" onClose={() => setModal({ kind: "none" })}>
          <div style={{ padding: '16px' }}>
            <p style={{ marginBottom: '24px', color: '#334155' }}>Do you really want to sync data for branches with CBS?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className={styles.btnSecondary} onClick={() => setModal({ kind: "none" })} disabled={syncing}>No</button>
              <button className={styles.btnPrimary} style={{ background: '#0284c7' }} onClick={handleSyncBranches} disabled={syncing}>
                {syncing ? "Syncing..." : "Yes"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal.kind !== "none" && modal.kind !== "view-branch" && modal.kind !== "sync-confirm" && (
        <Modal title={`${modal.kind === "create" ? "Add" : "Edit"} ${activeTab}`} onClose={() => setModal({ kind: "none" })}>
          {activeTab === "BRANCH" && <BranchForm initial={modal.data || { branch_name: "", branch_code: "", branch_number: "", region_code: "", sub_region_code: "", district_code: "" }} isEdit={modal.kind === "edit"} regions={regions} onSubmit={async (d) => { try { if (modal.kind === "edit") { const res = await put(`/admin/branches/${modal.data.branch_code}`, { district_code: d.district_code }); const json = await res.json(); if (!res.ok) throw new Error(json.message || "Update failed"); setToast({ msg: "Branch district updated.", type: "success" }); } else { const r = await createBranch(d); setToast({ msg: isMakerResponse(r) ? "Request submitted for checker approval." : "Branch created.", type: "success" }); } setModal({ kind: "none" }); loadData(); } catch (e: any) { setToast({ msg: e?.message || "Action failed.", type: "error" }); } }} onClose={() => setModal({ kind: "none" })} />}

          {activeTab === "DISTRICT" && <DistrictForm
            initial={modal.data ? { state_code: modal.data.state_code, district_code: modal.data.district_code, district_name: modal.data.district_name } : { state_code: "", district_code: "", district_name: "" }}
            isEdit={modal.kind === "edit"}
            states={statesDropdown}
            onSubmit={async (d) => {
              try {
                const r = modal.kind === "edit" ? await updateDistrict(modal.data.district_code, d) : await createDistrict(d);
                setModal({ kind: "none" });
                setToast({ msg: isMakerResponse(r) ? "Request submitted for checker approval." : modal.kind === "edit" ? "District updated." : "District created.", type: "success" });
                loadData();
              } catch (e: any) {
                const msg = e?.errors ? e.errors[Object.keys(e.errors)[0]][0] : e?.message || "Action failed.";
                setToast({ msg, type: "error" });
              }
            }}
            onClose={() => setModal({ kind: "none" })}
          />}
          {activeTab === "STATE" && <StateForm initial={modal.data || { state_code: "", state_name: "" }} isEdit={modal.kind === "edit"} onSubmit={async (d) => { try { const r = modal.kind === "edit" ? await updateState(modal.data.state_code, d) : await createState(d); setModal({ kind: "none" }); setToast({ msg: isMakerResponse(r) ? "Request submitted for checker approval." : modal.kind === "edit" ? "State updated." : "State created.", type: "success" }); loadData(); } catch (e: any) { setToast({ msg: e?.message || "Action failed.", type: "error" }); } }} onClose={() => setModal({ kind: "none" })} />}
          {activeTab === "REGION" && <RegionFormInline initial={modal.data ? { region_code: modal.data.region_code, region_name: modal.data.region_name } : { region_code: "", region_name: "" }} onSubmit={async (d) => { try { const r = modal.kind === "edit" ? await updateRegion(modal.data.region_code, d) : await createRegion(d); setModal({ kind: "none" }); setToast({ msg: isMakerResponse(r) ? "Request submitted for checker approval." : modal.kind === "edit" ? "Region updated." : "Region created.", type: "success" }); loadData(); } catch (e: any) { setToast({ msg: e?.message || "Action failed.", type: "error" }); } }} onClose={() => setModal({ kind: "none" })} />}
          {activeTab === "SUB-REGION" && <SubRegionFormInline initial={modal.data ? { region_code: modal.data.region_code, sub_region_code: modal.data.sub_region_code, sub_region_name: modal.data.sub_region_name } : { region_code: "", sub_region_code: "", sub_region_name: "" }} regionsDropdown={regions} onSubmit={async (d) => { try { const r = modal.kind === "edit" ? await updateSubRegion(modal.data.sub_region_code, d) : await createSubRegion(d); setModal({ kind: "none" }); setToast({ msg: isMakerResponse(r) ? "Request submitted for checker approval." : modal.kind === "edit" ? "Sub-region updated." : "Sub-region created.", type: "success" }); loadData(); } catch (e: any) { const msg = e?.errors ? e.errors[Object.keys(e.errors)[0]][0] : e?.message || "Action failed."; setToast({ msg, type: "error" }); } }} onClose={() => setModal({ kind: "none" })} />}
        </Modal>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </>
  );
}
