import { get, post, put, del } from "./apiClient";
import { handleMockRequest } from "@/app/_lib/mockBackend";

// ── Types ────────────────────────────────────────────────────────────────────

/** Lightweight role reference embedded on User objects */
export interface RoleRef {
  id: number;
  name: string;
}

export interface Permission {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
}

export interface CreatePermissionPayload {
  name: string;
  description?: string;
}

export interface UpdatePermissionPayload {
  name: string;
  description?: string;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
  permissions: Permission[];
}

export interface CreateRolePayload {
  name: string;
  description?: string;
}

export interface UpdateRolePayload {
  name: string;
  description?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  ticket_no: string | null;
  branch_role_id: string | null;
  branch_code: string | null;
  zone_code: string | null;
  email_verified_at: string | null;
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
  roles: RoleRef[];
}

export interface PaginatedUsers {
  data: User[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
  ticket_no?: string;
  branch_role_id?: string;
  branch_code?: string;
  zone_code?: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  ticket_no?: string;
  branch_role_id?: string;
  branch_code?: string;
  zone_code?: string;
}

export interface CaptchaResponse {
  status: string;
  message: string;
  respData: {
    captcha_key: string;
    captcha_img: string;
  };
}

export interface MakerRequest {
  id: number;
  uuid: string;
  group: string;
  action_type: 'add' | 'update' | 'delete';
  model_class: string | null;
  record_id: number | null;
  request_data: Record<string, any> | null;
  original_data: Record<string, any> | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_by: number;
  maker_name?: string;
  reviewed_by: number | null;
  reviewer_name?: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedMakerRequests {
  data: MakerRequest[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface MakerRequestFilters {
  group?: string;
  action_type?: 'add' | 'update' | 'delete';
  status?: 'pending' | 'approved' | 'rejected';
  requested_by?: number;
  per_page?: number;
  page?: number;
}

export interface ProcessJourneyStepPayload {
  step_key: string;
  loan_type: string;
  application_id?: string;
  payload: Record<string, any>;
}

export interface ProcessJourneyStepResponse {
  status: string;
  message: string;
  data: {
    application_id?: string;
    otp_reference_id?: string;
    [key: string]: any;
  };
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function loginUser(data: any) {
  return await post("/auth/login", data);
}

export async function verifyOtp(data: any) {
  return await post("/auth/verify-otp", data);
}

export async function logoutUser() {
  return await post("/logout", {});
}

export async function registerUser(data: any) {
  return await post("/register", data);
}

export async function fetchCaptcha(): Promise<CaptchaResponse> {
  const res = await get("/auth/captcha");
  if (!res.ok) throw new Error(`Failed to fetch captcha: ${res.status}`);
  return res.json();
}

// ── User Roles & Permissions ──────────────────────────────────────────────────

export interface UserRolesPermissionsResponse {
  roles: RoleRef[];
  permissions: string[]; // format: "module.action" e.g. "users.view"
  is_super_admin: boolean;
}

export async function fetchUserRolesPermissions(): Promise<UserRolesPermissionsResponse> {
  const res = await get("/user/roles-permissions");
  if (!res.ok) throw new Error(`Failed to fetch roles-permissions: ${res.status}`);
  const body = await res.json();

  // Response shape: { status, message, respData: { roles: [{ id, name, permissions: [{id,name}] }] } }
  const raw = body?.respData ?? body?.data ?? body;

  // Extract roles array
  const rawRoles: any[] = Array.isArray(raw?.roles) ? raw.roles : [];
  const roles: RoleRef[] = rawRoles.map((r: any) => ({ id: r.id ?? 0, name: r.name ?? "" }));

  // Permissions are nested inside each role — flatten and deduplicate
  const permSet = new Set<string>();
  for (const role of rawRoles) {
    const rolePerms: any[] = Array.isArray(role?.permissions) ? role.permissions : [];
    for (const p of rolePerms) {
      const name = typeof p === "string" ? p : (p?.name ?? "");
      if (name) permSet.add(name);
    }
  }
  // Also check for a top-level permissions array (in case API shape changes)
  const topPerms: any[] = Array.isArray(raw?.permissions) ? raw.permissions : [];
  for (const p of topPerms) {
    const name = typeof p === "string" ? p : (p?.name ?? "");
    if (name) permSet.add(name);
  }
  const permissions = Array.from(permSet);

  // Super admin: explicit flag OR role named "super_admin"
  const is_super_admin: boolean =
    raw?.is_super_admin === true ||
    roles.some((r) =>
      r.name.toLowerCase() === "super_admin" || r.name.toLowerCase() === "super admin"
    );

  return { roles, permissions, is_super_admin };
}

// ── Admin — Users ─────────────────────────────────────────────────────────────

export async function fetchUsers(params?: {
  page?: number;
  per_page?: number;
  status?: "active" | "deactivated";
}): Promise<{ status: string; data: PaginatedUsers }> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.per_page) query.set("per_page", String(params.per_page));
  if (params?.status) query.set("status", params.status);
  const qs = query.toString() ? `?${query.toString()}` : "";
  const res = await get(`/admin/users${qs}`);
  if (!res.ok) throw new Error(`Failed to fetch users: ${res.status}`);
  return res.json();
}

export async function fetchUser(
  id: number,
): Promise<{ status: string; data: User }> {
  const res = await get(`/admin/users/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch user: ${res.status}`);
  return res.json();
}

export async function createUser(
  payload: CreateUserPayload,
): Promise<{ status: string; message: string; data: User }> {
  const res = await post("/admin/users", payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

export async function updateUser(
  id: number,
  payload: UpdateUserPayload,
): Promise<{ status: string; message: string; data: User }> {
  const res = await put(`/admin/users/${id}`, payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

export async function deactivateUser(
  id: number,
): Promise<{ status: string; message: string }> {
  const res = await post(`/admin/users/${id}/deactivate`, {});
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

export async function reactivateUser(
  id: number,
): Promise<{ status: string; message: string }> {
  const res = await post(`/admin/users/${id}/reactivate`, {});
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

export async function deleteUser(
  id: number,
): Promise<{ status: string; message: string }> {
  const res = await del(`/admin/users/${id}`);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

// ── Admin — Permissions ───────────────────────────────────────────────────────

export async function fetchPermissions(): Promise<Permission[]> {
  const res = await get("/admin/permissions");
  if (!res.ok) throw new Error(`Failed to fetch permissions: ${res.status}`);
  return res.json();
}

export async function createPermission(
  payload: CreatePermissionPayload,
): Promise<Permission> {
  const res = await post("/admin/permissions", payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

export async function updatePermission(
  id: number,
  payload: UpdatePermissionPayload,
): Promise<Permission> {
  const res = await put(`/admin/permissions/${id}`, payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

export async function deletePermission(
  id: number,
): Promise<{ message: string }> {
  const res = await del(`/admin/permissions/${id}`);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

// ── Admin — Roles ─────────────────────────────────────────────────────────────

export async function fetchRoles(): Promise<Role[]> {
  const res = await get("/admin/roles");
  if (!res.ok) throw new Error(`Failed to fetch roles: ${res.status}`);
  return res.json();
}

export async function createRole(payload: CreateRolePayload): Promise<Role> {
  const res = await post("/admin/roles", payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

export async function updateRole(
  id: number,
  payload: UpdateRolePayload,
): Promise<Role> {
  const res = await put(`/admin/roles/${id}`, payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

export async function deleteRole(id: number): Promise<{ message: string }> {
  const res = await del(`/admin/roles/${id}`);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

/** Replace ALL permissions on a role at once (sync) */
export async function syncRolePermissions(
  roleId: number,
  permissions: string[],
): Promise<Role> {
  const res = await post(`/admin/roles/${roleId}/permissions`, { permissions });
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

/** Give a single permission to a role */
export async function giveRolePermission(
  roleId: number,
  permissionId: number,
): Promise<Role> {
  const res = await post(
    `/admin/roles/${roleId}/permissions/${permissionId}`,
    {},
  );
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

/** Revoke a single permission from a role */
export async function revokeRolePermission(
  roleId: number,
  permissionId: number,
): Promise<Role> {
  const res = await del(`/admin/roles/${roleId}/permissions/${permissionId}`);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

// ── Admin — User Role Management ──────────────────────────────────────────────

/** GET /admin/users/{user}/roles — list roles assigned to a user */
export async function fetchUserRoles(userId: number): Promise<RoleRef[]> {
  const res = await get(`/admin/users/${userId}/roles`);
  if (!res.ok) throw new Error(`Failed to fetch user roles: ${res.status}`);
  return res.json();
}

/** POST /admin/users/{user}/roles — bulk-assign multiple roles by name */
export async function assignUserRoles( //this line means
  userId: number,
  roles: string[],
): Promise<User> {
  const res = await post(`/admin/users/${userId}/roles`, { roles });
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

/** POST /admin/users/{user}/roles/{role} — assign a single role */
export async function assignUserRole(
  userId: number,
  roleId: number,
): Promise<User> {
  const res = await post(`/admin/users/${userId}/roles/${roleId}`, {});
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

/** DELETE /admin/users/{user}/roles/{role} — revoke a single role */
export async function revokeUserRole(
  userId: number,
  roleId: number,
): Promise<User> {
  const res = await del(`/admin/users/${userId}/roles/${roleId}`);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

// ── Maker-Checker helper ─────────────────────────────────────────────────────

export interface MakerResponseBody {
  message: string;
  reference: string;
  status: 'pending';
  action_type: 'add' | 'update' | 'delete';
  group: string;
}

export function isMakerResponse(body: any): body is MakerResponseBody {
  return typeof body?.reference === 'string';
}

// ── Admin — Regions ───────────────────────────────────────────────────────────

export interface Region {
  id: number;
  region_code: string;
  region_name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRegionPayload {
  region_code: string;
  region_name: string;
}

export type UpdateRegionPayload = Partial<CreateRegionPayload>;

export interface PaginatedRegions {
  data: Region[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export async function fetchRegions(params?: { search?: string; page?: number; per_page?: number }): Promise<{ data: Region[]; current_page: number; last_page: number; total: number; per_page: number }> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.per_page) qs.set("per_page", String(params.per_page));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const res = await get(`/admin/regions${query}`);
  if (!res.ok) throw new Error(`Failed to fetch regions: ${res.status}`);
  const body = await res.json();
  if (body.data && Array.isArray(body.data.data)) return body.data;
  const arr = Array.isArray(body) ? body : Array.isArray(body.data) ? body.data : [];
  return { data: arr, current_page: 1, last_page: 1, total: arr.length, per_page: arr.length };
}

export async function fetchRegionsDropdown(): Promise<Region[]> {
  try {
    const res = await fetchRegions({ per_page: 1000 });
    return res.data || [];
  } catch (error) {
    console.error("Error fetching regions for dropdown:", error);
    return [];
  }
}

export async function fetchRegion(id: number): Promise<Region> {
  const res = await get(`/admin/regions/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch region: ${res.status}`);
  const body = await res.json();
  return body.data ?? body;
}

export async function createRegion(payload: CreateRegionPayload): Promise<Region | MakerResponseBody> {
  const res = await post("/admin/regions", payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body.data ?? body;
}

export async function updateRegion(region_code: string, payload: UpdateRegionPayload): Promise<Region | MakerResponseBody> {
  const res = await put(`/admin/regions/${encodeURIComponent(region_code)}`, payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body.data ?? body;
}

export async function deleteRegion(region_code: string): Promise<{ message: string } | MakerResponseBody> {
  const res = await del(`/admin/regions/${encodeURIComponent(region_code)}`);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

// ── Admin — Sub-Regions ───────────────────────────────────────────────────────

export interface SubRegion {
  id: number;
  region_code: string;
  sub_region_code: string;
  sub_region_name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSubRegionPayload {
  region_code: string;
  sub_region_code: string;
  sub_region_name: string;
}

export type UpdateSubRegionPayload = Partial<CreateSubRegionPayload>;

export async function fetchSubRegions(params?: { region_code?: string; search?: string; page?: number; per_page?: number }): Promise<{ data: SubRegion[]; current_page: number; last_page: number; total: number; per_page: number }> {
  const qs = new URLSearchParams();
  if (params?.region_code) qs.set("region_code", params.region_code);
  if (params?.search) qs.set("search", params.search);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.per_page) qs.set("per_page", String(params.per_page));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const res = await get(`/admin/sub-regions${query}`);
  if (!res.ok) throw new Error(`Failed to fetch sub-regions: ${res.status}`);
  const body = await res.json();
  if (body.data && Array.isArray(body.data.data)) return body.data;
  const arr = Array.isArray(body) ? body : Array.isArray(body.data) ? body.data : [];
  return { data: arr, current_page: 1, last_page: 1, total: arr.length, per_page: arr.length };
}

export async function fetchSubRegionsDropdown(region_code?: string): Promise<SubRegion[]> {
  try {
    const res = await fetchSubRegions({ per_page: 1000, region_code });
    return res.data || [];
  } catch (error) {
    console.error("Error fetching sub-regions for dropdown:", error);
    return [];
  }
}

export async function createSubRegion(payload: CreateSubRegionPayload): Promise<SubRegion | MakerResponseBody> {
  const res = await post("/admin/sub-regions", payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body.data ?? body;
}

export async function updateSubRegion(sub_region_code: string, payload: UpdateSubRegionPayload): Promise<SubRegion | MakerResponseBody> {
  const res = await put(`/admin/sub-regions/${encodeURIComponent(sub_region_code)}`, payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body.data ?? body;
}

export async function deleteSubRegion(sub_region_code: string): Promise<{ message: string } | MakerResponseBody> {
  const res = await del(`/admin/sub-regions/${encodeURIComponent(sub_region_code)}`);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

// ── Admin — Master Values ─────────────────────────────────────────────────────

/** Matches app/models/MasterValue.ts */
export interface MasterValue {
  id: number;
  call_type: string;
  meta_key: string;
  meta_value: string;
  sort_order: number;
  is_active: boolean;
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
}

export type CreateMasterValuePayload = Omit<MasterValue, "id" | "created_at" | "updated_at" | "created_by" | "updated_by">;
export type UpdateMasterValuePayload = Partial<CreateMasterValuePayload>;

export interface PaginatedMasterValues {
  data: MasterValue[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export async function fetchMasterValues(params?: {
  page?: number;
  per_page?: number;
  call_type?: string;
}): Promise<{ status: string; data: PaginatedMasterValues }> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.per_page) query.set("per_page", String(params.per_page));
  if (params?.call_type) query.set("call_type", params.call_type);
  const qs = query.toString() ? `?${query.toString()}` : "";
  const res = await get(`/admin/master-values${qs}`);
  if (!res.ok) throw new Error(`Failed to fetch master values: ${res.status}`);
  return res.json();
}

export async function fetchMasterValuesList(): Promise<MasterValue[]> {
  const res = await get("/admin/master-values/list");
  if (!res.ok) throw new Error(`Failed to fetch master values list: ${res.status}`);
  const body = await res.json();
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.data)) return body.data;
  return [];
}

export async function fetchMasterValue(id: number): Promise<MasterValue> {
  const res = await get(`/admin/master-values/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch master value: ${res.status}`);
  const body = await res.json();
  return body.data ?? body;
}

export async function createMasterValue(
  payload: CreateMasterValuePayload,
): Promise<{ status: string; message: string; data: MasterValue }> {
  const res = await post("/admin/master-values", payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

export async function updateMasterValue(
  id: number,
  payload: UpdateMasterValuePayload,
): Promise<{ status: string; message: string; data: MasterValue }> {
  const res = await put(`/admin/master-values/${id}`, payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

export async function deleteMasterValue(
  id: number,
): Promise<{ status: string; message: string }> {
  const res = await del(`/admin/master-values/${id}`);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

// ── Admin — Branches ──────────────────────────────────────────────────────────

export interface Branch {
  id: number;
  branch_code: string;
  branch_name: string;
  branch_number: string | null;
  region_code: string | null;
  region_name?: string;
  sub_region_code: string | null;
  sub_region_name?: string;
  district_code?: string | null;
  district_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBranchPayload {
  branch_code: string;
  branch_name: string;
  branch_number?: string;
  region_code: string;
  sub_region_code: string;
  district_code?: string;
}

export type UpdateBranchPayload = Partial<CreateBranchPayload>;

export interface BranchFilters {
  search?: string;
  region_code?: string;
  sub_region_code?: string;
  district_code?: string;
  per_page?: number;
  page?: number;
}

export interface PaginatedBranches {
  data: Branch[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
  from: number;
  to: number;
}

export async function fetchBranches(params?: BranchFilters): Promise<PaginatedBranches> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.region_code) qs.set("region_code", params.region_code);
  if (params?.sub_region_code) qs.set("sub_region_code", params.sub_region_code);
  if (params?.district_code) qs.set("district_code", params.district_code);
  if (params?.per_page) qs.set("per_page", String(params.per_page));
  if (params?.page) qs.set("page", String(params.page));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const res = await get(`/admin/branches${query}`);
  if (!res.ok) throw new Error(`Failed to fetch branches: ${res.status}`);
  const body = await res.json();
  if (body.data && Array.isArray(body.data.data)) return body.data as PaginatedBranches;
  const arr = Array.isArray(body) ? body : Array.isArray(body.data) ? body.data : [];
  return { data: arr, current_page: 1, last_page: 1, total: arr.length, per_page: arr.length, from: 1, to: arr.length };
}

export async function fetchBranchesDropdown(): Promise<Branch[]> {
  try {
    const res = await fetchBranches({ per_page: 1000 });
    return res.data || [];
  } catch (error) {
    console.error("Error fetching branches for dropdown:", error);
    return [];
  }
}

export async function fetchBranch(branch_code: string): Promise<Branch> {
  const res = await get(`/admin/branches/${encodeURIComponent(branch_code)}`);
  if (!res.ok) throw new Error(`Failed to fetch branch: ${res.status}`);
  const body = await res.json();
  return body.data ?? body;
}

export async function createBranch(payload: CreateBranchPayload): Promise<Branch | MakerResponseBody> {
  const res = await post("/admin/branches", payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body.data ?? body;
}

export async function updateBranch(branch_code: string, payload: UpdateBranchPayload): Promise<Branch | MakerResponseBody> {
  const res = await put(`/admin/branches/${encodeURIComponent(branch_code)}`, payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body.data ?? body;
}

export async function deleteBranch(branch_code: string): Promise<{ message: string } | MakerResponseBody> {
  const res = await del(`/admin/branches/${encodeURIComponent(branch_code)}`);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

// ── Admin — States ────────────────────────────────────────────────────────────

export interface State {
  id: number;
  state_code: string;
  state_name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateStatePayload {
  state_code: string;
  state_name: string;
}

export type UpdateStatePayload = Partial<CreateStatePayload>;

export async function fetchStates(params?: { search?: string; page?: number; per_page?: number }): Promise<{ data: State[]; current_page: number; last_page: number; total: number; per_page: number }> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.per_page) qs.set("per_page", String(params.per_page));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const res = await get(`/admin/states${query}`);
  if (!res.ok) throw new Error(`Failed to fetch states: ${res.status}`);
  const body = await res.json();
  if (body.data && Array.isArray(body.data.data)) return body.data;
  const arr = Array.isArray(body) ? body : Array.isArray(body.data) ? body.data : [];
  return { data: arr, current_page: 1, last_page: 1, total: arr.length, per_page: arr.length };
}

export async function fetchStatesDropdown(): Promise<State[]> {
  try {
    const res = await fetchStates({ per_page: 1000 });
    return res.data || [];
  } catch (error) {
    console.error("Error fetching states for dropdown:", error);
    return [];
  }
}

export async function fetchState(id: number): Promise<State> {
  const res = await get(`/admin/states/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch state: ${res.status}`);
  const body = await res.json();
  return body.data ?? body;
}

export async function createState(payload: CreateStatePayload): Promise<State | MakerResponseBody> {
  const res = await post("/admin/states", payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body.data ?? body;
}

export async function updateState(state_code: string, payload: UpdateStatePayload): Promise<State | MakerResponseBody> {
  const res = await put(`/admin/states/${encodeURIComponent(state_code)}`, payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body.data ?? body;
}

export async function deleteState(state_code: string): Promise<{ message: string } | MakerResponseBody> {
  const res = await del(`/admin/states/${encodeURIComponent(state_code)}`);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

// ── Admin — Districts ─────────────────────────────────────────────────────────

export interface District {
  id: number;
  state_code: string;
  state_name?: string;
  district_code: string;
  district_name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDistrictPayload {
  state_code: string;
  district_code: string;
  district_name: string;
}

export type UpdateDistrictPayload = Partial<CreateDistrictPayload>;

export async function fetchDistricts(params?: { state_code?: string; search?: string; page?: number; per_page?: number }): Promise<{ data: District[]; current_page: number; last_page: number; total: number; per_page: number }> {
  const qs = new URLSearchParams();
  if (params?.state_code) qs.set("state_code", params.state_code);
  if (params?.search) qs.set("search", params.search);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.per_page) qs.set("per_page", String(params.per_page));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const res = await get(`/admin/districts${query}`);
  if (!res.ok) throw new Error(`Failed to fetch districts: ${res.status}`);
  const body = await res.json();
  if (body.data && Array.isArray(body.data.data)) return body.data;
  const arr = Array.isArray(body) ? body : Array.isArray(body.data) ? body.data : [];
  return { data: arr, current_page: 1, last_page: 1, total: arr.length, per_page: arr.length };
}

export async function fetchDistrictsDropdown(state_code?: string): Promise<District[]> {
  try {
    const res = await fetchDistricts({ per_page: 1000, state_code });
    return res.data || [];
  } catch (error) {
    console.error("Error fetching districts for dropdown:", error);
    return [];
  }
}

export async function fetchDistrict(district_code: string): Promise<District> {
  const res = await get(`/admin/districts/${encodeURIComponent(district_code)}`);
  if (!res.ok) throw new Error(`Failed to fetch district: ${res.status}`);
  const body = await res.json();
  return body.data ?? body;
}

export async function createDistrict(payload: CreateDistrictPayload): Promise<District | MakerResponseBody> {
  const res = await post("/admin/districts", payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body.data ?? body;
}

export async function updateDistrict(district_code: string, payload: UpdateDistrictPayload): Promise<District | MakerResponseBody> {
  const res = await put(`/admin/districts/${encodeURIComponent(district_code)}`, payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body.data ?? body;
}

export async function deleteDistrict(district_code: string): Promise<{ message: string } | MakerResponseBody> {
  const res = await del(`/admin/districts/${encodeURIComponent(district_code)}`);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

// ── Admin — Branch Roles ──────────────────────────────────────────────────────

export interface BranchRole {
  id: number;
  branch_role_id: string; // The specific slug/key
  rolename: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBranchRolePayload {
  branch_role_id: string;
  rolename: string;
}

export type UpdateBranchRolePayload = Partial<CreateBranchRolePayload>;

export async function fetchBranchRoles(): Promise<BranchRole[]> {
  const res = await get("/admin/branch-roles");
  if (!res.ok) throw new Error(`Failed to fetch branch roles: ${res.status}`);
  const body = await res.json();
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.data)) return body.data;
  return [];
}

export async function fetchBranchRolesDropdown(): Promise<BranchRole[]> {
  const res = await get("/admin/branch-roles/dropdown");
  if (!res.ok) throw new Error(`Failed to fetch branch roles dropdown: ${res.status}`);
  const body = await res.json();
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.data)) return body.data;
  return [];
}

export async function fetchBranchRole(id: number): Promise<BranchRole> {
  const res = await get(`/admin/branch-roles/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch branch role: ${res.status}`);
  const body = await res.json();
  return body.data ?? body;
}

export async function createBranchRole(payload: CreateBranchRolePayload): Promise<BranchRole> {
  const res = await post("/admin/branch-roles", payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body.data ?? body;
}

export async function updateBranchRole(id: number, payload: UpdateBranchRolePayload): Promise<BranchRole> {
  const res = await put(`/admin/branch-roles/${id}`, payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body.data ?? body;
}

export async function deleteBranchRole(id: number): Promise<{ message: string }> {
  const res = await del(`/admin/branch-roles/${id}`);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

// ── Admin — App Statuses ──────────────────────────────────────────────────────

export interface AppStatus {
  id: number;
  status_code: string;
  status_name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAppStatusPayload {
  status_code: string;
  status_name: string;
  is_default?: boolean;
}

export type UpdateAppStatusPayload = Partial<CreateAppStatusPayload>;

export async function fetchAppStatuses(params?: { search?: string; page?: number; per_page?: number }): Promise<{ data: AppStatus[]; current_page: number; last_page: number; total: number; per_page: number }> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.per_page) qs.set("per_page", String(params.per_page));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const res = await get(`/admin/app-statuses${query}`);
  if (!res.ok) throw new Error(`Failed to fetch app statuses: ${res.status}`);
  const body = await res.json();
  // Response shape: { status, data: { current_page, data: [], per_page, total } }
  if (body.data?.data && Array.isArray(body.data.data)) return body.data;
  const arr = Array.isArray(body) ? body : Array.isArray(body.data) ? body.data : [];
  return { data: arr, current_page: 1, last_page: 1, total: arr.length, per_page: arr.length };
}

export async function fetchAppStatusesDropdown(): Promise<AppStatus[]> {
  const res = await get("/admin/app-statuses/dropdown");
  if (!res.ok) throw new Error(`Failed to fetch app statuses dropdown: ${res.status}`);
  const body = await res.json();
  if (Array.isArray(body)) return body;
  if (body.data && Array.isArray(body.data)) return body.data;
  return [];
}

export async function fetchAppStatus(status_code: string): Promise<AppStatus> {
  const res = await get(`/admin/app-statuses/${status_code}`);
  if (!res.ok) throw new Error(`Failed to fetch app status: ${res.status}`);
  const body = await res.json();
  return body.data ?? body;
}

export async function createAppStatus(payload: CreateAppStatusPayload): Promise<AppStatus | MakerResponseBody> {
  const res = await post("/admin/app-statuses", payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body.data ?? body;
}

export async function updateAppStatus(status_code: string, payload: UpdateAppStatusPayload): Promise<AppStatus | MakerResponseBody> {
  const res = await put(`/admin/app-statuses/${status_code}`, payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body.data ?? body;
}

export async function deleteAppStatus(status_code: string): Promise<{ message: string } | MakerResponseBody> {
  const res = await del(`/admin/app-statuses/${status_code}`);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

// ── Admin — Loan Products ──────────────────────────────────────────────────────

export interface LoanProduct {
  id: number;
  product_name: string;
  min_age_salaried: number;
  max_age_salaried: number;
  min_age_self_employed: number;
  max_age_self_employed: number;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
  created_by?: number | null;
  updated_by?: number | null;
}

export interface CreateLoanProductPayload {
  product_name: string;
  min_age_salaried: number;
  max_age_salaried: number;
  min_age_self_employed: number;
  max_age_self_employed: number;
  status: "active" | "inactive";
}

export type UpdateLoanProductPayload = Partial<CreateLoanProductPayload>;

export async function fetchLoanProducts(): Promise<LoanProduct[]> {
  const res = await get("/admin/loan-products");
  if (!res.ok) throw new Error(`Failed to fetch loan products: ${res.status}`);
  const body = await res.json();
  if (Array.isArray(body)) return body;
  if (body.data?.data && Array.isArray(body.data.data)) return body.data.data;
  if (Array.isArray(body.data)) return body.data;
  return [];
}

export async function createLoanProduct(
  payload: CreateLoanProductPayload,
): Promise<{ status: string; message: string; data: LoanProduct }> {
  const res = await post("/admin/loan-products", payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

export async function updateLoanProduct(
  id: number,
  payload: UpdateLoanProductPayload,
): Promise<{ status: string; message: string; data: LoanProduct }> {
  const res = await put(`/admin/loan-products/${id}`, payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

export async function deleteLoanProduct(
  id: number,
): Promise<{ status: string; message: string }> {
  const res = await del(`/admin/loan-products/${id}`);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

// ── Admin — Loan Schemes ───────────────────────────────────────────────────────

export interface LoanScheme {
  id: number;
  product_id: number;
  scheme_name: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
  created_by?: number | null;
  updated_by?: number | null;
}

export interface CreateLoanSchemePayload {
  scheme_name: string;
  status: "active" | "inactive";
}

export type UpdateLoanSchemePayload = Partial<CreateLoanSchemePayload>;

export async function fetchLoanSchemes(productId: number): Promise<LoanScheme[]> {
  const res = await get(`/admin/loan-products/${productId}/schemes`);
  if (!res.ok) throw new Error(`Failed to fetch loan schemes: ${res.status}`);
  const body = await res.json();
  if (Array.isArray(body)) return body;
  if (body.data?.data && Array.isArray(body.data.data)) return body.data.data;
  if (Array.isArray(body.data)) return body.data;
  return [];
}

export async function createLoanScheme(
  productId: number,
  payload: CreateLoanSchemePayload,
): Promise<{ status: string; message: string; data: LoanScheme }> {
  const res = await post(`/admin/loan-products/${productId}/schemes`, payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

export async function updateLoanScheme(
  productId: number,
  schemeId: number,
  payload: UpdateLoanSchemePayload,
): Promise<{ status: string; message: string; data: LoanScheme }> {
  const res = await put(`/admin/loan-products/${productId}/schemes/${schemeId}`, payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

export async function deleteLoanScheme(
  productId: number,
  schemeId: number,
): Promise<{ status: string; message: string }> {
  const res = await del(`/admin/loan-products/${productId}/schemes/${schemeId}`);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

// ── Admin — Loan Slabs ─────────────────────────────────────────────────────────

export interface LoanSlab {
  id: number;
  product_id: number;
  scheme_id?: number | null;
  min_amount: number;
  max_amount: number;
  interest_rate: number;
  min_tenure_months: number;
  max_tenure_months: number;
  processing_fee_pct: number;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface CreateLoanSlabPayload {
  scheme_id?: number | null;
  min_amount: number;
  max_amount: number;
  interest_rate: number;
  min_tenure_months: number;
  max_tenure_months: number;
  processing_fee_pct: number;
  status: "active" | "inactive";
}

export type UpdateLoanSlabPayload = Partial<CreateLoanSlabPayload>;

export async function fetchLoanSlabs(
  productId: number,
  schemeId?: number,
): Promise<LoanSlab[]> {
  const qs = schemeId ? `?scheme_id=${schemeId}` : "";
  const res = await get(`/admin/loan-products/${productId}/slabs${qs}`);
  if (!res.ok) throw new Error(`Failed to fetch loan slabs: ${res.status}`);
  const body = await res.json();
  if (Array.isArray(body)) return body;
  if (body.data?.data && Array.isArray(body.data.data)) return body.data.data;
  if (Array.isArray(body.data)) return body.data;
  return [];
}

export async function createLoanSlab(
  productId: number,
  payload: CreateLoanSlabPayload,
): Promise<{ status: string; message: string; data: LoanSlab }> {
  const res = await post(`/admin/loan-products/${productId}/slabs`, payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

export async function updateLoanSlab(
  productId: number,
  slabId: number,
  payload: UpdateLoanSlabPayload,
): Promise<{ status: string; message: string; data: LoanSlab }> {
  const res = await put(`/admin/loan-products/${productId}/slabs/${slabId}`, payload);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

export async function deleteLoanSlab(
  productId: number,
  slabId: number,
): Promise<{ status: string; message: string }> {
  const res = await del(`/admin/loan-products/${productId}/slabs/${slabId}`);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

// ── Admin — Product Config Approval ───────────────────────────────────────────

export async function saveLoanProductDraft(
  productId: number,
  comment: string,
): Promise<{ status: string; message: string }> {
  const res = await post(`/admin/loan-products/${productId}/save-draft`, { comment });
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

export async function submitLoanProductForApproval(
  productId: number,
  maker_comment: string,
): Promise<{ status: string; message: string }> {
  const res = await post(`/admin/loan-products/${productId}/submit-for-approval`, {
    maker_comment,
  });
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

// ── Admin — User-Branch Mappings ──────────────────────────────────────────────

export interface UserBranchMapping {
  id: number;
  user_id: number;
  branch_code: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  user?: { id: number; name: string; email: string };
  branch?: { id: number; branch_code: string; branch_name: string };
}

export interface PaginatedUserBranchMappings {
  data: UserBranchMapping[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface BulkBranchAssignResult {
  created: UserBranchMapping[];
  skipped: string[];
  errors: string[];
  summary: {
    total: number;
    created_count: number;
    skipped_count: number;
    error_count: number;
  };
}

export interface CsvUploadResult {
  created: UserBranchMapping[];
  skipped: string[];
  errors: string[];
  summary: {
    total_lines: number;
    created_count: number;
    skipped_count: number;
    error_count: number;
  };
}

/** GET /admin/user-branch-mappings?user_id=X — get all mappings (optionally filtered) */
export async function fetchUserBranchMappings(params?: {
  user_id?: number;
  branch_code?: string;
  search?: string;
  per_page?: number;
  page?: number;
}): Promise<{ status: string; data: PaginatedUserBranchMappings }> {
  const qs = new URLSearchParams();
  if (params?.user_id) qs.set("user_id", String(params.user_id));
  if (params?.branch_code) qs.set("branch_code", params.branch_code);
  if (params?.search) qs.set("search", params.search);
  if (params?.per_page) qs.set("per_page", String(params.per_page));
  if (params?.page) qs.set("page", String(params.page));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const res = await get(`/admin/user-branch-mappings${query}`);
  if (!res.ok) throw new Error(`Failed to fetch user-branch mappings: ${res.status}`);
  return res.json();
}

/** GET /admin/user-branch-mappings/user/{userId} — get branches for a user */
export async function fetchUserBranches(
  userId: number,
): Promise<{ status: string; data: UserBranchMapping[] }> {
  const res = await get(`/admin/user-branch-mappings/user/${userId}`);
  if (!res.ok) throw new Error(`Failed to fetch user branches: ${res.status}`);
  return res.json();
}

/** POST /admin/user-branch-mappings — create a single mapping */
export async function createUserBranchMapping(
  user_id: number,
  branch_code: string,
): Promise<{ status: string; message: string; data: UserBranchMapping }> {
  const res = await post("/admin/user-branch-mappings", { user_id, branch_code });
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

/** POST /admin/user-branch-mappings/bulk — bulk assign comma-separated branch codes */
export async function bulkAssignUserBranches(
  user_id: number,
  branch_codes: string,
): Promise<{ status: string; message: string; data: BulkBranchAssignResult }> {
  const res = await post("/admin/user-branch-mappings/bulk", { user_id, branch_codes });
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

/** POST /admin/user-branch-mappings/upload-csv — upload a CSV file */
export async function uploadUserBranchMappingCsv(
  file: File,
): Promise<{ status: string; message: string; data: CsvUploadResult }> {
  const res = await handleMockRequest("/admin/user-branch-mappings/upload-csv", "POST", { file_name: file.name });
  return res.json();
}

/** DELETE /admin/user-branch-mappings/{id} — soft-delete a mapping */
export async function deleteUserBranchMapping(
  mappingId: number,
): Promise<{ status: string; message: string }> {
  const res = await del(`/admin/user-branch-mappings/${mappingId}`);
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

