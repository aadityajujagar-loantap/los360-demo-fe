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
