export interface AppStatus {
  id: number;
  status_code: string; // Used in routes
  status_name: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export type CreateAppStatusPayload = {
  status_code: string;
  status_name: string;
  is_default?: boolean;
};
