"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  type BranchRole,
  type CreateBranchRolePayload,
  fetchBranchRoles,
  createBranchRole,
  updateBranchRole,
  deleteBranchRole,
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

// ─── Branch Role Form ────────────────────────────────────────────────────────

function BranchRoleForm({
  initial,
  isEdit,
  onSubmit,
  onClose,
}: {
  initial: CreateBranchRolePayload;
  isEdit: boolean;
  onSubmit: (data: CreateBranchRolePayload) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CreateBranchRolePayload>(initial);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors((prev) => { const n = { ...prev }; delete n[e.target.name]; return n; });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const code = form.branch_role_id.trim();
    const name = form.rolename.trim();

    // Frontend validation
    const newErrors: Record<string, string[]> = {};
    if (!code) {
      newErrors.branch_role_id = ["Branch Role ID is required."];
    } else if (code.length > 200) {
      newErrors.branch_role_id = ["Branch Role ID cannot exceed 200 characters."];
    } else if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
      newErrors.branch_role_id = ["Branch Role ID should only contain letters, numbers, hyphens, or underscores."];
    }

    if (!name) {
      newErrors.rolename = ["Role Name is required."];
    } else if (name.length > 200) {
      newErrors.rolename = ["Role Name cannot exceed 200 characters."];
    } else if (!/^[a-zA-Z0-9\s.]+$/.test(name)) {
      newErrors.rolename = ["Role Name should only contain letters, numbers, spaces, or dots."];
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      await onSubmit({
        ...form,
        branch_role_id: code,
        rolename: name,
      });
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
          Branch Role ID (Slug) <span className={styles.required}>*</span>
        </label>
        <input
          name="branch_role_id"
          type="text"
          value={form.branch_role_id}
          onChange={handleChange}
          placeholder="e.g. branch_mgr"
          required
          className={`${styles.input} ${errors.branch_role_id ? styles.inputErr : ""}`}
          autoComplete="off"
          maxLength={200}
        />
        {errors.branch_role_id && <p className={styles.fieldErr}>{errors.branch_role_id[0]}</p>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          Role Name <span className={styles.required}>*</span>
        </label>
        <input
          name="rolename"
          type="text"
          value={form.rolename}
          onChange={handleChange}
          placeholder="e.g. Branch Manager"
          required
          className={`${styles.input} ${errors.rolename ? styles.inputErr : ""}`}
          autoComplete="off"
          maxLength={200}
        />
        {errors.rolename && <p className={styles.fieldErr}>{errors.rolename[0]}</p>}
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
          {saving ? "Saving…" : isEdit ? "✎ Update Branch Role" : "+ Create Branch Role"}
        </button>
      </div>
    </form>
  );
}

// ─── Modal State ─────────────────────────────────────────────────────────────

type ModalState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; role: BranchRole }
  | { kind: "confirm-delete"; role: BranchRole };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BranchRolesPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();

  const [authUser, setAuthUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [roles, setRoles] = useState<BranchRole[]>([]);
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

  // ── Fetch branch roles ──────────────────────────────────────────────────────
  const loadRoles = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const data = await fetchBranchRoles();
      setRoles(data);
    } catch (e: any) {
      setListError(e?.message || "Failed to load branch roles.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && authUser) loadRoles();
  }, [authLoading, authUser, loadRoles]);

  // ── Filtered ────────────────────────────────────────────────────────────────
  const displayed = search.trim()
    ? roles.filter(
        (r) =>
          r.branch_role_id.toLowerCase().includes(search.toLowerCase()) ||
          r.rolename.toLowerCase().includes(search.toLowerCase())
      )
    : roles;

  // ── Actions ─────────────────────────────────────────────────────────────────

  function showToast(message: string, type: ToastType) {
    setToast({ message, type });
  }

  async function handleCreate(form: CreateBranchRolePayload) {
    await createBranchRole(form);
    setModal({ kind: "none" });
    showToast("Branch Role created.", "success");
    loadRoles();
  }

  async function handleUpdate(role: BranchRole, form: CreateBranchRolePayload) {
    await updateBranchRole(role.id, form);
    setModal({ kind: "none" });
    showToast("Branch Role updated.", "success");
    loadRoles();
  }

  async function handleDelete(role: BranchRole) {
    try {
      await deleteBranchRole(role.id);
      showToast(`Role "${role.rolename}" deleted.`, "success");
    } catch (e: any) {
      showToast(e?.message || "Failed to delete branch role.", "error");
    }
    setModal({ kind: "none" });
    loadRoles();
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
          <h1 className={styles.pageTitle}>Branch Roles</h1>
          <p className={styles.pageSubtitle}>Manage roles specific to branch internal operations</p>
        </div>
        <div className={styles.topbarRight}>
          <button
            className={styles.btnPrimary}
            onClick={() => setModal({ kind: "create" })}
          >
            + New Branch Role
          </button>
        </div>
      </header>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#eef2ff" }}>🔒</div>
          <div>
            <div className={styles.statValue}>{roles.length}</div>
            <div className={styles.statLabel}>Total Branch Roles</div>
          </div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search role name or ID..."
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
            <p>Loading roles…</p>
          </div>
        ) : listError ? (
          <div className={styles.tableError}>
            <p>⚠ {listError}</p>
            <button className={styles.btnSecondary} onClick={loadRoles}>Retry</button>
          </div>
        ) : displayed.length === 0 ? (
          <div className={styles.tableEmpty}>
            <div className={styles.emptyIcon}>🔒</div>
            <p>No branch roles found.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Role ID</th>
                <th className={styles.th}>Role Name</th>
                <th className={styles.th}>Created</th>
                <th className={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((r) => (
                <tr key={r.id} className={styles.tr}>
                  <td className={styles.td}>
                    <span className={styles.badge}>{r.branch_role_id}</span>
                  </td>
                  <td className={styles.td}>{r.rolename}</td>
                  <td className={styles.td}>{formatDate(r.created_at)}</td>
                  <td className={styles.td}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className={styles.btnIcon}
                        onClick={() => setModal({ kind: "edit", role: r })}
                      >
                        ✏️
                      </button>
                      <button
                        className={styles.btnIcon}
                        onClick={() => setModal({ kind: "confirm-delete", role: r })}
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
        <Modal title="New Branch Role" onClose={() => setModal({ kind: "none" })}>
          <BranchRoleForm
            initial={{ branch_role_id: "", rolename: "" }}
            isEdit={false}
            onSubmit={handleCreate}
            onClose={() => setModal({ kind: "none" })}
          />
        </Modal>
      )}

      {modal.kind === "edit" && (
        <Modal title={`Edit Branch Role`} onClose={() => setModal({ kind: "none" })}>
          <BranchRoleForm
            initial={{
              branch_role_id: modal.role.branch_role_id,
              rolename: modal.role.rolename
            }}
            isEdit={true}
            onSubmit={(form) => handleUpdate(modal.role, form)}
            onClose={() => setModal({ kind: "none" })}
          />
        </Modal>
      )}

      {modal.kind === "confirm-delete" && (
        <Modal title="Confirm Delete" onClose={() => setModal({ kind: "none" })}>
          <div className={styles.confirmBox}>
            <p className={styles.confirmMsg}>
              Delete branch role <strong>{modal.role.rolename}</strong>?
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.btnSecondary} onClick={() => setModal({ kind: "none" })}>Cancel</button>
              <button className={styles.btnDanger} onClick={() => handleDelete(modal.role)}>Delete</button>
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
