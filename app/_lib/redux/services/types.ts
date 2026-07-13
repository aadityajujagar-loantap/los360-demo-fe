// app/_lib/redux/services/types.ts

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
  otp_reference_id?: string;
  captcha?: string;
  captcha_key?: string;
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

// ── Regions ──────────────────────────────────────────────────────────────────
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

// ── Sub-Regions ──────────────────────────────────────────────────────────────
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

export interface PaginatedSubRegions {
  data: SubRegion[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// ── Master Values ────────────────────────────────────────────────────────────
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

// ── Branches ─────────────────────────────────────────────────────────────────
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

// ── States ───────────────────────────────────────────────────────────────────
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

export interface PaginatedStates {
  data: State[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// ── Districts ─────────────────────────────────────────────────────────────────
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

export interface PaginatedDistricts {
  data: District[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
// ── Reports ──────────────────────────────────────────────────────────────────
export interface LoanApplicationReportItem {
  lapp_id: string;
  stage: string;
  status: string;
  first_name: string;
  last_name: string;
  mobile: string;
  cif_no: string;
  loan_product: string;
  loan_scheme: string;
  loan_amount_requested: string;
  sanction_amount: string;
  eligible_roi: string;
  eligible_emi: string;
  eligible_tenure: string;
  score: string;
  branch: string;
  state: string;
  district: string;
  application_date: string;
}

export interface LoanApplicationReportFilters {
  status?: string;
  loan_product?: string;
  from_date?: string;
  to_date?: string;
  per_page?: number;
  page?: number;
}

export interface PaginatedLoanApplications {
  data: LoanApplicationReportItem[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}

export interface LoanApplicationFilterOptions {
  statuses: string[];
  loan_products: string[];
}
