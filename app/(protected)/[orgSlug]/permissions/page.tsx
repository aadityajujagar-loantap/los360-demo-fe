"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  type Permission,
  fetchPermissions,
  createPermission,
  updatePermission,
  deletePermission,
} from "../../../_lib/redux/services/adminApi";
import styles from "./permissions.module.css";
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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
  "#14b8a6",
];
function avatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

// ─── Empty form ──────────────────────────────────────────────────────────────

const EMPTY_FORM = { name: "", description: "" };

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
  icon,
  onClose,
  children,
}: {
  title: string;
  icon?: string;
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
          <div className={styles.modalHeaderLeft}>
            {icon && <div className={styles.modalHeaderIcon}>{icon}</div>}
            <h2 className={styles.modalTitle}>{title}</h2>
          </div>
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

// ─── Confirm Dialog ──────────────────────────────────────────────────────────

function ConfirmDialog({
  permissionName,
  onConfirm,
  onCancel,
}: {
  permissionName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
        <span className={styles.confirmIcon}>🗑️</span>
        <p className={styles.confirmMsg}>
          Are you sure you want to delete permission{" "}
          <span className={styles.namePill}>{permissionName}</span>?
          <br />
          This action cannot be undone.
        </p>
        <div className={styles.confirmActions}>
          <button className={styles.btnSecondary} onClick={onCancel}>
            Cancel
          </button>
          <button
            id="confirm-delete-btn"
            className={styles.btnDanger}
            onClick={onConfirm}
          >
            Delete Permission
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Permission Form ──────────────────────────────────────────────────────────

function PermissionForm({
  initial,
  isEdit,
  onSubmit,
  onClose,
}: {
  initial: typeof EMPTY_FORM;
  isEdit: boolean;
  onSubmit: (data: typeof EMPTY_FORM) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm({ ...form, [e.target.name]: trimTo90Limit(e.target.value) });
    setErrors((prev) => {
      const n = { ...prev };
      delete n[e.target.name];
      return n;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const sanitizedName = form.name.trim().toLowerCase();
    if (!sanitizedName) {
      setErrors({ name: ["Permission name is required."] });
      return;
    }

    // Strictly allow only lowercase a-z, 0-9, dots, and underscores
    const isValid = /^[a-z0-9._]+$/.test(sanitizedName);
    if (!isValid) {
      setErrors({
        name: [
          "Permission name contains invalid characters. Use only lowercase letters, numbers, dots, and underscores.",
        ],
      });
      return;
    }

    if (sanitizedName.length > 90) {
      setErrors({ name: ["Permission name cannot exceed 90 characters."] });
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      await onSubmit({ ...form, name: sanitizedName });
    } catch (err: any) {
      if (err?.errors) setErrors(err.errors);
      else if (err?.message) setErrors({ _: [err.message] });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Name */}
      <div className={styles.formGroup}>
        <label className={styles.label}>
          Permission Name <span className={styles.required}>*</span>
        </label>
        <input
          id="perm-name-input"
          name="name"
          type="text"
          value={form.name}
          onChange={handleChange}
          placeholder="e.g. users.create"
          required
          maxLength={90}
          className={`${styles.input} ${errors.name ? styles.inputErr : ""}`}
          autoComplete="off"
          autoFocus
        />
        {errors.name && <p className={styles.fieldErr}>{errors.name[0]}</p>}
        <p className={styles.formHint}>
          Use dot-notation like <code>resource.action</code> (e.g.{" "}
          <code>leads.view</code>,&nbsp;
          <code>customers.delete</code>)
        </p>
      </div>

      {/* Description */}
      <div className={styles.formGroup}>
        <label className={styles.label}>Description</label>
        <textarea
          id="perm-desc-input"
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Briefly describe what this permission allows…"
          maxLength={90}
          className={`${styles.textarea} ${errors.description ? styles.inputErr : ""}`}
        />
        {errors.description && (
          <p className={styles.fieldErr}>{errors.description[0]}</p>
        )}
      </div>

      {errors._ && <p className={styles.formErr}>{errors._[0]}</p>}

      <div className={styles.formFooter}>
        <button type="button" className={styles.btnSecondary} onClick={onClose}>
          Cancel
        </button>
        <button
          id={isEdit ? "update-perm-btn" : "create-perm-btn"}
          type="submit"
          className={styles.btnPrimary}
          disabled={saving}
        >
          {saving ? "Saving…" : isEdit ? "✎ Update" : "+ Create"}
        </button>
      </div>
    </form>
  );
}

// ─── Modal state types ────────────────────────────────────────────────────────

type ModalState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; permission: Permission }
  | { kind: "confirm-delete"; permission: Permission };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PermissionsPage() {
  const { orgSlug } = useParams();
  const router = useRouter();

  // Auth
  const [authUser, setAuthUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Permissions list
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");

  // Search
  const [search, setSearch] = useState("");

  // View toggle: "grid" | "table"
  const [view, setView] = useState<"grid" | "table">("grid");

  // Modal
  const [modal, setModal] = useState<ModalState>({ kind: "none" });

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  // ── Auth check ───────────────────────────────────────────────────────────────
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

  // ── Fetch permissions ────────────────────────────────────────────────────────
  const loadPermissions = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const data = await fetchPermissions();
      setPermissions(data);
    } catch (e: any) {
      setListError(e?.message || "Failed to load permissions.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && authUser) loadPermissions();
  }, [authLoading, authUser, loadPermissions]);

  // ── Filter ───────────────────────────────────────────────────────────────────
  const displayed = search.trim()
    ? permissions.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.description ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : permissions;

  // ── Actions ──────────────────────────────────────────────────────────────────

  function showToast(message: string, type: ToastType) {
    setToast({ message, type });
  }

  async function handleCreate(form: typeof EMPTY_FORM) {
    const name = form.name.trim().toLowerCase();
    if (!/^[a-z0-9._]+$/.test(name)) {
      showToast(
        "Invalid permission name. Use lowercase, numbers, dots, and underscores.",
        "error",
      );
      return;
    }
    await createPermission({
      name,
      description: form.description || undefined,
    });
    setModal({ kind: "none" });
    showToast("Permission created successfully.", "success");
    loadPermissions();
  }

  async function handleUpdate(permission: Permission, form: typeof EMPTY_FORM) {
    const name = form.name.trim().toLowerCase();
    if (!/^[a-z0-9._]+$/.test(name)) {
      showToast(
        "Invalid permission name. Use lowercase, numbers, dots, and underscores.",
        "error",
      );
      return;
    }
    await updatePermission(permission.id, {
      name,
      description: form.description || undefined,
    });
    setModal({ kind: "none" });
    showToast("Permission updated successfully.", "success");
    loadPermissions();
  }

  async function handleDelete(permission: Permission) {
    try {
      await deletePermission(permission.id);
      showToast(`Permission "${permission.name}" deleted.`, "success");
    } catch (e: any) {
      showToast(e?.message || "Failed to delete permission.", "error");
    }
    setModal({ kind: "none" });
    loadPermissions();
  }

  function handleLogout() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("org_slug");
    router.push(`/${orgSlug}/login`);
  }

  // ── Loading screen ────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className={styles.centered}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>Loading…</p>
      </div>
    );
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const total = permissions.length;
  const withDesc = permissions.filter((p) => !!p.description).length;
  const withoutDesc = total - withDesc;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
        {/* Top bar */}
        <header className={styles.topbar}>
          <div>
            <h1 className={styles.pageTitle}>Permissions</h1>
            <p className={styles.pageSubtitle}>
              Define granular access controls for your system
            </p>
          </div>
          <div className={styles.topbarRight}>
            <div className={styles.avatarChip}>
              <div
                className={styles.avatarSmall}
                style={{ background: avatarColor(authUser?.id ?? 0) }}
              >
                {getInitials(authUser?.name ?? "A")}
              </div>
              <span className={styles.avatarName}>{authUser?.name}</span>
            </div>
            <button
              id="create-permission-btn"
              className={styles.btnPrimary}
              onClick={() => setModal({ kind: "create" })}
            >
              + New Permission
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "#eef2ff" }}>
              🛡️
            </div>
            <div>
              <div className={styles.statValue}>{total}</div>
              <div className={styles.statLabel}>Total Permissions</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "#f0fdf4" }}>
              📝
            </div>
            <div>
              <div className={styles.statValue} style={{ color: "#15803d" }}>
                {withDesc}
              </div>
              <div className={styles.statLabel}>With Description</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "#fff7ed" }}>
              ⚠️
            </div>
            <div>
              <div className={styles.statValue} style={{ color: "#b45309" }}>
                {withoutDesc}
              </div>
              <div className={styles.statLabel}>Missing Description</div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              id="permission-search"
              className={styles.searchInput}
              type="text"
              placeholder="Search permissions by name or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className={styles.searchClear}
                onClick={() => setSearch("")}
              >
                ✕
              </button>
            )}
          </div>

          {/* View toggle */}
          <div className={styles.viewToggle}>
            <button
              id="view-grid-btn"
              className={`${styles.viewBtn} ${view === "grid" ? styles.viewBtnActive : ""}`}
              onClick={() => setView("grid")}
              title="Grid view"
            >
              ▦ Grid
            </button>
            <button
              id="view-table-btn"
              className={`${styles.viewBtn} ${view === "table" ? styles.viewBtnActive : ""}`}
              onClick={() => setView("table")}
              title="Table view"
            >
              ≡ Table
            </button>
          </div>
        </div>

        {/* Content */}
        {listLoading ? (
          <div className={styles.cardsLoading}>
            <div className={styles.spinner} />
            <p>Loading permissions…</p>
          </div>
        ) : listError ? (
          <div className={styles.cardsSection}>
            <div className={styles.cardsEmpty}>
              <div className={styles.emptyIcon}>⚠️</div>
              <p>{listError}</p>
              <button className={styles.btnSecondary} onClick={loadPermissions}>
                Retry
              </button>
            </div>
          </div>
        ) : view === "grid" ? (
          /* ─── Grid view ─────────────────────────────────────────────────── */
          <div className={styles.cardsSection}>
            {displayed.length === 0 ? (
              <div className={styles.cardsEmpty}>
                <div className={styles.emptyIcon}>🛡️</div>
                <p>
                  {search
                    ? "No permissions match your search."
                    : "No permissions yet. Create one!"}
                </p>
                {search ? (
                  <button
                    className={styles.btnSecondary}
                    onClick={() => setSearch("")}
                  >
                    Clear Search
                  </button>
                ) : (
                  <button
                    className={styles.btnPrimary}
                    onClick={() => setModal({ kind: "create" })}
                  >
                    + New Permission
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.cardsGrid}>
                {displayed.map((p) => (
                  <div key={p.id} className={styles.permissionCard}>
                    <div className={styles.cardHeader}>
                      <div className={styles.cardIconWrap}>🛡️</div>
                      <span className={styles.cardIdBadge}>#{p.id}</span>
                      <div className={styles.cardActions}>
                        <button
                          id={`edit-perm-${p.id}`}
                          title="Edit"
                          className={`${styles.actionBtn} ${styles.actionEdit}`}
                          onClick={() =>
                            setModal({ kind: "edit", permission: p })
                          }
                        >
                          ✏️
                        </button>
                        <button
                          id={`delete-perm-${p.id}`}
                          title="Delete"
                          className={`${styles.actionBtn} ${styles.actionDelete}`}
                          onClick={() =>
                            setModal({ kind: "confirm-delete", permission: p })
                          }
                        >
                          🗑
                        </button>
                      </div>
                    </div>

                    <div className={styles.cardName}>{p.name}</div>

                    <div className={styles.cardDesc}>
                      {p.description || (
                        <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
                          No description provided
                        </span>
                      )}
                    </div>

                    <div className={styles.cardFooter}>
                      <span className={styles.cardDate}>
                        Created {formatDate(p.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ─── Table view ────────────────────────────────────────────────── */
          <div style={{ padding: "0 32px 32px" }}>
            <div className={styles.tableWrap}>
              {displayed.length === 0 ? (
                <div className={styles.tableEmpty}>
                  <div className={styles.emptyIcon}>🛡️</div>
                  <p>
                    {search
                      ? "No permissions match your search."
                      : "No permissions yet."}
                  </p>
                  {search && (
                    <button
                      className={styles.btnSecondary}
                      onClick={() => setSearch("")}
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Permission</th>
                      <th className={styles.th}>Description</th>
                      <th className={styles.th}>Created</th>
                      <th className={styles.th}>Updated</th>
                      <th className={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map((p) => (
                      <tr key={p.id} className={styles.tr}>
                        <td className={styles.td}>
                          <div className={styles.permNameCell}>
                            <div className={styles.permIconSmall}>🛡️</div>
                            <div>
                              <div className={styles.permNameText}>
                                {p.name}
                              </div>
                              <div className={styles.permIdText}>#{p.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className={styles.td}>
                          {p.description ? (
                            <span className={styles.descText}>
                              {p.description}
                            </span>
                          ) : (
                            <span className={styles.noDesc}>
                              No description
                            </span>
                          )}
                        </td>
                        <td className={styles.td}>
                          <span className={styles.dateText}>
                            {formatDate(p.created_at)}
                          </span>
                        </td>
                        <td className={styles.td}>
                          <span className={styles.dateText}>
                            {formatDate(p.updated_at)}
                          </span>
                        </td>
                        <td className={styles.td}>
                          <div className={styles.actions}>
                            <button
                              id={`edit-perm-table-${p.id}`}
                              title="Edit"
                              className={`${styles.actionBtn} ${styles.actionEdit}`}
                              onClick={() =>
                                setModal({ kind: "edit", permission: p })
                              }
                            >
                              ✏️
                            </button>
                            <button
                              id={`delete-perm-table-${p.id}`}
                              title="Delete"
                              className={`${styles.actionBtn} ${styles.actionDelete}`}
                              onClick={() =>
                                setModal({
                                  kind: "confirm-delete",
                                  permission: p,
                                })
                              }
                            >
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

      {/* ─── Modals ─────────────────────────────────────────────────────────── */}

      {/* Create */}
      {modal.kind === "create" && (
        <Modal
          title="New Permission"
          icon="🛡️"
          onClose={() => setModal({ kind: "none" })}
        >
          <PermissionForm
            initial={EMPTY_FORM}
            isEdit={false}
            onSubmit={handleCreate}
            onClose={() => setModal({ kind: "none" })}
          />
        </Modal>
      )}

      {/* Edit */}
      {modal.kind === "edit" && (
        <Modal
          title={`Edit — ${modal.permission.name}`}
          icon="✏️"
          onClose={() => setModal({ kind: "none" })}
        >
          <PermissionForm
            initial={{
              name: modal.permission.name,
              description: modal.permission.description ?? "",
            }}
            isEdit={true}
            onSubmit={(form) => handleUpdate(modal.permission, form)}
            onClose={() => setModal({ kind: "none" })}
          />
        </Modal>
      )}

      {/* Confirm Delete */}
      {modal.kind === "confirm-delete" && (
        <ConfirmDialog
          permissionName={modal.permission.name}
          onConfirm={() => handleDelete(modal.permission)}
          onCancel={() => setModal({ kind: "none" })}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={clearToast} />
      )}
    </>
  );
}
