"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  type User,
  type PaginatedUsers,
  type Role,
  type RoleRef,
  type UserBranchMapping,
  fetchUsers,
  createUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  deleteUser,
  fetchRoles,
  assignUserRole,
  assignUserRoles,
  revokeUserRole,
  fetchUserBranches,
  createUserBranchMapping,
  bulkAssignUserBranches,
  uploadUserBranchMappingCsv,
  deleteUserBranchMapping,
} from "../../../_lib/redux/services/adminApi";
import styles from "./users.module.css";
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

function getPasswordError(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter.";
  if (!/\d/.test(password)) return "Password must include a number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include a special character.";
  return null;
}

// ─── Empty form state ───────────────────────────────────────────────────────

const EMPTY_FORM = { name: "", email: "", phone: "", password: "", ticket_no: "", branch_role_id: "", branch_code: "", zone_code: "" };

// ─── Modal Component ─────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
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
          <h2 className={styles.modalTitle}>{title}</h2>
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
  message,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  confirmClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
        <p className={styles.confirmMsg}>{message}</p>
        <div className={styles.confirmActions}>
          <button className={styles.btnSecondary} onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`${styles.btnDanger} ${confirmClass ?? ""}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
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

// ─── User Form ───────────────────────────────────────────────────────────────

function UserForm({
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: trimTo90Limit(e.target.value) });
    setErrors((prev) => {
      const n = { ...prev };
      delete n[e.target.name];
      return n;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Frontend validation
    const newErrors: Record<string, string[]> = {};
    fields.forEach((f) => {
      const val = String(form[f.name] || "").trim();
      if (f.required && !val) {
        newErrors[f.name] = [`${f.label} is required.`];
      }
      if (val.length > 90) {
        newErrors[f.name] = [`${f.label} cannot exceed 90 characters.`];
      }
    });
    const nameVal = String(form.name || "").trim();
    if (nameVal && !newErrors.name && !/^[a-zA-Z\s.]+$/.test(nameVal)) {
      newErrors.name = ["Full Name should only contain letters, spaces, and dots."];
    }

    const phoneVal = String(form.phone || "").trim();
    if (phoneVal && !newErrors.phone && phoneVal.length > 10) {
      newErrors.phone = ["Phone number cannot be greater than 10 digits."];
    }

    const passwordVal = String(form.password || "");
    if (passwordVal && !newErrors.password) {
      const passwordError = getPasswordError(passwordVal);
      if (passwordError) newErrors.password = [passwordError];
    }

    const codeRegex = /^[a-zA-Z0-9_-]+$/;
    const codeFields: (keyof typeof EMPTY_FORM)[] = ["ticket_no", "branch_role_id", "branch_code", "zone_code"];
    codeFields.forEach(f => {
      const val = String(form[f] || "").trim();
      if (val && !codeRegex.test(val)) {
        const label = fields.find(field => field.name === f)?.label || f;
        newErrors[f] = [`${label} should only contain letters, numbers, hyphens, or underscores.`];
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
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

  const fields: {
    name: keyof typeof EMPTY_FORM;
    label: string;
    type: string;
    required?: boolean;
    placeholder?: string;
    fullWidth?: boolean;
    maxLength?: number;
  }[] = [
      {
        name: "name",
        label: "Full Name",
        type: "text",
        required: true,
        placeholder: "John Doe",
        fullWidth: true,
      },
      {
        name: "email",
        label: "Email Address",
        type: "email",
        required: true,
        placeholder: "john@example.com",
        fullWidth: true,
      },
      {
        name: "phone",
        label: "Phone",
        type: "tel",
        placeholder: "9876543210",
        maxLength: 10,
        fullWidth: true,
      },
      {
        name: "ticket_no",
        label: "Ticket No",
        type: "text",
        placeholder: "TKT-001",
      },
      {
        name: "branch_role_id",
        label: "Branch Role ID",
        type: "text",
        placeholder: "BRM",
      },
      {
        name: "branch_code",
        label: "Branch Code",
        type: "text",
        placeholder: "BR001",
      },
      {
        name: "zone_code",
        label: "Zone Code",
        type: "text",
        placeholder: "Z01",
      },
      {
        name: "password",
        label: isEdit ? "New Password (leave blank to keep)" : "Password",
        type: "password",
        required: !isEdit,
        placeholder: "••••••••",
        fullWidth: true,
      },
    ];

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGrid}>
        {fields.map((f) => (
          <div
            key={f.name}
            className={`${styles.formGroup} ${f.fullWidth ? styles.formGroupFull : ""}`}
          >
            <label className={styles.label}>
              {f.label}
              {f.required && <span className={styles.required}>*</span>}
            </label>
            <input
              name={f.name}
              type={f.type}
              value={form[f.name]}
              onChange={handleChange}
              placeholder={f.placeholder}
              className={`${styles.input} ${errors[f.name] ? styles.inputErr : ""}`}
              autoComplete="off"
              maxLength={f.maxLength ?? 90}
            />
            {errors[f.name] && (
              <p className={styles.fieldErr}>{errors[f.name][0]}</p>
            )}
            {f.name === "password" && !errors.password && (
              <p className={styles.fieldErr} style={{ color: "#64748b" }}>
                Minimum 8 characters with uppercase, lowercase, number and special character.
              </p>
            )}
          </div>
        ))}
      </div>
      {errors._ && <p className={styles.formErr}>{errors._[0]}</p>}
      <div className={styles.formFooter}>
        <button type="button" className={styles.btnSecondary} onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className={styles.btnPrimary} disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Update User" : "Create User"}
        </button>
      </div>
    </form>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ user }: { user: User }) {
  if (user.deactivated_at) {
    return (
      <span className={`${styles.badge} ${styles.badgeDeactivated}`}>
        Deactivated
      </span>
    );
  }
  return (
    <span className={`${styles.badge} ${styles.badgeActive}`}>Active</span>
  );
}

// ─── Manage User Roles Component ─────────────────────────────────────────────

function ManageUserRoles({
  user,
  allRoles,
  onUserUpdated,
  showToast,
}: {
  user: User;
  allRoles: Role[];
  onUserUpdated: (u: User) => void;
  showToast: (msg: string, type: "success" | "error") => void;
}) {
  const [currentRoles, setCurrentRoles] = useState<RoleRef[]>(user.roles ?? []);
  const [roleSearch, setRoleSearch] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const assignedIds = new Set(currentRoles.map((r) => r.id));

  const available = allRoles.filter(
    (r) =>
      !assignedIds.has(r.id) &&
      (roleSearch.trim() === "" ||
        r.name.toLowerCase().includes(roleSearch.toLowerCase())),
  );

  async function handleAssign(role: Role) {
    setBusy(role.id);
    try {
      const updatedUser = await assignUserRole(user.id, role.id);
      const newRoles = updatedUser.roles ?? [];
      setCurrentRoles(newRoles);
      onUserUpdated({ ...user, roles: newRoles });
      showToast(`Role "${role.name}" assigned.`, "success");
    } catch (e: any) {
      showToast(e?.message || "Failed to assign role.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleRevoke(role: RoleRef) {
    setBusy(role.id);
    try {
      const updatedUser = await revokeUserRole(user.id, role.id);
      const newRoles = updatedUser.roles ?? [];
      setCurrentRoles(newRoles);
      onUserUpdated({ ...user, roles: newRoles });
      showToast(`Role "${role.name}" revoked.`, "success");
    } catch (e: any) {
      showToast(e?.message || "Failed to revoke role.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleBulkAssign() {
    const roleNames = bulkText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (roleNames.length === 0) return;

    // Validate that all entered roles exist
    const validRoleNames = new Set(allRoles.map((r) => r.name));
    const nonExistent = roleNames.filter((name) => !validRoleNames.has(name));

    if (nonExistent.length > 0) {
      showToast(
        `The following roles do not exist: ${nonExistent.join(", ")}`,
        "error",
      );
      return;
    }

    setBulkLoading(true);
    try {
      const updatedUser = await assignUserRoles(user.id, roleNames);
      const newRoles = updatedUser.roles ?? [];
      setCurrentRoles(newRoles);
      onUserUpdated({ ...user, roles: newRoles });
      setBulkText("");
      showToast(`${roleNames.length} role(s) assigned.`, "success");
    } catch (e: any) {
      showToast(e?.message || "Bulk assign failed.", "error");
    } finally {
      setBulkLoading(false);
    }
  }

  return (
    <div className={styles.urPanel}>
      {/* User banner */}
      <div className={styles.urUserBanner}>
        <div
          className={styles.urUserAvatar}
          style={{
            background: [
              "#6366f1",
              "#8b5cf6",
              "#ec4899",
              "#f59e0b",
              "#10b981",
              "#3b82f6",
              "#ef4444",
              "#14b8a6",
            ][user.id % 8],
          }}
        >
          {user.name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)}
        </div>
        <div>
          <div className={styles.urUserName}>{user.name}</div>
          <div className={styles.urUserEmail}>{user.email}</div>
        </div>
      </div>

      {/* Currently assigned roles */}
      <div>
        <p className={styles.urSectionLabel}>
          Assigned Roles ({currentRoles.length})
        </p>
        <div className={styles.urCurrentChips}>
          {currentRoles.length === 0 ? (
            <span className={styles.urNoRoles}>No roles assigned yet</span>
          ) : (
            currentRoles.map((r) => (
              <span key={r.id} className={styles.urChip}>
                {r.name}
                <button
                  id={`revoke-role-${r.id}-user-${user.id}`}
                  className={styles.urChipRevoke}
                  title={`Revoke ${r.name}`}
                  onClick={() => handleRevoke(r)}
                  disabled={busy === r.id}
                >
                  {busy === r.id ? "…" : "✕"}
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      <div className={styles.urDivider} />

      {/* Assign individual role */}
      <div>
        <p className={styles.urSectionLabel}>Assign a Role</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className={styles.urSearchWrap}>
            <span className={styles.urSearchIcon}>🔍</span>
            <input
              id="ur-role-search"
              className={styles.urSearchInput}
              type="text"
              placeholder="Filter available roles…"
              value={roleSearch}
              onChange={(e) => setRoleSearch(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className={styles.urRoleList}>
            {available.length === 0 ? (
              <div className={styles.urEmptyList}>
                {roleSearch
                  ? "No matching roles"
                  : "All roles already assigned"}
              </div>
            ) : (
              available.map((r) => (
                <div key={r.id} className={styles.urRoleRow}>
                  <div className={styles.urRoleRowLeft}>
                    <div className={styles.urRoleIcon}>🔑</div>
                    <div>
                      <div className={styles.urRoleName}>{r.name}</div>
                      {r.description && (
                        <div className={styles.urRoleDesc}>{r.description}</div>
                      )}
                    </div>
                  </div>
                  <button
                    id={`assign-role-${r.id}-user-${user.id}`}
                    className={styles.urAddBtn}
                    onClick={() => handleAssign(r)}
                    disabled={busy === r.id}
                  >
                    {busy === r.id ? "…" : "+ Assign"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className={styles.urBulkDivider}>or bulk-assign</div>

      {/* Bulk assign */}
      <div className={styles.urBulkArea}>
        <label className={styles.urBulkLabel} htmlFor="ur-bulk-input">
          Assign Multiple Roles (by name)
        </label>
        <textarea
          id="ur-bulk-input"
          className={styles.urBulkTextarea}
          placeholder="admin, loan_officer, viewer"
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
        />
        <p className={styles.urBulkHint}>
          Enter role names separated by commas. Roles will be{" "}
          <strong>added</strong> to existing ones.
        </p>
        <button
          id="ur-bulk-assign-btn"
          className={styles.urBulkBtn}
          onClick={handleBulkAssign}
          disabled={bulkLoading || bulkText.trim() === ""}
        >
          {bulkLoading ? "Assigning…" : "⊕ Assign Roles"}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── Manage User Branch Mappings Component ───────────────────────────────────

function ManageUserBranchMappings({
  user,
  showToast,
}: {
  user: User;
  showToast: (msg: string, type: "success" | "error") => void;
}) {
  const [mappings, setMappings] = useState<UserBranchMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [singleCode, setSingleCode] = useState("");
  const [singleBusy, setSingleBusy] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvResult, setCsvResult] = useState<{ created: number; skipped: string[]; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadMappings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchUserBranches(user.id);
      const raw = res.data;
      setMappings(Array.isArray(raw) ? raw : []);
    } catch {
      setMappings([]);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { loadMappings(); }, [loadMappings]);

  async function handleSingleAssign() {
    const code = singleCode.trim();
    if (!code) return;
    if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
      showToast("Branch Code should only contain letters, numbers, hyphens, or underscores.", "error");
      return;
    }
    setSingleBusy(true);
    try {
      await createUserBranchMapping(user.id, code);
      setSingleCode("");
      showToast(`Branch "${code}" assigned.`, "success");
      loadMappings();
    } catch (e: any) {
      const msg = e?.errors?.branch_code?.[0] ?? e?.message ?? "Failed to assign branch.";
      showToast(msg, "error");
    } finally {
      setSingleBusy(false);
    }
  }

  async function handleBulkAssign() {
    const codes = bulkText.trim();
    if (!codes) return;
    setBulkBusy(true);
    try {
      const res = await bulkAssignUserBranches(user.id, codes);
      const { created_count, skipped_count, error_count } = res.data.summary;
      const parts: string[] = [];
      if (created_count) parts.push(`${created_count} created`);
      if (skipped_count) parts.push(`${skipped_count} skipped`);
      if (error_count) parts.push(`${error_count} error(s)`);
      showToast(`Bulk assign: ${parts.join(", ")}.`, created_count > 0 ? "success" : "error");
      setBulkText("");
      loadMappings();
    } catch (e: any) {
      showToast(e?.message ?? "Bulk assign failed.", "error");
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleDelete(mappingId: number, branchCode: string) {
    setDeletingId(mappingId);
    try {
      await deleteUserBranchMapping(mappingId);
      showToast(`Branch "${branchCode}" removed.`, "success");
      loadMappings();
    } catch (e: any) {
      showToast(e?.message ?? "Failed to remove branch.", "error");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvBusy(true);
    setCsvResult(null);
    try {
      const res = await uploadUserBranchMappingCsv(file);
      const { created_count, skipped_count, error_count } = res.data.summary;
      setCsvResult({ created: created_count, skipped: res.data.skipped, errors: res.data.errors });
      showToast(`CSV upload: ${created_count} created, ${skipped_count} skipped, ${error_count} error(s).`, created_count > 0 ? "success" : "error");
      loadMappings();
    } catch (e: any) {
      showToast(e?.message ?? "CSV upload failed.", "error");
    } finally {
      setCsvBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function downloadSampleCsv() {
    const csv = "user_id,branch_code\n1,BR001\n1,BR002\n2,BR001";
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'sample-user-branch-mapping.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  return (
    <div className={styles.ubmPanel}>
      {/* User banner */}
      <div className={styles.urUserBanner}>
        <div
          className={styles.urUserAvatar}
          style={{
            background: [
              "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
              "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
            ][user.id % 8],
          }}
        >
          {user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
        </div>
        <div>
          <div className={styles.urUserName}>{user.name}</div>
          <div className={styles.urUserEmail}>{user.email}</div>
        </div>
      </div>

      {/* Assigned Branches */}
      <div>
        <p className={styles.urSectionLabel}>Assigned Branches ({loading ? "…" : mappings.length})</p>
        {loading ? (
          <div className={styles.ubmLoading}><div className={styles.spinner} /> Loading…</div>
        ) : mappings.length === 0 ? (
          <span className={styles.urNoRoles}>No branches assigned yet</span>
        ) : (
          <div className={styles.ubmChipList}>
            {mappings.map((m) => (
              <span key={m.id} className={styles.ubmChip}>
                <span className={styles.ubmChipCode}>{m.branch_code}</span>
                {m.branch?.branch_name && (
                  <span className={styles.ubmChipName}>{m.branch.branch_name}</span>
                )}
                <button
                  id={`remove-branch-${m.id}-user-${user.id}`}
                  className={styles.urChipRevoke}
                  title={`Remove ${m.branch_code}`}
                  onClick={() => handleDelete(m.id, m.branch_code)}
                  disabled={deletingId === m.id}
                >
                  {deletingId === m.id ? "…" : "✕"}
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={styles.urDivider} />

      {/* Single branch assignment */}
      <div>
        <p className={styles.urSectionLabel}>Assign Single Branch</p>
        <div className={styles.ubmSingleRow}>
          <input
            id={`ubm-single-input-${user.id}`}
            className={styles.ubmInput}
            type="text"
            placeholder="Branch code e.g. BR001"
            value={singleCode}
            onChange={(e) => setSingleCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSingleAssign()}
            autoComplete="off"
          />
          <button
            id={`ubm-single-assign-${user.id}`}
            className={styles.urAddBtn}
            onClick={handleSingleAssign}
            disabled={singleBusy || !singleCode.trim()}
          >
            {singleBusy ? "…" : "+ Assign"}
          </button>
        </div>
      </div>

      <div className={styles.urBulkDivider}>or bulk-assign</div>

      {/* Bulk assignment */}
      <div className={styles.urBulkArea}>
        <label className={styles.urBulkLabel} htmlFor={`ubm-bulk-input-${user.id}`}>
          Assign Multiple Branches (comma-separated codes)
        </label>
        <textarea
          id={`ubm-bulk-input-${user.id}`}
          className={styles.urBulkTextarea}
          placeholder="BR001, BR002, BR003"
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
        />
        <p className={styles.urBulkHint}>
          Enter branch codes separated by commas. Branches will be{" "}
          <strong>added</strong> to existing ones.
        </p>
        <button
          id={`ubm-bulk-assign-btn-${user.id}`}
          className={styles.urBulkBtn}
          onClick={handleBulkAssign}
          disabled={bulkBusy || !bulkText.trim()}
        >
          {bulkBusy ? "Assigning…" : "⊕ Bulk Assign"}
        </button>
      </div>

      <div className={styles.urBulkDivider}>or upload CSV</div>

      {/* CSV upload */}
      <div className={styles.ubmCsvArea}>
        <p className={styles.urSectionLabel}>CSV Upload</p>
        <p className={styles.urBulkHint}>
          CSV format: <code>user_id,branch_code</code> (header row required, max 2MB)
        </p>
        <div className={styles.ubmCsvRow}>
          <label className={styles.ubmCsvLabel} htmlFor={`ubm-csv-${user.id}`}>
            {csvBusy ? "Uploading…" : "📂 Choose CSV File"}
          </label>
          <input
            id={`ubm-csv-${user.id}`}
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            className={styles.ubmCsvInput}
            onChange={handleCsvUpload}
            disabled={csvBusy}
          />
          <button
            type="button"
            className={styles.ubmDownloadBtn}
            onClick={downloadSampleCsv}
          >
            📥 Download Sample CSV
          </button>
        </div>
        {csvResult && (
          <div className={styles.ubmCsvResult}>
            <p className={styles.ubmCsvSummary}>
              ✓ {csvResult.created} created
              {csvResult.skipped.length > 0 && ` · ${csvResult.skipped.length} skipped`}
              {csvResult.errors.length > 0 && ` · ${csvResult.errors.length} error(s)`}
            </p>
            {csvResult.errors.length > 0 && (
              <ul className={styles.ubmCsvErrors}>
                {csvResult.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {csvResult.errors.length > 5 && <li>…and {csvResult.errors.length - 5} more</li>}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ModalState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; user: User }
  | { kind: "view"; user: User }
  | { kind: "manage-roles"; user: User }
  | { kind: "manage-branches"; user: User }
  | { kind: "confirm-deactivate"; user: User }
  | { kind: "confirm-reactivate"; user: User }
  | { kind: "confirm-delete"; user: User };

export default function UsersPage() {
  const { orgSlug } = useParams();
  const router = useRouter();

  // Auth
  const [authUser, setAuthUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Users list state
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Omit<
    PaginatedUsers,
    "data"
  > | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<
    "" | "active" | "deactivated"
  >("");
  const [search, setSearch] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");

  // All roles (for manage-roles panel)
  const [allRoles, setAllRoles] = useState<Role[]>([]);

  // Modal
  const [modal, setModal] = useState<ModalState>({ kind: "none" });

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const res = await get("/user");
      if (res.ok) {
        setAuthUser(await res.json());
      } else {
        localStorage.removeItem("auth_token");
        const slug = localStorage.getItem("org_slug");
        router.push(slug ? `/${slug}/login` : "/login");
      }
      setAuthLoading(false);
    })();
  }, [router, orgSlug]);

  // ── Fetch users ──────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const result = await fetchUsers({
        page,
        per_page: 10,
        status: statusFilter || undefined,
      });
      setUsers(result.data.data);
      // Compute missing pagination fields if not provided by API
      const apiData = result.data;
      const perPage = apiData.per_page || 10;
      const total = apiData.total || 0;
      const currentPage = apiData.current_page || 1;
      const lastPage = apiData.last_page ?? (Math.ceil(total / perPage) || 1);
      const from = apiData.from ?? (total > 0 ? (currentPage - 1) * perPage + 1 : 0);
      const to = apiData.to ?? Math.min(currentPage * perPage, total);
      
      setPagination({
        current_page: currentPage,
        last_page: lastPage,
        per_page: perPage,
        total,
        from,
        to,
      });
    } catch (e: any) {
      setListError(e?.message || "Failed to load users.");
    } finally {
      setListLoading(false);
    }
  }, [page, statusFilter]);

  // ── Fetch all roles (for manage-roles panel) ──────────────────────────────
  const loadRoles = useCallback(async () => {
    try {
      const data = await fetchRoles();
      setAllRoles(data);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    if (!authLoading && authUser) {
      loadUsers();
      loadRoles();
    }
  }, [authLoading, authUser, loadUsers, loadRoles]);

  // ── Filtered by search (client-side) ────────────────────────────────────────
  const displayed = search.trim()
    ? users.filter(
      (u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.phone ?? "").includes(search),
    )
    : users;

  // ── Actions ──────────────────────────────────────────────────────────────────

  function showToast(message: string, type: ToastType) {
    setToast({ message, type });
  }

  async function handleCreate(form: typeof EMPTY_FORM) {
    await createUser({
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      password: form.password,
      ticket_no: form.ticket_no || undefined,
      branch_role_id: form.branch_role_id || undefined,
      branch_code: form.branch_code || undefined,
      zone_code: form.zone_code || undefined,
    });
    setModal({ kind: "none" });
    showToast("User created successfully.", "success");
    loadUsers();
  }

  async function handleUpdate(user: User, form: typeof EMPTY_FORM) {
    const payload: any = { name: form.name, email: form.email };
    if (form.phone) payload.phone = form.phone;
    if (form.password) payload.password = form.password;
    if (form.ticket_no) payload.ticket_no = form.ticket_no;
    if (form.branch_role_id) payload.branch_role_id = form.branch_role_id;
    if (form.branch_code) payload.branch_code = form.branch_code;
    if (form.zone_code) payload.zone_code = form.zone_code;
    await updateUser(user.id, payload);
    setModal({ kind: "none" });
    showToast("User updated successfully.", "success");
    loadUsers();
  }

  async function handleDeactivate(user: User) {
    try {
      await deactivateUser(user.id);
      showToast(`${user.name} has been deactivated.`, "success");
    } catch (e: any) {
      showToast(e?.message || "Failed to deactivate.", "error");
    }
    setModal({ kind: "none" });
    loadUsers();
  }

  async function handleReactivate(user: User) {
    try {
      await reactivateUser(user.id);
      showToast(`${user.name} has been reactivated.`, "success");
    } catch (e: any) {
      showToast(e?.message || "Failed to reactivate.", "error");
    }
    setModal({ kind: "none" });
    loadUsers();
  }

  async function handleDelete(user: User) {
    try {
      await deleteUser(user.id);
      showToast(`${user.name} has been deleted.`, "success");
    } catch (e: any) {
      showToast(e?.message || "Failed to delete.", "error");
    }
    setModal({ kind: "none" });
    loadUsers();
  }

  function handleUserUpdatedInPlace(updatedUser: User) {
    setUsers((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)),
    );
    if (modal.kind === "manage-roles" && modal.user.id === updatedUser.id) {
      setModal({ kind: "manage-roles", user: updatedUser });
    }
  }

  function handleLogout() {
    const slug = localStorage.getItem("org_slug");
    localStorage.removeItem("auth_token");
    // Clear org context too? Usually yes to be safe
    localStorage.removeItem("org_slug");
    router.push(slug ? `/${slug}/login` : "/login");
  }

  // ── Rendering helper (loading handled by Layout)
  const totalAll = pagination?.total ?? 0;
  const totalActive = users.filter((u) => !u.deactivated_at).length;
  const totalDeactivated = users.filter((u) => !!u.deactivated_at).length;

  return (
    <>
        {/* Top bar */}
        <header className={styles.topbar}>
          <div>
            <h1 className={styles.pageTitle}>User Management</h1>
            <p className={styles.pageSubtitle}>
              Manage all registered users and their access
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
              id="create-user-btn"
              className={styles.btnPrimary}
              onClick={() => setModal({ kind: "create" })}
            >
              + New User
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "#eef2ff" }}>
              📋
            </div>
            <div>
              <div className={styles.statValue}>{pagination?.total ?? "—"}</div>
              <div className={styles.statLabel}>Total Users</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "#f0fdf4" }}>
              ✅
            </div>
            <div>
              <div className={styles.statValue} style={{ color: "#16a34a" }}>
                {totalActive}
              </div>
              <div className={styles.statLabel}>Active (this page)</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "#fff7ed" }}>
              ⏸
            </div>
            <div>
              <div className={styles.statValue} style={{ color: "#d97706" }}>
                {totalDeactivated}
              </div>
              <div className={styles.statLabel}>Deactivated (this page)</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "#fdf4ff" }}>
              📄
            </div>
            <div>
              <div className={styles.statValue}>
                {pagination
                  ? `${pagination.current_page}/${pagination.last_page}`
                  : "—"}
              </div>
              <div className={styles.statLabel}>Page</div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              id="user-search"
              className={styles.searchInput}
              type="text"
              autoComplete="off"
              placeholder="Search by name, email or phone…"
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
          <select
            id="status-filter"
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter);
              setPage(1);
            }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </div>

        {/* Table */}
        <div className={styles.tableWrap}>
          {listLoading ? (
            <div className={styles.tableLoader}>
              <div className={styles.spinner} />
              <p>Loading users…</p>
            </div>
          ) : listError ? (
            <div className={styles.tableError}>
              <p>⚠ {listError}</p>
              <button className={styles.btnSecondary} onClick={loadUsers}>
                Retry
              </button>
            </div>
          ) : displayed.length === 0 ? (
            <div className={styles.tableEmpty}>
              <div className={styles.emptyIcon}>👤</div>
              <p>No users found{search ? " for your search" : ""}.</p>
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
                  <th className={styles.th}>User</th>
                  <th className={styles.th}>Email</th>
                  <th className={styles.th}>Phone</th>
                  <th className={styles.th}>Roles</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Created</th>
                  <th className={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((user) => (
                  <tr key={user.id} className={styles.tr}>
                    {/* Avatar + name */}
                    <td className={styles.td}>
                      <div className={styles.userCell}>
                        <div
                          className={styles.avatar}
                          style={{ background: avatarColor(user.id) }}
                        >
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <div className={styles.userName}>{user.name}</div>
                          <div className={styles.userId}>#{user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.emailText}>{user.email}</span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.phoneText}>
                        {user.phone || "—"}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.rolesCell}>
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.map((r: any) => (
                            <span key={r.id} className={styles.roleChip}>
                              {r.name}
                            </span>
                          ))
                        ) : (
                          <span className={styles.noRole}>No role</span>
                        )}
                      </div>
                    </td>
                    <td className={styles.td}>
                      <StatusBadge user={user} />
                    </td>
                    <td className={styles.td}>
                      <span className={styles.dateText}>
                        {formatDate(user.created_at)}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.actions}>
                        <button
                          id={`view-user-${user.id}`}
                          title="View Details"
                          className={`${styles.actionBtn} ${styles.actionView}`}
                          onClick={() => setModal({ kind: "view", user })}
                        >
                          👁
                        </button>
                        <button
                          id={`edit-user-${user.id}`}
                          title="Edit"
                          className={`${styles.actionBtn} ${styles.actionEdit}`}
                          onClick={() => setModal({ kind: "edit", user })}
                        >
                          ✏️
                        </button>
                        {user.deactivated_at ? (
                          <button
                            id={`reactivate-user-${user.id}`}
                            title="Reactivate"
                            className={`${styles.actionBtn} ${styles.actionActivate}`}
                            onClick={() =>
                              setModal({ kind: "confirm-reactivate", user })
                            }
                          >
                            ▶
                          </button>
                        ) : (
                          <button
                            id={`deactivate-user-${user.id}`}
                            title="Deactivate"
                            className={`${styles.actionBtn} ${styles.actionDeactivate}`}
                            onClick={() =>
                              setModal({ kind: "confirm-deactivate", user })
                            }
                          >
                            ⏸
                          </button>
                        )}
                        <button
                          id={`manage-roles-user-${user.id}`}
                          title="Manage Roles"
                          className={`${styles.actionBtn} ${styles.actionRoles}`}
                          onClick={() =>
                            setModal({ kind: "manage-roles", user })
                          }
                        >
                          🔑
                        </button>
                        <button
                          id={`manage-branches-user-${user.id}`}
                          title="Manage Branch Mappings"
                          className={`${styles.actionBtn} ${styles.actionBranch}`}
                          onClick={() =>
                            setModal({ kind: "manage-branches", user })
                          }
                        >
                          🗂
                        </button>
                        <button
                          id={`delete-user-${user.id}`}
                          title="Delete"
                          className={`${styles.actionBtn} ${styles.actionDelete}`}
                          onClick={() =>
                            setModal({ kind: "confirm-delete", user })
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

        {/* Pagination */}
        <div className={styles.pagination}>
          <span className={styles.paginationInfo}>
            {pagination
              ? `Showing ${pagination.from ?? 1}–${pagination.to ?? users.length} of ${pagination.total} users`
              : "Loading..."}
          </span>
          {pagination && pagination.last_page > 1 && (
            <div className={styles.paginationBtns}>
              <button
                className={styles.pageBtn}
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              {Array.from(
                { length: pagination.last_page },
                (_, i) => i + 1,
              ).map((p) => (
                <button
                  key={p}
                  className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className={styles.pageBtn}
                disabled={page === pagination.last_page}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </div>

      {/* ─── Modals ─────────────────────────────────────────────────────────── */}

      {/* Create */}
      {modal.kind === "create" && (
        <Modal
          title="Create New User"
          onClose={() => setModal({ kind: "none" })}
          wide
        >
          <UserForm
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
          title={`Edit — ${modal.user.name}`}
          onClose={() => setModal({ kind: "none" })}
          wide
        >
          <UserForm
            initial={{
              name: modal.user.name,
              email: modal.user.email,
              phone: modal.user.phone ?? "",
              password: "",
              ticket_no: modal.user.ticket_no ?? "",
              branch_role_id: modal.user.branch_role_id ?? "",
              branch_code: modal.user.branch_code ?? "",
              zone_code: modal.user.zone_code ?? "",
            }}
            isEdit={true}
            onSubmit={(form) => handleUpdate(modal.user, form)}
            onClose={() => setModal({ kind: "none" })}
          />
        </Modal>
      )}

      {/* View */}
      {modal.kind === "view" && (
        <Modal title="User Details" onClose={() => setModal({ kind: "none" })} wide>
          <div className={styles.viewGrid}>

            {/* Header — avatar, name, email, status */}
            <div className={styles.viewHeader}>
              <div
                className={styles.viewAvatar}
                style={{ background: avatarColor(modal.user.id) }}
              >
                {getInitials(modal.user.name)}
              </div>
              <div className={styles.viewHeaderInfo}>
                <p className={styles.viewHeaderName}>{modal.user.name}</p>
                <p className={styles.viewHeaderEmail}>{modal.user.email}</p>
                <StatusBadge user={modal.user} />
              </div>
            </div>

            {/* Identity */}
            <div className={styles.viewSection}>
              <p className={styles.viewSectionTitle}>Identity</p>
              <dl className={styles.viewFieldsGrid}>
                <div className={styles.viewField}>
                  <dt className={styles.viewDt}>ID</dt>
                  <dd className={styles.viewDd}>#{modal.user.id}</dd>
                </div>
                <div className={styles.viewField}>
                  <dt className={styles.viewDt}>Phone</dt>
                  <dd className={styles.viewDd}>{modal.user.phone || "—"}</dd>
                </div>
              </dl>
            </div>

            {/* Branch Info */}
            <div className={styles.viewSection}>
              <p className={styles.viewSectionTitle}>Branch Info</p>
              <dl className={styles.viewFieldsGrid}>
                <div className={styles.viewField}>
                  <dt className={styles.viewDt}>Ticket No</dt>
                  <dd className={styles.viewDd}>{modal.user.ticket_no || "—"}</dd>
                </div>
                <div className={styles.viewField}>
                  <dt className={styles.viewDt}>Branch Role ID</dt>
                  <dd className={styles.viewDd}>{modal.user.branch_role_id || "—"}</dd>
                </div>
                <div className={styles.viewField}>
                  <dt className={styles.viewDt}>Branch Code</dt>
                  <dd className={styles.viewDd}>{modal.user.branch_code || "—"}</dd>
                </div>
                <div className={styles.viewField}>
                  <dt className={styles.viewDt}>Zone Code</dt>
                  <dd className={styles.viewDd}>{modal.user.zone_code || "—"}</dd>
                </div>
              </dl>
            </div>

            {/* Access & Roles */}
            <div className={styles.viewSection}>
              <p className={styles.viewSectionTitle}>Access & Roles</p>
              <dl className={styles.viewFieldsGrid}>
                <div className={`${styles.viewField} ${styles.viewFieldFull}`}>
                  <dt className={styles.viewDt}>Assigned Roles</dt>
                  <dd className={styles.viewDd}>
                    {modal.user.roles?.length ? (
                      <div className={styles.rolesCell}>
                        {modal.user.roles.map((r) => (
                          <span key={r.id} className={styles.roleChip}>{r.name}</span>
                        ))}
                      </div>
                    ) : (
                      <span className={styles.noRole}>No role assigned</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Timestamps */}
            <div className={styles.viewSection}>
              <p className={styles.viewSectionTitle}>Timestamps</p>
              <dl className={styles.viewFieldsGrid}>
                <div className={styles.viewField}>
                  <dt className={styles.viewDt}>Joined</dt>
                  <dd className={styles.viewDd}>{formatDate(modal.user.created_at)}</dd>
                </div>
                <div className={styles.viewField}>
                  <dt className={styles.viewDt}>Last Updated</dt>
                  <dd className={styles.viewDd}>{formatDate(modal.user.updated_at)}</dd>
                </div>
                <div className={styles.viewField}>
                  <dt className={styles.viewDt}>Email Verified</dt>
                  <dd className={styles.viewDd}>{formatDate(modal.user.email_verified_at)}</dd>
                </div>
                <div className={styles.viewField}>
                  <dt className={styles.viewDt}>Deactivated At</dt>
                  <dd className={styles.viewDd}>{formatDate(modal.user.deactivated_at)}</dd>
                </div>
              </dl>
            </div>

          </div>
        </Modal>
      )}

      {/* Confirm Deactivate */}
      {modal.kind === "confirm-deactivate" && (
        <ConfirmDialog
          message={`Are you sure you want to deactivate "${modal.user.name}"? They will lose access immediately.`}
          confirmLabel="Deactivate"
          onConfirm={() => handleDeactivate(modal.user)}
          onCancel={() => setModal({ kind: "none" })}
        />
      )}

      {/* Confirm Reactivate */}
      {modal.kind === "confirm-reactivate" && (
        <ConfirmDialog
          message={`Reactivate "${modal.user.name}"? They will regain access.`}
          confirmLabel="Reactivate"
          confirmClass={styles.btnSuccess}
          onConfirm={() => handleReactivate(modal.user)}
          onCancel={() => setModal({ kind: "none" })}
        />
      )}

      {/* Manage Roles */}
      {modal.kind === "manage-roles" && (
        <Modal
          title="Manage User Roles"
          onClose={() => setModal({ kind: "none" })}
        >
          <ManageUserRoles
            user={modal.user}
            allRoles={allRoles}
            onUserUpdated={handleUserUpdatedInPlace}
            showToast={showToast}
          />
        </Modal>
      )}

      {/* Manage Branch Mappings */}
      {modal.kind === "manage-branches" && (
        <Modal
          title={`Branch Mappings — ${modal.user.name}`}
          onClose={() => setModal({ kind: "none" })}
        >
          <ManageUserBranchMappings
            user={modal.user}
            showToast={showToast}
          />
        </Modal>
      )}

      {/* Confirm Delete */}
      {modal.kind === "confirm-delete" && (
        <ConfirmDialog
          message={`Permanently delete "${modal.user.name}"? This cannot be undone.`}
          confirmLabel="Delete Permanently"
          onConfirm={() => handleDelete(modal.user)}
          onCancel={() => setModal({ kind: "none" })}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={clearToast} />
      )}
    </>
  );
}
