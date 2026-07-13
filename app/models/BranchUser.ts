export interface BranchLevelUser {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  branch_name: string;
  branch_role: string;
  region: string;
  sub_region: string;
  sub_region_code: string;
  password?: string;
  status: "active" | "deactivated";
  created_at: string;
}

export interface BranchUserDetails {
  id: string;
  user_id: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  date_of_birth: string;
  gender: "male" | "female" | "other";
  identity_proof_type: "aadhaar" | "pan" | "voter_id" | "driving_license";
  identity_proof_no: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  notes?: string;
  updated_at: string;
}

export interface CreateBranchUserPayload {
  user: Omit<BranchLevelUser, "id" | "status" | "created_at">;
  details: Omit<BranchUserDetails, "id" | "user_id" | "updated_at">;
}
