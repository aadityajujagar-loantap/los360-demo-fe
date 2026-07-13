export interface BranchRole {
  id: number;
  branch_role_id: string; // The slug/id used in routes
  rolename: string;
  created_at?: string;
  updated_at?: string;
}

export type CreateBranchRolePayload = {
  branch_role_id: string;
  rolename: string;
};
