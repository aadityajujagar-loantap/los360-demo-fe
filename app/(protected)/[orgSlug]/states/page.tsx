"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  type State,
  type CreateStatePayload,
  fetchStates,
  createState,
  updateState,
  deleteState,
  isMakerResponse,
} from "../../../_lib/redux/services/adminApi";
import styles from "../users/users.module.css";
import { get } from "../../../_lib/redux/services/apiClient";

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

// ─── State Form ──────────────────────────────────────────────────────────────

function StateForm({
  initial,
  isEdit,
  onSubmit,
  onClose,
}: {
  initial: CreateStatePayload;
  isEdit: boolean;
  onSubmit: (data: CreateStatePayload) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CreateStatePayload>(initial);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors((prev) => { const n = { ...prev }; delete n[e.target.name]; return n; });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
          State Code <span className={styles.required}>*</span>
        </label>
        <input
          name="state_code"
          type="text"
          value={form.state_code}
          onChange={handleChange}
          placeholder="e.g. MH"
          required
          className={`${styles.input} ${errors.state_code ? styles.inputErr : ""}`}
          autoComplete="off"
        />
        {errors.state_code && <p className={styles.fieldErr}>{errors.state_code[0]}</p>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          State Name <span className={styles.required}>*</span>
        </label>
        <input
          name="state_name"
          type="text"
          value={form.state_name}
          onChange={handleChange}
          placeholder="e.g. Maharashtra"
          required
          className={`${styles.input} ${errors.state_name ? styles.inputErr : ""}`}
          autoComplete="off"
        />
        {errors.state_name && <p className={styles.fieldErr}>{errors.state_name[0]}</p>}
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
          {saving ? "Saving…" : isEdit ? "✎ Update State" : "+ Create State"}
        </button>
      </div>
    </form>
  );
}

// ─── Modal State ─────────────────────────────────────────────────────────────

type ModalState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; state: State }
  | { kind: "confirm-delete"; state: State };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatesPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();

  const [authUser, setAuthUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [statesList, setStatesList] = useState<State[]>([]);
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

  // ── Fetch states ─────────────────────────────────────────────────────────────
  const loadStates = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const result = await fetchStates();
      setStatesList(result.data);
    } catch (e: any) {
      setListError(e?.message || "Failed to load states.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && authUser) loadStates();
  }, [authLoading, authUser, loadStates]);

  // ── Filtered ────────────────────────────────────────────────────────────────
  const displayed = search.trim()
    ? statesList.filter(
        (s) =>
          s.state_code.toLowerCase().includes(search.toLowerCase()) ||
          s.state_name.toLowerCase().includes(search.toLowerCase())
      )
    : statesList;

  // ── Actions ─────────────────────────────────────────────────────────────────

  function showToast(message: string, type: ToastType) {
    setToast({ message, type });
  }

  async function handleCreate(form: CreateStatePayload) {
    try {
      const result = await createState(form);
      setModal({ kind: "none" });
      if (isMakerResponse(result)) {
        showToast("Request submitted for checker approval.", "success");
      } else {
        showToast("State created successfully.", "success");
      }
    } catch (e: any) {
      if (e?.errors) {
        const firstKey = Object.keys(e.errors)[0];
        showToast(e.errors[firstKey][0], "error");
      } else {
        showToast(e?.message || "Failed to create state.", "error");
      }
    }
    loadStates();
  }

  async function handleUpdate(state: State, form: CreateStatePayload) {
    try {
      const result = await updateState(state.state_code, form);
      setModal({ kind: "none" });
      if (isMakerResponse(result)) {
        showToast("Request submitted for checker approval.", "success");
      } else {
        showToast("State updated successfully.", "success");
      }
    } catch (e: any) {
      if (e?.errors) {
        const firstKey = Object.keys(e.errors)[0];
        showToast(e.errors[firstKey][0], "error");
      } else {
        showToast(e?.message || "Failed to update state.", "error");
      }
    }
    loadStates();
  }

  async function handleDelete(state: State) {
    try {
      const result = await deleteState(state.state_code);
      if (isMakerResponse(result)) {
        showToast("Request submitted for checker approval.", "success");
      } else {
        showToast(`State "${state.state_name}" deleted.`, "success");
      }
    } catch (e: any) {
      showToast(e?.message || "Failed to delete state.", "error");
    }
    setModal({ kind: "none" });
    loadStates();
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
          <h1 className={styles.pageTitle}>States</h1>
          <p className={styles.pageSubtitle}>Manage states/provinces for addresses</p>
        </div>
        <div className={styles.topbarRight}>
          <button
            className={styles.btnPrimary}
            onClick={() => setModal({ kind: "create" })}
          >
            + New State
          </button>
        </div>
      </header>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#eef2ff" }}>🌍</div>
          <div>
            <div className={styles.statValue}>{statesList.length}</div>
            <div className={styles.statLabel}>Total States</div>
          </div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            type="text"
            autoComplete="off"
            placeholder="Search state code or name..."
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
            <p>Loading states…</p>
          </div>
        ) : listError ? (
          <div className={styles.tableError}>
            <p>⚠ {listError}</p>
            <button className={styles.btnSecondary} onClick={loadStates}>Retry</button>
          </div>
        ) : displayed.length === 0 ? (
          <div className={styles.tableEmpty}>
            <div className={styles.emptyIcon}>🌍</div>
            <p>No states found.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Code</th>
                <th className={styles.th}>Name</th>
                <th className={styles.th}>Created</th>
                <th className={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((s) => (
                <tr key={s.id} className={styles.tr}>
                  <td className={styles.td}>
                    <span className={styles.badge}>{s.state_code}</span>
                  </td>
                  <td className={styles.td}>{s.state_name}</td>
                  <td className={styles.td}>{formatDate(s.created_at)}</td>
                  <td className={styles.td}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className={styles.btnIcon}
                        onClick={() => setModal({ kind: "edit", state: s })}
                      >
                        ✏️
                      </button>
                      <button
                        className={styles.btnIcon}
                        onClick={() => setModal({ kind: "confirm-delete", state: s })}
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
        <Modal title="New State" onClose={() => setModal({ kind: "none" })}>
          <StateForm
            initial={{ state_code: "", state_name: "" }}
            isEdit={false}
            onSubmit={handleCreate}
            onClose={() => setModal({ kind: "none" })}
          />
        </Modal>
      )}

      {modal.kind === "edit" && (
        <Modal title={`Edit State`} onClose={() => setModal({ kind: "none" })}>
          <StateForm
            initial={{
              state_code: modal.state.state_code,
              state_name: modal.state.state_name
            }}
            isEdit={true}
            onSubmit={(form) => handleUpdate(modal.state, form)}
            onClose={() => setModal({ kind: "none" })}
          />
        </Modal>
      )}

      {modal.kind === "confirm-delete" && (
        <Modal title="Confirm Delete" onClose={() => setModal({ kind: "none" })}>
          <div className={styles.confirmBox}>
            <p className={styles.confirmMsg}>
              Delete state <strong>{modal.state.state_name}</strong>? This cannot be undone.
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.btnSecondary} onClick={() => setModal({ kind: "none" })}>Cancel</button>
              <button className={styles.btnDanger} onClick={() => handleDelete(modal.state)}>Delete</button>
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
