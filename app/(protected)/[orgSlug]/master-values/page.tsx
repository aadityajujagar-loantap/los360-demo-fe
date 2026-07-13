"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  type MasterValue,
  type CreateMasterValuePayload,
  type UpdateMasterValuePayload,
  type PaginatedMasterValues,
  fetchMasterValues,
  createMasterValue,
  updateMasterValue,
  deleteMasterValue,
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

// ─── Admin Sidebar Nav ───────────────────────────────────────────────────────

function AdminNav({ orgSlug, active }: { orgSlug: string; active: string }) {
  const items = [
    { href: `/${orgSlug}/dashboard`, icon: "👥", label: "Users" },
    { href: `/${orgSlug}/roles`, icon: "🔑", label: "Roles" },
    { href: `/${orgSlug}/permissions`, icon: "🛡️", label: "Permissions" },
    { href: `/${orgSlug}/regions`, icon: "📍", label: "Regions" },
    { href: `/${orgSlug}/master-values`, icon: "⚙️", label: "Master Values" },
  ];
  return (
    <nav className={styles.nav}>
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className={`${styles.navItem} ${active === item.label ? styles.navItemActive : ""}`}
        >
          <span className={styles.navIcon}>{item.icon}</span>
          {item.label}
        </a>
      ))}
    </nav>
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
    <div className={`${styles.toast} ${type === "error" ? styles.toastError : styles.toastSuccess}`}>
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
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

// ─── Searchable Select ───────────────────────────────────────────────────────

function SearchableSelect({
  id,
  options,
  value,
  onChange,
  disabled,
  loading,
  style,
  placeholder = "Select an option...",
  showAllOption = false,
}: {
  id: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  loading?: boolean;
  style?: React.CSSProperties;
  placeholder?: string;
  showAllOption?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Show all options when searchTerm is empty, otherwise filter
  const filtered = !searchTerm.trim()
    ? options
    : options.filter((opt) => opt.toLowerCase().includes(searchTerm.toLowerCase()));

  function handleSelect(opt: string) {
    onChange(opt);
    setIsOpen(false);
    setSearchTerm("");
    setFocusedIndex(-1);
  }

  return (
    <div style={{ position: "relative", ...style }}>
      <input
        id={id}
        type="text"
        placeholder={placeholder}
        value={isOpen ? searchTerm : value || (showAllOption ? "All Categories" : "")}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setIsOpen(false);
            setSearchTerm("");
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setFocusedIndex((i) => (i + 1 < filtered.length ? i + 1 : i));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setFocusedIndex((i) => (i > 0 ? i - 1 : -1));
          } else if (e.key === "Enter" && focusedIndex >= 0) {
            e.preventDefault();
            handleSelect(filtered[focusedIndex]);
          }
        }}
        disabled={disabled || loading}
        autoComplete="off"
        className={styles.filterSelect}
        style={{ width: "100%" }}
      />

      {isOpen && options.length > 0 && (
        <>
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: "2px",
              background: "white",
              border: "1px solid #ddd",
              borderRadius: "4px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              zIndex: 1000,
              maxHeight: "150px",
              overflowY: "auto",
            }}
          >
            {showAllOption && (
              <div
                style={{
                  padding: "6px 8px",
                  cursor: "pointer",
                  background: focusedIndex === -1 ? "#f0f0f0" : "transparent",
                  fontSize: "13px",
                  borderBottom: "1px solid #f0f0f0",
                }}
                onClick={() => handleSelect("")}
                onMouseEnter={() => setFocusedIndex(-1)}
              >
                All Categories
              </div>
            )}
            {filtered.length > 0 ? (
              filtered.map((opt, idx) => (
                <div
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  onMouseEnter={() => setFocusedIndex(idx)}
                  style={{
                    padding: "6px 8px",
                    cursor: "pointer",
                    background: focusedIndex === idx ? "var(--primary-light)" : "transparent",
                    fontSize: "13px",
                  }}
                >
                  {opt}
                </div>
              ))
            ) : (
              <div style={{ padding: "6px 8px", color: "#999", fontSize: "13px" }}>
                No match
              </div>
            )}
          </div>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onClick={() => {
              setIsOpen(false);
              setSearchTerm("");
            }}
          />
        </>
      )}
    </div>
  );
}

// ─── Master Value Form ───────────────────────────────────────────────────────

