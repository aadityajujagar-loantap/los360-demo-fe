export interface State {
  id: string;
  state_code: string;
  state_name: string;
  created_at: string;
}

export interface District {
  id: string;
  state_id: string;
  district_code: string;
  district_name: string;
  created_at: string;
}

export interface Branch {
  id: string;
  branch_code: string;
  branch_name: string;
  branch_number: string;
  region_id: string;
  region_name?: string;
  sub_region_id: string;
  sub_region_name?: string;
  district_id: string;
  district_name?: string;
  created_at: string;
}

export type CreateBranchPayload = Omit<Branch, "id" | "created_at">;
