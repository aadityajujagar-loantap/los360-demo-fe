"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  type Role,
  type Permission,
  fetchRoles,
  createRole,
  updateRole,
  deleteRole,
  fetchPermissions,
  giveRolePermission,
  revokeRolePermission,
  syncRolePermissions,
} from "../../../_lib/redux/services/adminApi";
import styles from "./roles.module.css";

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

// ─── Types ───────────────────────────────────────────────────────────────────

type ToastType = "success" | "error";

type ModalState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; role: Role }
  | { kind: "confirm-delete"; role: Role }
  | { kind: "manage-perms"; role: Role };

// ─── Toast ───────────────────────────────────────────────────────────────────

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
      className={`${styles.toast} ${type === "error" ? styles.toastError : styles.toastSuccess
        }`}
    >
      <span>{type === "success" ? "✓" : "✕"}</span>
      {message}
    </div>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({
  title,
  subtitle,
  icon,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modalBox} ${wide ? styles.modalBoxWide : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderLeft}>
            {icon && <div className={styles.modalHeaderIcon}>{icon}</div>}
            <div>
              <h2 className={styles.modalTitle}>{title}</h2>
              {subtitle && <p className={styles.modalSubtitle}>{subtitle}</p>}
            </div>
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

// ─── Confirm Delete Dialog ────────────────────────────────────────────────────

function ConfirmDeleteDialog({
  roleName,
  onConfirm,
  onCancel,
}: {
  roleName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
        <span className={styles.confirmIcon}>🗑️</span>
        <p className={styles.confirmMsg}>
          Are you sure you want to delete role{" "}
          <span className={styles.namePill}>{roleName}</span>?
          <br />
          This cannot be undone and may affect assigned users.
        </p>
        <div className={styles.confirmActions}>
          <button className={styles.btnSecondary} onClick={onCancel}>
            Cancel
          </button>
          <button
            id="confirm-delete-role-btn"
            className={styles.btnDanger}
            onClick={onConfirm}
          >
            Delete Role
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Role Form ────────────────────────────────────────────────────────────────

const EMPTY_FORM = { name: "", description: "" };

function RoleForm({
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
    
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setErrors({ name: ["Role name is required."] });
      return;
    }

    // Auto-convert to lowercase and replace spaces with underscores
    const sanitizedName = trimmedName.toLowerCase().replace(/\s+/g, "_");

    // Strictly allow only a-z, 0-9, and _
    const isValid = /^[a-z0-9_]+$/.test(sanitizedName);
    if (!isValid) {
      setErrors({ name: ["Role name contains invalid characters. Use only lowercase letters, numbers, and underscores."] });
      return;
    }

    if (sanitizedName.length > 90) {
      setErrors({ name: ["Role name cannot exceed 90 characters."] });
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
          Role Name <span className={styles.required}>*</span>
        </label>
        <input
          id="role-name-input"
          name="name"
          type="text"
          value={form.name}
          onChange={handleChange}
          placeholder="e.g. admin, loan_officer, viewer"
          required
          maxLength={90}
          className={`${styles.input} ${errors.name ? styles.inputErr : ""}`}
          autoComplete="off"
          autoFocus
        />
        {errors.name && <p className={styles.fieldErr}>{errors.name[0]}</p>}
        <p className={styles.formHint}>
          Use lowercase with underscores (e.g. <code>loan_officer</code>)
        </p>
      </div>

      {/* Description */}
      <div className={styles.formGroup}>
        <label className={styles.label}>Description</label>
        <textarea
          id="role-desc-input"
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Describe what this role can do…"
          maxLength={90}
          className={`${styles.textarea} ${errors.description ? styles.inputErr : ""
            }`}
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
          id={isEdit ? "update-role-btn" : "create-role-btn"}
          type="submit"
          className={styles.btnPrimary}
          disabled={saving}
        >
          {saving ? "Saving…" : isEdit ? "✎ Update Role" : "+ Create Role"}
        </button>
      </div>
    </form>
  );
}

// ─── Manage Permissions Panel ─────────────────────────────────────────────────

function ManagePermissionsPanel({
  role,
  allPermissions,
  onRoleUpdated,
  showToast,
}: {
  role: Role;
  allPermissions: Permission[];
  onRoleUpdated: (updatedRole: Role) => void;
  showToast: (msg: string, type: ToastType) => void;
}) {
  const [currentRole, setCurrentRole] = useState<Role>(role);
  const [permSearch, setPermSearch] = useState("");
  const [syncText, setSyncText] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [busy, setBusy] = useState<number | null>(null); // permissionId currently loading

  const assignedIds = new Set(currentRole.permissions.map((p: any) => p.id));

  const availableToAdd = allPermissions.filter(
    (p: any) =>
      !assignedIds.has(p.id) &&
      (permSearch.trim() === "" ||
        p.name.toLowerCase().includes(permSearch.toLowerCase())),
  );

  async function handleGive(perm: Permission) {
    setBusy(perm.id);
    try {
      const updated = await giveRolePermission(currentRole.id, perm.id);
      setCurrentRole(updated);
      onRoleUpdated(updated);
      showToast(`Permission "${perm.name}" added.`, "success");
    } catch (e: any) {
      showToast(e?.message || "Failed to add permission.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleRevoke(perm: Permission) {
    setBusy(perm.id);
    try {
      const updated = await revokeRolePermission(currentRole.id, perm.id);
      setCurrentRole(updated);
      onRoleUpdated(updated);
      showToast(`Permission "${perm.name}" removed.`, "success");
    } catch (e: any) {
      showToast(e?.message || "Failed to revoke permission.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleSync() {
    const names = syncText
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (names.length === 0) return;

    // Validate names against allPermissions and for special characters
    const validNamesSet = new Set(allPermissions.map((p) => p.name));
    const invalidFormatNames: string[] = [];
    const nonExistentNames: string[] = [];

    const nameRegex = /^[a-z0-9._-]+$/i;

    for (const name of names) {
      if (!nameRegex.test(name)) {
        invalidFormatNames.push(name);
      } else if (!validNamesSet.has(name)) {
        nonExistentNames.push(name);
      }
    }

    if (invalidFormatNames.length > 0) {
      showToast(
        `Invalid characters in: ${invalidFormatNames.join(", ")}`,
        "error",
      );
      return;
    }

    if (nonExistentNames.length > 0) {
      showToast(
        `Permissions do not exist: ${nonExistentNames.join(", ")}`,
        "error",
      );
      return;
    }

    setSyncing(true);
    try {
      const updated = await syncRolePermissions(currentRole.id, names);
      setCurrentRole(updated);
      onRoleUpdated(updated);
      setSyncText("");
      showToast(
        `Permissions synced (${updated.permissions.length} total).`,
        "success",
      );
    } catch (e: any) {
      showToast(e?.message || "Sync failed.", "error");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className={styles.managePanelBody}>
      {/* Role info banner */}
      <div className={styles.manageRoleInfo}>
        <div className={styles.manageRoleAvatar}>🔑</div>
        <div>
          <div className={styles.manageRoleName}>{currentRole.name}</div>
          <div className={styles.manageRoleCount}>
            {currentRole.permissions.length} permission
            {currentRole.permissions.length !== 1 ? "s" : ""} assigned
          </div>
        </div>
      </div>

      {/* Currently assigned */}
      <div>
        <p className={styles.manageCurrentLabel}>Currently Assigned</p>
        <div className={styles.manageCurrentChips}>
          {currentRole.permissions.length === 0 ? (
            <span className={styles.manageCurrentEmpty}>
              No permissions assigned yet
            </span>
          ) : (
            currentRole.permissions.map((p: any) => (
              <span key={p.id} className={styles.manageCurrentChip}>
                {p.name}
                <button
                  id={`revoke-perm-${p.id}`}
                  className={styles.manageCurrentChipRevoke}
                  title={`Revoke ${p.name}`}
                  onClick={() => handleRevoke(p)}
                  disabled={busy === p.id}
                >
                  {busy === p.id ? "…" : "✕"}
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      <div className={styles.manageDivider} />

      {/* Add individual permission */}
      <div>
        <p className={styles.manageAddLabel}>Add a Permission</p>
        <div className={styles.manageSyncArea} style={{ gap: 8 }}>
          <div className={styles.manageSearchWrap}>
            <span className={styles.manageSearchIcon}>🔍</span>
            <input
              id="perm-search-in-manage"
              className={styles.manageSearchInput}
              type="text"
              placeholder="Search available permissions…"
              value={permSearch}
              onChange={(e) => setPermSearch(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className={styles.managePermList}>
            {availableToAdd.length === 0 ? (
              <div className={styles.manageEmptyPerms}>
                {permSearch
                  ? "No matching permissions"
                  : "All permissions already assigned"}
              </div>
            ) : (
              availableToAdd.map((p) => (
                <div key={p.id} className={styles.managePermRow}>
                  <div>
                    <div className={styles.managePermRowName}>{p.name}</div>
                    {p.description && (
                      <div className={styles.managePermRowDesc}>
                        {p.description}
                      </div>
                    )}
                  </div>
                  <button
                    id={`give-perm-${p.id}`}
                    className={styles.manageAddBtn}
                    onClick={() => handleGive(p)}
                    disabled={busy === p.id}
                  >
                    {busy === p.id ? "…" : "+ Add"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className={styles.manageSyncDivider}>or sync a full list</div>

      {/* Sync permissions */}
      <div className={styles.manageSyncArea}>
        <label
          className={styles.manageSyncLabel}
          htmlFor="sync-permissions-input"
        >
          Sync Permissions (replaces all)
        </label>
        <textarea
          id="sync-permissions-input"
          className={styles.manageSyncTextarea}
          placeholder="users.create, leads.view, customers.delete"
          value={syncText}
          onChange={(e) => setSyncText(e.target.value)}
        />
        <p className={styles.manageSyncHint}>
          Enter permission names separated by commas. This will{" "}
          <strong>replace all</strong> current permissions on this role.
        </p>
        <button
          id="sync-permissions-btn"
          className={styles.manageSyncBtn}
          onClick={handleSync}
          disabled={syncing || syncText.trim() === ""}
        >
          {syncing ? "Syncing…" : "↺ Sync Permissions"}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const { orgSlug } = useParams();

  // Roles list
  const [roles, setRoles] = useState<Role[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");

  // All permissions (for manage panel)
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);

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

  // ── Fetch roles ────────────────────────────────────────────────────────────
  const loadRoles = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const data = await fetchRoles();
      setRoles(data);
    } catch (e: any) {
      setListError(e?.message || "Failed to load roles.");
    } finally {
      setListLoading(false);
    }
  }, []);

  // ── Fetch all permissions (for manage panel) ───────────────────────────────
  const loadPermissions = useCallback(async () => {
    try {
      const data = await fetchPermissions();
      setAllPermissions(data);
    } catch {
      // non-critical; manage panel will just have empty list
    }
  }, []);

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, [loadRoles, loadPermissions]);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const displayed = search.trim()
    ? roles.filter(
      (r) =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        (r.description ?? "").toLowerCase().includes(search.toLowerCase()),
    )
    : roles;

  // ── Helpers ────────────────────────────────────────────────────────────────

  function showToast(message: string, type: ToastType) {
    setToast({ message, type });
  }



  // ── Role CRUD actions ──────────────────────────────────────────────────────

  async function handleCreate(form: typeof EMPTY_FORM) {
    if (!/^[a-z0-9_]+$/.test(form.name)) {
      showToast("Invalid role name. Use lowercase, numbers, and underscores.", "error");
      return;
    }
    await createRole({
      name: form.name,
      description: form.description || undefined,
    });
    setModal({ kind: "none" });
    showToast("Role created successfully.", "success");
    loadRoles();
  }

  async function handleUpdate(role: Role, form: typeof EMPTY_FORM) {
    if (!/^[a-z0-9_]+$/.test(form.name)) {
      showToast("Invalid role name. Use lowercase, numbers, and underscores.", "error");
      return;
    }
    await updateRole(role.id, {
      name: form.name,
      description: form.description || undefined,
    });
    setModal({ kind: "none" });
    showToast("Role updated successfully.", "success");
    loadRoles();
  }

  async function handleDelete(role: Role) {
    try {
      await deleteRole(role.id);
      showToast(`Role "${role.name}" deleted.`, "success");
    } catch (e: any) {
      showToast(e?.message || "Failed to delete role.", "error");
    }
    setModal({ kind: "none" });
    loadRoles();
  }

  /** Called by ManagePermissionsPanel when it mutates a role in-place */
  function handleRoleUpdated(updatedRole: Role) {
    setRoles((prev) =>
      prev.map((r) => (r.id === updatedRole.id ? updatedRole : r)),
    );
    // If the manage-perms modal is still open for this role, refresh it
    if (modal.kind === "manage-perms" && modal.role.id === updatedRole.id) {
      setModal({ kind: "manage-perms", role: updatedRole });
    }
  }



  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalRoles = roles.length;
  const totalPermsAssigned = roles.reduce(
    (sum, r) => sum + r.permissions.length,
    0,
  );
  const rolesWithNoPerms = roles.filter(
    (r) => r.permissions.length === 0,
  ).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Topbar */}
      <header className={styles.topbar}>
        <div>
          <h1 className={styles.pageTitle}>Roles</h1>
          <p className={styles.pageSubtitle}>
            Define roles and manage their permission sets
          </p>
        </div>
        <div className={styles.topbarRight}>
          <button
            id="create-role-btn"
            className={styles.btnPrimary}
            onClick={() => setModal({ kind: "create" })}
          >
            + New Role
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#fef9ec" }}>
            🔑
          </div>
          <div>
            <div className={styles.statValue}>{totalRoles}</div>
            <div className={styles.statLabel}>Total Roles</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#eef2ff" }}>
            🛡️
          </div>
          <div>
            <div className={styles.statValue} style={{ color: "#4338ca" }}>
              {totalPermsAssigned}
            </div>
            <div className={styles.statLabel}>Permissions Assigned</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#fff7ed" }}>
            ⚠️
          </div>
          <div>
            <div className={styles.statValue} style={{ color: "#b45309" }}>
              {rolesWithNoPerms}
            </div>
            <div className={styles.statLabel}>Roles Without Permissions</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            id="role-search"
            className={styles.searchInput}
            type="text"
            placeholder="Search roles by name or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
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
            className={`${styles.viewBtn} ${view === "grid" ? styles.viewBtnActive : ""
              }`}
            onClick={() => setView("grid")}
            title="Grid view"
          >
            ▦ Grid
          </button>
          <button
            id="view-table-btn"
            className={`${styles.viewBtn} ${view === "table" ? styles.viewBtnActive : ""
              }`}
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
          <p>Loading roles…</p>
        </div>
      ) : listError ? (
        <div className={styles.cardsSection}>
          <div className={styles.cardsEmpty}>
            <div className={styles.emptyIcon}>⚠️</div>
            <p>{listError}</p>
            <button className={styles.btnSecondary} onClick={loadRoles}>
              Retry
            </button>
          </div>
        </div>
      ) : view === "grid" ? (
        /* ─── Grid view ─────────────────────────────────────────────────── */
        <div className={styles.cardsSection}>
          {displayed.length === 0 ? (
            <div className={styles.cardsEmpty}>
              <div className={styles.emptyIcon}>🔑</div>
              <p>
                {search
                  ? "No roles match your search."
                  : "No roles yet. Create one!"}
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
                  + New Role
                </button>
              )}
            </div>
          ) : (
            <div className={styles.cardsGrid}>
              {displayed.map((role) => (
                <div key={role.id} className={styles.roleCard}>
                  {/* Header */}
                  <div className={styles.cardHeader}>
                    <div className={styles.cardIconWrap}>🔑</div>
                    <div className={styles.cardTitleArea}>
                      <div className={styles.cardName}>{role.name}</div>
                      <span className={styles.cardIdBadge}>#{role.id}</span>
                    </div>
                    <div className={styles.cardActions}>
                      <button
                        id={`edit-role-${role.id}`}
                        title="Edit role"
                        className={`${styles.actionBtn} ${styles.actionEdit}`}
                        onClick={() => setModal({ kind: "edit", role })}
                      >
                        ✏️
                      </button>
                      <button
                        id={`manage-role-${role.id}`}
                        title="Manage permissions"
                        className={`${styles.actionBtn} ${styles.actionManage}`}
                        onClick={() =>
                          setModal({ kind: "manage-perms", role })
                        }
                      >
                        🛡️
                      </button>
                      <button
                        id={`delete-role-${role.id}`}
                        title="Delete role"
                        className={`${styles.actionBtn} ${styles.actionDelete}`}
                        onClick={() =>
                          setModal({ kind: "confirm-delete", role })
                        }
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {role.description && (
                    <div className={styles.cardDesc}>{role.description}</div>
                  )}

                  {/* Permission chips */}
                  <div className={styles.permSection}>
                    <span className={styles.permSectionLabel}>
                      Permissions ({role.permissions.length})
                    </span>
                    <div className={styles.permChips}>
                      {role.permissions.length === 0 ? (
                        <span className={styles.noPerms}>
                          No permissions assigned
                        </span>
                      ) : (
                        role.permissions.slice(0, 6).map((p: any) => (
                          <span key={p.id} className={styles.permChip}>
                            {p.name}
                          </span>
                        ))
                      )}
                      {role.permissions.length > 6 && (
                        <span
                          className={styles.permChip}
                          style={{
                            background: "#f1f5f9",
                            color: "#64748b",
                          }}
                        >
                          +{role.permissions.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className={styles.cardFooter}>
                    <span className={styles.cardDate}>
                      Created {formatDate(role.created_at)}
                    </span>
                    <button
                      className={styles.cardManageBtn}
                      onClick={() => setModal({ kind: "manage-perms", role })}
                    >
                      ⚙ Manage Permissions
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ─── Table view ────────────────────────────────────────────────── */
        <div className={styles.tableWrapOuter}>
          <div className={styles.tableWrap}>
            {displayed.length === 0 ? (
              <div className={styles.tableEmpty}>
                <div className={styles.emptyIcon}>🔑</div>
                <p>
                  {search ? "No roles match your search." : "No roles yet."}
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
                    <th className={styles.th}>Role</th>
                    <th className={styles.th}>Description</th>
                    <th className={styles.th}>Permissions</th>
                    <th className={styles.th}>Created</th>
                    <th className={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((role: any) => (
                    <tr key={role.id} className={styles.tr}>
                      <td className={styles.td}>
                        <div className={styles.roleNameCell}>
                          <div className={styles.roleIconSmall}>🔑</div>
                          <div>
                            <div className={styles.roleNameText}>
                              {role.name}
                            </div>
                            <div className={styles.roleIdText}>
                              #{role.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={styles.td}>
                        {role.description ? (
                          <span className={styles.descText}>
                            {role.description}
                          </span>
                        ) : (
                          <span className={styles.noDesc}>
                            No description
                          </span>
                        )}
                      </td>
                      <td className={styles.td}>
                        <div className={styles.tablePermChips}>
                          {role.permissions.length === 0 ? (
                            <span className={styles.noDesc}>None</span>
                          ) : (
                            <>
                              {role.permissions.slice(0, 3).map((p: any) => (
                                <span
                                  key={p.id}
                                  className={styles.tablePermChip}
                                >
                                  {p.name}
                                </span>
                              ))}
                              {role.permissions.length > 3 && (
                                <span className={styles.tableMoreChip}>
                                  +{role.permissions.length - 3}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.dateText}>
                          {formatDate(role.created_at)}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <div className={styles.actions}>
                          <button
                            id={`edit-role-table-${role.id}`}
                            title="Edit"
                            className={`${styles.actionBtn} ${styles.actionEdit}`}
                            onClick={() => setModal({ kind: "edit", role })}
                          >
                            ✏️
                          </button>
                          <button
                            id={`manage-role-table-${role.id}`}
                            title="Manage permissions"
                            className={`${styles.actionBtn} ${styles.actionManage}`}
                            onClick={() =>
                              setModal({ kind: "manage-perms", role })
                            }
                          >
                            🛡️
                          </button>
                          <button
                            id={`delete-role-table-${role.id}`}
                            title="Delete"
                            className={`${styles.actionBtn} ${styles.actionDelete}`}
                            onClick={() =>
                              setModal({ kind: "confirm-delete", role })
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
          title="New Role"
          icon="🔑"
          onClose={() => setModal({ kind: "none" })}
        >
          <RoleForm
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
          title={`Edit — ${modal.role.name}`}
          icon="✏️"
          onClose={() => setModal({ kind: "none" })}
        >
          <RoleForm
            initial={{
              name: modal.role.name,
              description: modal.role.description ?? "",
            }}
            isEdit={true}
            onSubmit={(form) => handleUpdate(modal.role, form)}
            onClose={() => setModal({ kind: "none" })}
          />
        </Modal>
      )}

      {/* Manage Permissions */}
      {modal.kind === "manage-perms" && (
        <Modal
          title="Manage Permissions"
          subtitle={`Role: ${modal.role.name}`}
          icon="🛡️"
          wide
          onClose={() => setModal({ kind: "none" })}
        >
          <ManagePermissionsPanel
            role={modal.role}
            allPermissions={allPermissions}
            onRoleUpdated={handleRoleUpdated}
            showToast={showToast}
          />
        </Modal>
      )}

      {/* Confirm Delete */}
      {modal.kind === "confirm-delete" && (
        <ConfirmDeleteDialog
          roleName={modal.role.name}
          onConfirm={() => handleDelete(modal.role)}
          onCancel={() => setModal({ kind: "none" })}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={clearToast} />
      )}
    </>
  );
}