function MasterValueForm({
  initial,
  isEdit,
  onSubmit,
  onClose,
  allCallTypes,
}: {
  initial: Partial<MasterValue>;
  isEdit: boolean;
  onSubmit: (data: CreateMasterValuePayload) => Promise<void>;
  onClose: () => void;
  allCallTypes: string[];
}) {
  const [form, setForm] = useState({
    call_type: initial.call_type || "",
    meta_key: initial.meta_key || "",
    meta_value: initial.meta_value || "",
    sort_order: initial.sort_order ?? 0,
    is_active: initial.is_active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: val });
    setErrors((prev) => { const n = { ...prev }; delete n[e.target.name]; return n; });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Frontend validation
    const newErrors: Record<string, string[]> = {};
    if (!form.call_type.trim()) {
      newErrors.call_type = ["Category is required."];
    } else if (!/^[a-z_]+$/.test(form.call_type.trim())) {
      newErrors.call_type = ["Category should only contain lowercase letters and underscores."];
    } else if (form.call_type.trim().length > 200) {
      newErrors.call_type = ["Category cannot exceed 200 characters."];
    }

    if (!form.meta_key.trim()) newErrors.meta_key = ["Key is required."];
    else if (form.meta_key.trim().length > 200) newErrors.meta_key = ["Key cannot exceed 200 characters."];

    if (!form.meta_value.trim()) newErrors.meta_value = ["Label is required."];
    else if (form.meta_value.trim().length > 200) newErrors.meta_value = ["Label cannot exceed 200 characters."];

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      await onSubmit({
        ...form,
        call_type: form.call_type.trim(),
        meta_key: form.meta_key.trim(),
        meta_value: form.meta_value.trim(),
        sort_order: Number(form.sort_order),
      });
    } catch (err: any) {
      if (err?.errors) setErrors(err.errors);
      else if (err?.message) setErrors({ _: [err.message] });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} autoComplete="off">
      <div className={styles.formGroup}>
        <label className={styles.label}>Category (Call Type) <span className={styles.required}>*</span></label>
        <SearchableSelect
          id="mv-call-type"
          options={allCallTypes}
          value={form.call_type}
          onChange={(val) => {
            setForm({ ...form, call_type: val });
            setErrors((prev) => { const n = { ...prev }; delete n.call_type; return n; });
          }}
          disabled={saving}
          placeholder="Select or type a category..."
          showAllOption={false}
          style={{ width: "100%" }}
        />
        {errors.call_type && <p className={styles.fieldErr}>{errors.call_type[0]}</p>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Key <span className={styles.required}>*</span></label>
        <input
          id="mv-meta-key"
          name="meta_key"
          type="text"
          value={form.meta_key}
          onChange={handleChange}
          placeholder="e.g. personal_loan"
          required
          className={`${styles.input} ${errors.meta_key ? styles.inputErr : ""}`}
          maxLength={200}
          autoComplete="off"
        />
        {errors.meta_key && <p className={styles.fieldErr}>{errors.meta_key[0]}</p>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Label (Value) <span className={styles.required}>*</span></label>
        <input
          id="mv-meta-value"
          name="meta_value"
          type="text"
          value={form.meta_value}
          onChange={handleChange}
          placeholder="e.g. Personal Loan"
          required
          className={`${styles.input} ${errors.meta_value ? styles.inputErr : ""}`}
          maxLength={200}
          autoComplete="off"
        />
        {errors.meta_value && <p className={styles.fieldErr}>{errors.meta_value[0]}</p>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Sort Order</label>
        <input
          id="mv-sort-order"
          name="sort_order"
          type="number"
          value={form.sort_order}
          onChange={handleChange}
          className={styles.input}
          autoComplete="off"
        />
      </div>

      <div className={styles.formGroup} style={{ flexDirection: "row", alignItems: "center", gap: "8px" }}>
        <input
          id="mv-is-active"
          name="is_active"
          type="checkbox"
          checked={form.is_active}
          onChange={handleChange}
          autoComplete="off"
        />
        <label htmlFor="mv-is-active" className={styles.label} style={{ marginBottom: 0 }}>Active</label>
      </div>

      {errors._ && <p className={styles.formErr}>{errors._[0]}</p>}

      <div className={styles.formFooter}>
        <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancel</button>
        <button
          id={isEdit ? "update-mv-btn" : "create-mv-btn"}
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

// ─── Modal State ─────────────────────────────────────────────────────────────

type ModalState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; item: MasterValue }
  | { kind: "confirm-delete"; item: MasterValue };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MasterValuesPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();

  const [authUser, setAuthUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [items, setItems] = useState<MasterValue[]>([]);
  const [pagination, setPagination] = useState<Omit<PaginatedMasterValues, "data"> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [search, setSearch] = useState("");
  const [callTypeFilter, setCallTypeFilter] = useState("");
  const [allCallTypes, setAllCallTypes] = useState<string[]>([]);
  const [callTypesLoading, setCallTypesLoading] = useState(false);
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

  // ── Fetch all available call_types for dropdown ──────────────────────────────
  const loadAllCallTypes = useCallback(async () => {
    setCallTypesLoading(true);
    try {
      const result = await fetchMasterValues({
        per_page: 1000, // High limit to capture all call_types
      });
      if (result.data?.data) {
        const uniqueMap = new Map<string, string>();
        result.data.data.forEach((i) => {
          const lower = i.call_type.toLowerCase();
          if (!uniqueMap.has(lower)) {
            uniqueMap.set(lower, i.call_type);
          }
        });
        const types = Array.from(uniqueMap.values()).sort();
        setAllCallTypes(types);
      }
    } catch (e: any) {
      console.error("Failed to load call types:", e.message);
      setAllCallTypes([]);
    } finally {
      setCallTypesLoading(false);
    }
  }, []);

  // ── Fetch master values ─────────────────────────────────────────────────────
  const loadItems = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      const result = await fetchMasterValues({
        page,
        per_page: 20,
        call_type: callTypeFilter || undefined,
      });
      if (result.data && result.data.data) {
        setItems(result.data.data);
        const { data: _d, ...meta } = result.data;
        setPagination(meta);
      } else {
        setItems([]);
        setPagination(null);
      }
    } catch (e: any) {
      setListError(e.message || "Failed to load master values");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, callTypeFilter]);

  useEffect(() => {
    if (!authLoading && authUser) {
      loadItems();
      loadAllCallTypes();
    }
  }, [authLoading, authUser, loadItems, loadAllCallTypes]);

  // ── Filter client-side by search ────────────────────────────────────────────
  const displayed = search.trim()
    ? items.filter(
        (i) =>
          i.call_type.toLowerCase().includes(search.toLowerCase()) ||
          i.meta_key.toLowerCase().includes(search.toLowerCase()) ||
          i.meta_value.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  // ── Actions ─────────────────────────────────────────────────────────────────

  function showToast(message: string, type: ToastType) {
    setToast({ message, type });
  }

  async function handleCreate(data: CreateMasterValuePayload) {
    await createMasterValue(data);
    setModal({ kind: "none" });
    showToast("Master value created successfully.", "success");
    loadItems();
  }

  async function handleUpdate(item: MasterValue, data: CreateMasterValuePayload) {
    await updateMasterValue(item.id, data);
    setModal({ kind: "none" });
    showToast("Master value updated successfully.", "success");
    loadItems();
  }

  async function handleDelete(item: MasterValue) {
    try {
      await deleteMasterValue(item.id);
      showToast(`"${item.meta_value}" deleted.`, "success");
    } catch (e: any) {
      showToast(e?.message || "Delete failed.", "error");
    }
    setModal({ kind: "none" });
    loadItems();
  }

  function handleLogout() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("org_slug");
    router.push(`/${orgSlug}/login`);
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
            <h1 className={styles.pageTitle}>Master Values</h1>
            <p className={styles.pageSubtitle}>Configuration for dropdowns and system constants</p>
          </div>
          <div className={styles.topbarRight}>
            <button
              id="create-mv-btn"
              className={styles.btnPrimary}
              onClick={() => setModal({ kind: "create" })}
            >
              + New Value
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "#fef9ec" }}>⚙️</div>
            <div>
              <div className={styles.statValue}>{pagination?.total ?? items.length}</div>
              <div className={styles.statLabel}>Total Values</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "#eef2ff" }}>🗂️</div>
            <div>
              <div className={styles.statValue}>{allCallTypes.length}</div>
              <div className={styles.statLabel}>Categories</div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              id="mv-search"
              className={styles.searchInput}
              type="text"
              placeholder="Search category, key or label…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
            {search && (
              <button className={styles.searchClear} onClick={() => setSearch("")}>✕</button>
            )}
          </div>
          <SearchableSelect
            id="call-type-filter"
            options={allCallTypes}
            value={callTypeFilter}
            onChange={(val) => {
              setCallTypeFilter(val);
              setPage(1);
            }}
            loading={callTypesLoading}
            disabled={callTypesLoading}
            showAllOption={true}
            placeholder="All Categories"
          />
        </div>

        {/* Table */}
        <div className={styles.tableWrap}>
          {loading ? (
            <div className={styles.tableLoader}>
              <div className={styles.spinner} />
              <p>Loading master values…</p>
            </div>
          ) : listError ? (
            <div className={styles.tableError}>
              <p>⚠ {listError}</p>
              <button className={styles.btnSecondary} onClick={loadItems}>Retry</button>
            </div>
          ) : displayed.length === 0 ? (
            <div className={styles.tableEmpty}>
              <div className={styles.emptyIcon}>⚙️</div>
              <p>No master values found{search ? " for your search" : ""}.</p>
              {!search && (
                <button className={styles.btnPrimary} onClick={() => setModal({ kind: "create" })}>
                  + New Value
                </button>
              )}
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Category</th>
                  <th className={styles.th}>Key</th>
                  <th className={styles.th}>Label</th>
                  <th className={styles.th}>Order</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Updated</th>
                  <th className={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((item) => (
                  <tr key={item.id} className={styles.tr}>
                    <td className={styles.td}>
                      <span className={styles.badge}>{item.call_type}</span>
                    </td>
                    <td className={styles.td}>
                      <code style={{ fontSize: "0.8rem", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                        {item.meta_key}
                      </code>
                    </td>
                    <td className={styles.td}>{item.meta_value}</td>
                    <td className={styles.td}>{item.sort_order}</td>
                    <td className={styles.td}>
                      <span className={`${styles.badge} ${item.is_active ? styles.badgeActive : styles.badgeDeactivated}`}>
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className={styles.td}>{formatDate(item.updated_at)}</td>
                    <td className={styles.td}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          id={`edit-mv-${item.id}`}
                          className={styles.btnIcon}
                          title="Edit"
                          onClick={() => setModal({ kind: "edit", item })}
                        >
                          ✏️
                        </button>
                        <button
                          id={`delete-mv-${item.id}`}
                          className={styles.btnIcon}
                          title="Delete"
                          onClick={() => setModal({ kind: "confirm-delete", item })}
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

        {/* Pagination */}
        {pagination && pagination.last_page > 1 && (
          <div className={styles.pagination}>
            <span className={styles.paginationInfo}>
              Page {pagination.current_page} of {pagination.last_page} ({pagination.total} total)
            </span>
            <div className={styles.paginationBtns}>
              <button className={styles.pageBtn} disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                ← Prev
              </button>
              {Array.from({ length: Math.min(pagination.last_page, 7) }, (_, i) => i + 1).map((p) => (
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
          </div>
        )}

      {/* Modals */}
      {modal.kind === "create" && (
        <Modal title="New Master Value" onClose={() => setModal({ kind: "none" })}>
          <MasterValueForm
            initial={{}}
            isEdit={false}
            onSubmit={handleCreate}
            onClose={() => setModal({ kind: "none" })}
            allCallTypes={allCallTypes}
          />
        </Modal>
      )}

      {modal.kind === "edit" && (
        <Modal title={`Edit — ${modal.item.meta_value}`} onClose={() => setModal({ kind: "none" })}>
          <MasterValueForm
            initial={modal.item}
            isEdit={true}
            onSubmit={(data) => handleUpdate(modal.item, data)}
            onClose={() => setModal({ kind: "none" })}
            allCallTypes={allCallTypes}
          />
        </Modal>
      )}

      {modal.kind === "confirm-delete" && (
        <div className={styles.modalOverlay} onClick={() => setModal({ kind: "none" })}>
          <div className={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
            <p className={styles.confirmMsg}>
              Delete <strong>{modal.item.meta_value}</strong>?<br />This action cannot be undone.
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.btnSecondary} onClick={() => setModal({ kind: "none" })}>Cancel</button>
              <button
                id="confirm-delete-mv-btn"
                className={styles.btnDanger}
                onClick={() => handleDelete(modal.item)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />
      )}
    </>
  );
}
