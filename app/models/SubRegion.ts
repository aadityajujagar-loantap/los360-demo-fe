export interface SubRegion {
  id: string;
  region_id: string; // Foreign key to Region
  region_code?: string; // For display
  sub_region_code: string;
  sub_region_name: string;
  created_at: string;
}

export type CreateSubRegionPayload = Omit<SubRegion, "id" | "created_at">;
