"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  type District,
  type CreateDistrictPayload,
  type State,
  fetchDistricts,
  createDistrict,
  updateDistrict,
  deleteDistrict,
  fetchStatesDropdown,
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

// ─── District Form ────────────────────────────────────────────────────────────

function DistrictForm({
  initial,
  isEdit,
  states,
  onSubmit,
  onClose,
}: {
  initial: CreateDistrictPayload;
  isEdit: boolean;
  states: State[];
  onSubmit: (data: CreateDistrictPayload) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CreateDistrictPayload>(initial);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors((prev) => { const n = { ...prev }; delete n[e.target.name]; return n; });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.state_code) {
      setErrors({ state_code: ["Please select a state"] });
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      await onSubmit(form);
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
        <label className={styles.label}>
          State <span className={styles.required}>*</span>
        </label>
        <select
          name="state_code"
          value={form.state_code}
          onChange={handleChange}
          required
          className={`${styles.filterSelect} ${errors.state_code ? styles.inputErr : ""}`}
          style={{ width: '100%' }}
        >
          <option value="">Select State...</option>
          {states.map(s => (
            <option key={s.id} value={s.state_code}>{s.state_name} ({s.state_code})</option>
          ))}
        </select>
        {errors.state_code && <p className={styles.fieldErr}>{errors.state_code[0]}</p>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          District Code <span className={styles.required}>*</span>
        </label>
        <input
          name="district_code"
          type="text"
          value={form.district_code}
          onChange={handleChange}
          placeholder="e.g. D-01"
          required
          className={`${styles.input} ${errors.district_code ? styles.inputErr : ""}`}
          autoComplete="off"
        />
        {errors.district_code && <p className={styles.fieldErr}>{errors.district_code[0]}</p>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          District Name <span className={styles.required}>*</span>
        </label>
        <input
          name="district_name"
          type="text"
          value={form.district_name}
          onChange={handleChange}
          placeholder="e.g. Pune Central"
          required
          className={`${styles.input} ${errors.district_name ? styles.inputErr : ""}`}
          autoComplete="off"
        />
        {errors.district_name && <p className={styles.fieldErr}>{errors.district_name[0]}</p>}
      </div>

      {errors._ && <p className={styles.formErr}>{errors._[0]}</p>}

      <div className={styles.formFooter}>
        <button type="button" className={styles.btnSecondary} onClick={onClose}>
          Cancel
        </button>
        <button
          type="submit"
          className={styles.btnPrimary}
          disabled={saving}
        >
          {saving ? "Saving…" : isEdit ? "✎ Update District" : "+ Create District"}
        </button>
      </div>
    </form>
  );
}

// ─── Modal State ─────────────────────────────────────────────────────────────

type ModalState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; district: District }
  | { kind: "confirm-delete"; district: District };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DistrictsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();

  const [authUser, setAuthUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [districts, setDistricts] = useState<District[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const res = await get("/user");
      if (res.ok) {
        setAuthUser(await res.json());
      } else {
        localStorage.removeItem("auth_token");
        router.push(`/${orgSlug}/login`);
      }
      setAuthLoading(false);
    })();
  }, [router, orgSlug]);

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const [dData, sData] = await Promise.all([
        fetchDistricts(),
        fetchStatesDropdown()
      ]);
      setDistricts(dData.data);
      setStates(sData);
    } catch (e: any) {
      setListError(e?.message || "Failed to load districts.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && authUser) loadData();
  }, [authLoading, authUser, loadData]);

  // ── Filtered ────────────────────────────────────────────────────────────────
  const displayed = search.trim()
    ? districts.filter(
        (d) =>
          d.district_code.toLowerCase().includes(search.toLowerCase()) ||
          d.district_name.toLowerCase().includes(search.toLowerCase()) ||
          d.state_name?.toLowerCase().includes(search.toLowerCase())
      )
    : districts;

  // ── Actions ─────────────────────────────────────────────────────────────────

  function showToast(message: string, type: ToastType) {
    setToast({ message, type });
  }

  async function handleCreate(form: CreateDistrictPayload) {
    try {
      const result = await createDistrict(form);
      setModal({ kind: "none" });
      if (isMakerResponse(result)) {
        showToast("Request submitted for checker approval.", "success");
      } else {
        showToast("District created successfully.", "success");
      }
    } catch (e: any) {
      if (e?.errors) {
        const firstKey = Object.keys(e.errors)[0];
        showToast(e.errors[firstKey][0], "error");
      } else {
        showToast(e?.message || "Failed to create district.", "error");
      }
    }
    loadData();
  }

  async function handleUpdate(d: District, form: CreateDistrictPayload) {
    try {
      const result = await updateDistrict(d.district_code, form);
      setModal({ kind: "none" });
      if (isMakerResponse(result)) {
        showToast("Request submitted for checker approval.", "success");
      } else {
        showToast("District updated successfully.", "success");
      }
    } catch (e: any) {
      if (e?.errors) {
        const firstKey = Object.keys(e.errors)[0];
        showToast(e.errors[firstKey][0], "error");
      } else {
        showToast(e?.message || "Failed to update district.", "error");
      }
    }
    loadData();
  }

  async function handleDelete(d: District) {
    try {
      const result = await deleteDistrict(d.district_code);
      if (isMakerResponse(result)) {
        showToast("Request submitted for checker approval.", "success");
      } else {
        showToast(`District "${d.district_name}" deleted.`, "success");
      }
    } catch (e: any) {
      showToast(e?.message || "Failed to delete district.", "error");
    }
    setModal({ kind: "none" });
    loadData();
  }

  if (authLoading) {
    return (
      <div className={styles.centered}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>Loading…</p>
      </div>
    );
  }

  return (
    <>
      <header className={styles.topbar}>
        <div>
          <h1 className={styles.pageTitle}>Districts</h1>
          <p className={styles.pageSubtitle}>Manage administrative districts within states</p>
        </div>
        <div className={styles.topbarRight}>
          <button
            className={styles.btnPrimary}
            onClick={() => setModal({ kind: "create" })}
          >
            + New District
          </button>
        </div>
      </header>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#eef2ff" }}>🏢</div>
          <div>
            <div className={styles.statValue}>{districts.length}</div>
            <div className={styles.statLabel}>Total Districts</div>
          </div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search code, name or state..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.searchClear} onClick={() => setSearch("")}>✕</button>
          )}
        </div>
      </div>

      <div className={styles.tableWrap}>
        {listLoading ? (
          <div className={styles.tableLoader}>
            <div className={styles.spinner} />
            <p>Loading districts…</p>
          </div>
        ) : listError ? (
          <div className={styles.tableError}>
            <p>⚠ {listError}</p>
            <button className={styles.btnSecondary} onClick={loadData}>Retry</button>
          </div>
        ) : displayed.length === 0 ? (
          <div className={styles.tableEmpty}>
            <div className={styles.emptyIcon}>🏢</div>
            <p>No districts found.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Code</th>
                <th className={styles.th}>Name</th>
                <th className={styles.th}>State</th>
                <th className={styles.th}>Created</th>
                <th className={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((d) => (
                <tr key={d.id} className={styles.tr}>
                  <td className={styles.td}>
                    <span className={styles.badge}>{d.district_code}</span>
                  </td>
                  <td className={styles.td}>{d.district_name}</td>
                  <td className={styles.td}>{d.state_name || "N/A"}</td>
                  <td className={styles.td}>{formatDate(d.created_at)}</td>
                  <td className={styles.td}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className={styles.btnIcon}
                        onClick={() => setModal({ kind: "edit", district: d })}
                      >
                        ✏️
                      </button>
                      <button
                        className={styles.btnIcon}
                        onClick={() => setModal({ kind: "confirm-delete", district: d })}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal.kind === "create" && (
        <Modal title="New District" onClose={() => setModal({ kind: "none" })}>
          <DistrictForm
            initial={{ state_code: "", district_code: "", district_name: "" }}
            isEdit={false}
            states={states}
            onSubmit={handleCreate}
            onClose={() => setModal({ kind: "none" })}
          />
        </Modal>
      )}

      {modal.kind === "edit" && (
        <Modal title={`Edit District`} onClose={() => setModal({ kind: "none" })}>
          <DistrictForm
            initial={{
              state_code: modal.district.state_code,
              district_code: modal.district.district_code,
              district_name: modal.district.district_name
            }}
            isEdit={true}
            states={states}
            onSubmit={(form) => handleUpdate(modal.district, form)}
            onClose={() => setModal({ kind: "none" })}
          />
        </Modal>
      )}

      {modal.kind === "confirm-delete" && (
        <Modal title="Confirm Delete" onClose={() => setModal({ kind: "none" })}>
          <div className={styles.confirmBox}>
            <p className={styles.confirmMsg}>
              Delete district <strong>{modal.district.district_name}</strong>? This cannot be undone.
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.btnSecondary} onClick={() => setModal({ kind: "none" })}>Cancel</button>
              <button className={styles.btnDanger} onClick={() => handleDelete(modal.district)}>Delete</button>
            </div>
          </div>
        </Modal>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />
      )}
    </>
  );
}
