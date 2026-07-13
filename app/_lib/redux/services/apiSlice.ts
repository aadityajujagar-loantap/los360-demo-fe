import { createApi } from "@reduxjs/toolkit/query/react";
import { mockBaseQuery } from "@/app/_lib/mockBackend";

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: mockBaseQuery,
  tagTypes: [
    "User",
    "Role",
    "Permission",
    "MakerRequest",
    "Region",
    "SubRegion",
    "MasterValue",
    "Branch",
    "State",
    "District",
  ],
  endpoints: () => ({}),
});
