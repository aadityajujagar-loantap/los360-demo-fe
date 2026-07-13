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

export type CreateMasterValuePayload = Omit<MasterValue, "id" | "created_at" | "updated_at">;
export type UpdateMasterValuePayload = Partial<CreateMasterValuePayload>;
