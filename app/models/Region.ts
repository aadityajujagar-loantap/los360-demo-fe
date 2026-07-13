export interface Region {
  id: string;
  region_code: string;
  region_name: string;
  created_at: string;
}

export type CreateRegionPayload = Omit<Region, "id" | "created_at">;
