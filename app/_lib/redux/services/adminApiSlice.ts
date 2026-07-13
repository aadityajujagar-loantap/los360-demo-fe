// app/_lib/redux/services/adminApiSlice.ts
import { apiSlice } from "./apiSlice";
import { orgs } from "@/app/_config/orgs";
import {
  User,
  PaginatedUsers,
  CreateUserPayload,
  UpdateUserPayload,
  Permission,
  CreatePermissionPayload,
  UpdatePermissionPayload,
  Role,
  CreateRolePayload,
  UpdateRolePayload,
  RoleRef,
  CaptchaResponse,
  MakerRequest,
  PaginatedMakerRequests,
  MakerRequestFilters,
  ProcessJourneyStepPayload,
  ProcessJourneyStepResponse,
  Region,
  PaginatedRegions,
  CreateRegionPayload,
  UpdateRegionPayload,
  SubRegion,
  PaginatedSubRegions,
  CreateSubRegionPayload,
  UpdateSubRegionPayload,
  MasterValue,
  PaginatedMasterValues,
  CreateMasterValuePayload,
  UpdateMasterValuePayload,
  Branch,
  PaginatedBranches,
  CreateBranchPayload,
  UpdateBranchPayload,
  BranchFilters,
  State,
  PaginatedStates,
  CreateStatePayload,
  UpdateStatePayload,
  District,
  PaginatedDistricts,
  CreateDistrictPayload,
  UpdateDistrictPayload,
  MakerResponseBody,
  LoanApplicationReportFilters,
  PaginatedLoanApplications,
  LoanApplicationFilterOptions,
} from "./types";

export const adminApiSlice = apiSlice?.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    loginUser: builder.mutation<any, any>({
      query: (data) => ({ url: "/auth/login", method: "POST", body: data }),
    }),
    verifyOtp: builder.mutation<any, any>({
      query: (data) => ({ url: "/auth/verify-otp", method: "POST", body: data }),
    }),
    logoutUser: builder.mutation<void, void>({
      query: () => ({ url: "/logout", method: "POST" }),
    }),
    registerUser: builder.mutation<any, any>({
      query: (data) => ({ url: "/register", method: "POST", body: data }),
    }),
    getCaptcha: builder.query<CaptchaResponse, number | void>({
      query: (requestId) =>
        requestId ? `/auth/captcha?_=${requestId}` : "/auth/captcha",
    }),

    // Users
    getUsers: builder.query<
      { status: string; data: PaginatedUsers },
      { page?: number; per_page?: number; status?: string } | void
    >({
      query: (params) => {
        const query = new URLSearchParams();
        if (params?.page) query.set("page", String(params.page));
        if (params?.per_page) query.set("per_page", String(params.per_page));
        if (params?.status) query.set("status", params.status);
        const qs = query.toString() ? `?${query.toString()}` : "";
        return `/admin/users${qs}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.data.map(({ id }: { id: number }) => ({
                type: "User" as const,
                id,
              })),
              { type: "User", id: "LIST" },
            ]
          : [{ type: "User", id: "LIST" }],
    }),
    getUser: builder.query<{ status: string; data: User }, number>({
      query: (id) => `/admin/users/${id}`,
      providesTags: (_result, _error, id) => [{ type: "User", id }],
    }),
    createUser: builder.mutation<
      { status: string; message: string; data: User },
      CreateUserPayload
    >({
      query: (payload) => ({
        url: "/admin/users",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),
    updateUser: builder.mutation<
      { status: string; message: string; data: User },
      { id: number; payload: UpdateUserPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/admin/users/${id}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
    }),
    deactivateUser: builder.mutation<
      { status: string; message: string },
      number
    >({
      query: (id) => ({ url: `/admin/users/${id}/deactivate`, method: "POST" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
    }),
    reactivateUser: builder.mutation<
      { status: string; message: string },
      number
    >({
      query: (id) => ({ url: `/admin/users/${id}/reactivate`, method: "POST" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
    }),
    deleteUser: builder.mutation<{ status: string; message: string }, number>({
      query: (id) => ({ url: `/admin/users/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),

    // Permissions
    getPermissions: builder.query<Permission[], void>({
      query: () => "/admin/permissions",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Permission" as const, id })),
              { type: "Permission", id: "LIST" },
            ]
          : [{ type: "Permission", id: "LIST" }],
    }),
    createPermission: builder.mutation<Permission, CreatePermissionPayload>({
      query: (payload) => ({
        url: "/admin/permissions",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: [{ type: "Permission", id: "LIST" }],
    }),
    updatePermission: builder.mutation<
      Permission,
      { id: number; payload: UpdatePermissionPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/admin/permissions/${id}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Permission", id },
        { type: "Permission", id: "LIST" },
      ],
    }),
    deletePermission: builder.mutation<{ message: string }, number>({
      query: (id) => ({ url: `/admin/permissions/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Permission", id: "LIST" }],
    }),

    // Roles
    getRoles: builder.query<Role[], void>({
      query: () => "/admin/roles",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Role" as const, id })),
              { type: "Role", id: "LIST" },
            ]
          : [{ type: "Role", id: "LIST" }],
    }),
    createRole: builder.mutation<Role, CreateRolePayload>({
      query: (payload) => ({
        url: "/admin/roles",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: [{ type: "Role", id: "LIST" }],
    }),
    updateRole: builder.mutation<
      Role,
      { id: number; payload: UpdateRolePayload }
    >({
      query: ({ id, payload }) => ({
        url: `/admin/roles/${id}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Role", id },
        { type: "Role", id: "LIST" },
      ],
    }),
    deleteRole: builder.mutation<{ message: string }, number>({
      query: (id) => ({ url: `/admin/roles/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Role", id: "LIST" }],
    }),

    // Role-Permissions Sync
    syncRolePermissions: builder.mutation<
      Role,
      { roleId: number; permissions: string[] }
    >({
      query: ({ roleId, permissions }) => ({
        url: `/admin/roles/${roleId}/permissions`,
        method: "POST",
        body: { permissions },
      }),
      invalidatesTags: (_result, _error, { roleId }) => [
        { type: "Role", id: roleId },
      ],
    }),

    // User Roles
    getUserRoles: builder.query<RoleRef[], number>({
      query: (userId) => `/admin/users/${userId}/roles`,
      providesTags: (_result, _error, userId) => [{ type: "User", id: userId }],
    }),
    assignUserRoles: builder.mutation<
      User,
      { userId: number; roles: string[] }
    >({
      query: ({ userId, roles }) => ({
        url: `/admin/users/${userId}/roles`,
        method: "POST",
        body: { roles },
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: "User", id: userId },
      ],
    }),

    // Maker-Checker
    getMakerRequests: builder.query<
      PaginatedMakerRequests,
      MakerRequestFilters | void
    >({
      query: (filters) => {
        const params = new URLSearchParams();
        if (filters?.group) params.set("group", filters.group);
        if (filters?.action_type)
          params.set("action_type", filters.action_type);
        if (filters?.status) params.set("status", filters.status);
        if (filters?.requested_by)
          params.set("requested_by", String(filters.requested_by));
        if (filters?.per_page) params.set("per_page", String(filters.per_page));
        if (filters?.page) params.set("page", String(filters.page));
        const qs = params.toString() ? `?${params.toString()}` : "";
        return `/admin/maker-requests${qs}`;
      },
      transformResponse: (response: any): PaginatedMakerRequests => {
        const payload = response?.data ?? response;
        return {
          data: payload.data ?? (Array.isArray(payload) ? payload : []),
          current_page: payload.current_page ?? 1,
          last_page: payload.last_page ?? 1,
          per_page: payload.per_page ?? 15,
          total: payload.total ?? 0,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((r) => ({
                type: "MakerRequest" as const,
                id: r.uuid,
              })),
              { type: "MakerRequest", id: "LIST" },
            ]
          : [{ type: "MakerRequest", id: "LIST" }],
    }),
    approveMakerRequest: builder.mutation<
      { message: string; maker_request: MakerRequest; result: any },
      string
    >({
      query: (uuid) => ({
        url: `/admin/maker-requests/${uuid}/approve`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, uuid) => [
        { type: "MakerRequest", id: uuid },
        { type: "MakerRequest", id: "LIST" },
      ],
    }),
    rejectMakerRequest: builder.mutation<
      { message: string },
      { uuid: string; rejection_reason: string }
    >({
      query: ({ uuid, rejection_reason }) => ({
        url: `/admin/maker-requests/${uuid}/reject`,
        method: "POST",
        body: { rejection_reason },
      }),
      invalidatesTags: (_result, _error, { uuid }) => [
        { type: "MakerRequest", id: uuid },
        { type: "MakerRequest", id: "LIST" },
      ],
    }),
    getMakerRequest: builder.query<MakerRequest, string>({
      query: (uuid) => `/admin/maker-requests/${uuid}`,
      transformResponse: (response: any): MakerRequest =>
        response?.data ?? response,
      providesTags: (_result, _error, uuid) => [
        { type: "MakerRequest", id: uuid },
      ],
    }),

    // Regions
    getRegions: builder.query<
      PaginatedRegions,
      { search?: string; page?: number; per_page?: number } | void
    >({
      query: (params) => {
        const qs = new URLSearchParams();
        if (params?.search) qs.set("search", params.search);
        if (params?.page) qs.set("page", String(params.page));
        if (params?.per_page) qs.set("per_page", String(params.per_page));
        const query = qs.toString() ? `?${qs.toString()}` : "";
        return `/admin/regions${query}`;
      },
      transformResponse: (response: any): PaginatedRegions => {
        const payload = response?.data ?? response;
        const dataArr =
          payload.data?.data ??
          (Array.isArray(payload.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : []);
        return {
          data: dataArr,
          current_page: payload.current_page ?? 1,
          last_page: payload.last_page ?? 1,
          total: payload.total ?? dataArr.length,
          per_page: payload.per_page ?? dataArr.length,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ region_code }) => ({
                type: "Region" as const,
                id: region_code,
              })),
              { type: "Region", id: "LIST" },
            ]
          : [{ type: "Region", id: "LIST" }],
    }),
    getRegionsDropdown: builder.query<Region[], void>({
      query: () => "/admin/regions/dropdown",
      transformResponse: (response: any): Region[] =>
        response?.data?.data ?? response?.data ?? response ?? [],
    }),
    createRegion: builder.mutation<
      Region | MakerResponseBody,
      CreateRegionPayload
    >({
      query: (payload) => ({
        url: "/admin/regions",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: [{ type: "Region", id: "LIST" }],
    }),
    updateRegion: builder.mutation<
      Region | MakerResponseBody,
      { region_code: string; payload: UpdateRegionPayload }
    >({
      query: ({ region_code, payload }) => ({
        url: `/admin/regions/${region_code}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (_result, _error, { region_code }) => [
        { type: "Region", id: region_code },
        { type: "Region", id: "LIST" },
      ],
    }),
    deleteRegion: builder.mutation<
      { message: string } | MakerResponseBody,
      string
    >({
      query: (region_code) => ({
        url: `/admin/regions/${region_code}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Region", id: "LIST" }],
    }),

    // Sub-Regions
    getSubRegions: builder.query<
      PaginatedSubRegions,
      {
        region_code?: string;
        search?: string;
        page?: number;
        per_page?: number;
      } | void
    >({
      query: (params) => {
        const qs = new URLSearchParams();
        if (params?.region_code) qs.set("region_code", params.region_code);
        if (params?.search) qs.set("search", params.search);
        if (params?.page) qs.set("page", String(params.page));
        if (params?.per_page) qs.set("per_page", String(params.per_page));
        const query = qs.toString() ? `?${qs.toString()}` : "";
        return `/admin/sub-regions${query}`;
      },
      transformResponse: (response: any): PaginatedSubRegions => {
        const payload = response?.data ?? response;
        const dataArr =
          payload.data?.data ??
          (Array.isArray(payload.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : []);
        return {
          data: dataArr,
          current_page: payload.current_page ?? 1,
          last_page: payload.last_page ?? 1,
          total: payload.total ?? dataArr.length,
          per_page: payload.per_page ?? dataArr.length,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ sub_region_code }) => ({
                type: "SubRegion" as const,
                id: sub_region_code,
              })),
              { type: "SubRegion", id: "LIST" },
            ]
          : [{ type: "SubRegion", id: "LIST" }],
    }),
    getSubRegionsDropdown: builder.query<SubRegion[], string | void>({
      query: (region_code) =>
        `/admin/sub-regions/dropdown${region_code ? `?region_code=${region_code}` : ""}`,
      transformResponse: (response: any): SubRegion[] =>
        response?.data?.data ?? response?.data ?? response ?? [],
    }),
    createSubRegion: builder.mutation<
      SubRegion | MakerResponseBody,
      CreateSubRegionPayload
    >({
      query: (payload) => ({
        url: "/admin/sub-regions",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: [{ type: "SubRegion", id: "LIST" }],
    }),
    updateSubRegion: builder.mutation<
      SubRegion | MakerResponseBody,
      { sub_region_code: string; payload: UpdateSubRegionPayload }
    >({
      query: ({ sub_region_code, payload }) => ({
        url: `/admin/sub-regions/${sub_region_code}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (_result, _error, { sub_region_code }) => [
        { type: "SubRegion", id: sub_region_code },
        { type: "SubRegion", id: "LIST" },
      ],
    }),
    deleteSubRegion: builder.mutation<
      { message: string } | MakerResponseBody,
      string
    >({
      query: (sub_region_code) => ({
        url: `/admin/sub-regions/${sub_region_code}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "SubRegion", id: "LIST" }],
    }),

    // Master Values
    getMasterValues: builder.query<
      { status: string; data: PaginatedMasterValues },
      { page?: number; per_page?: number; call_type?: string } | void
    >({
      query: (params) => {
        const query = new URLSearchParams();
        if (params?.page) query.set("page", String(params.page));
        if (params?.per_page) query.set("per_page", String(params.per_page));
        if (params?.call_type) query.set("call_type", params.call_type);
        const qs = query.toString() ? `?${query.toString()}` : "";
        return `/admin/master-values${qs}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.data.map(({ id }) => ({
                type: "MasterValue" as const,
                id,
              })),
              { type: "MasterValue", id: "LIST" },
            ]
          : [{ type: "MasterValue", id: "LIST" }],
    }),
    getMasterValuesList: builder.query<MasterValue[], void>({
      query: () => "/admin/master-values/list",
      transformResponse: (response: any): MasterValue[] =>
        response?.data ?? response ?? [],
    }),
    createMasterValue: builder.mutation<
      { status: string; message: string; data: MasterValue },
      CreateMasterValuePayload
    >({
      query: (payload) => ({
        url: "/admin/master-values",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: [{ type: "MasterValue", id: "LIST" }],
    }),
    updateMasterValue: builder.mutation<
      { status: string; message: string; data: MasterValue },
      { id: number; payload: UpdateMasterValuePayload }
    >({
      query: ({ id, payload }) => ({
        url: `/admin/master-values/${id}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "MasterValue", id },
        { type: "MasterValue", id: "LIST" },
      ],
    }),
    deleteMasterValue: builder.mutation<
      { status: string; message: string },
      number
    >({
      query: (id) => ({ url: `/admin/master-values/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "MasterValue", id: "LIST" }],
    }),

    // Branches
    getBranches: builder.query<PaginatedBranches, BranchFilters | void>({
      query: (params) => {
        const qs = new URLSearchParams();
        if (params?.search) qs.set("search", params.search);
        if (params?.region_code) qs.set("region_code", params.region_code);
        if (params?.sub_region_code)
          qs.set("sub_region_code", params.sub_region_code);
        if (params?.district_code)
          qs.set("district_code", params.district_code);
        if (params?.per_page) qs.set("per_page", String(params.per_page));
        if (params?.page) qs.set("page", String(params.page));
        const query = qs.toString() ? `?${qs.toString()}` : "";
        return `/admin/branches${query}`;
      },
      transformResponse: (response: any): PaginatedBranches => {
        const payload = response?.data ?? response;
        const dataArr =
          payload.data?.data ??
          (Array.isArray(payload.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : []);
        return {
          data: dataArr,
          current_page: payload.current_page ?? 1,
          last_page: payload.last_page ?? 1,
          total: payload.total ?? dataArr.length,
          per_page: payload.per_page ?? dataArr.length,
          from: payload.from ?? 1,
          to: payload.to ?? dataArr.length,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ branch_code }) => ({
                type: "Branch" as const,
                id: branch_code,
              })),
              { type: "Branch", id: "LIST" },
            ]
          : [{ type: "Branch", id: "LIST" }],
    }),
    getBranchesDropdown: builder.query<Branch[], void>({
      query: () => "/admin/branches/dropdown",
      transformResponse: (response: any): Branch[] =>
        response?.data ?? response ?? [],
    }),
    createBranch: builder.mutation<
      Branch | MakerResponseBody,
      CreateBranchPayload
    >({
      query: (payload) => ({
        url: "/admin/branches",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: [{ type: "Branch", id: "LIST" }],
    }),
    updateBranch: builder.mutation<
      Branch | MakerResponseBody,
      { branch_code: string; payload: UpdateBranchPayload }
    >({
      query: ({ branch_code, payload }) => ({
        url: `/admin/branches/${branch_code}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (_result, _error, { branch_code }) => [
        { type: "Branch", id: branch_code },
        { type: "Branch", id: "LIST" },
      ],
    }),
    deleteBranch: builder.mutation<
      { message: string } | MakerResponseBody,
      string
    >({
      query: (branch_code) => ({
        url: `/admin/branches/${branch_code}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Branch", id: "LIST" }],
    }),

    // States
    getStates: builder.query<
      PaginatedStates,
      { search?: string; page?: number; per_page?: number } | void
    >({
      query: (params) => {
        const qs = new URLSearchParams();
        if (params?.search) qs.set("search", params.search);
        if (params?.page) qs.set("page", String(params.page));
        if (params?.per_page) qs.set("per_page", String(params.per_page));
        const query = qs.toString() ? `?${qs.toString()}` : "";
        return `/admin/states${query}`;
      },
      transformResponse: (response: any): PaginatedStates => {
        const payload = response?.data ?? response;
        const dataArr =
          payload.data?.data ??
          (Array.isArray(payload.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : []);
        return {
          data: dataArr,
          current_page: payload.current_page ?? 1,
          last_page: payload.last_page ?? 1,
          total: payload.total ?? dataArr.length,
          per_page: payload.per_page ?? dataArr.length,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ state_code }) => ({
                type: "State" as const,
                id: state_code,
              })),
              { type: "State", id: "LIST" },
            ]
          : [{ type: "State", id: "LIST" }],
    }),
    getStatesDropdown: builder.query<State[], void>({
      query: () => "/admin/states/dropdown",
      transformResponse: (response: any): State[] =>
        response?.data ?? response ?? [],
    }),
    createState: builder.mutation<
      State | MakerResponseBody,
      CreateStatePayload
    >({
      query: (payload) => ({
        url: "/admin/states",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: [{ type: "State", id: "LIST" }],
    }),
    updateState: builder.mutation<
      State | MakerResponseBody,
      { state_code: string; payload: UpdateStatePayload }
    >({
      query: ({ state_code, payload }) => ({
        url: `/admin/states/${state_code}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (_result, _error, { state_code }) => [
        { type: "State", id: state_code },
        { type: "State", id: "LIST" },
      ],
    }),
    deleteState: builder.mutation<
      { message: string } | MakerResponseBody,
      string
    >({
      query: (state_code) => ({
        url: `/admin/states/${state_code}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "State", id: "LIST" }],
    }),

    // Districts
    getDistricts: builder.query<
      PaginatedDistricts,
      {
        state_code?: string;
        search?: string;
        page?: number;
        per_page?: number;
      } | void
    >({
      query: (params) => {
        const qs = new URLSearchParams();
        if (params?.state_code) qs.set("state_code", params.state_code);
        if (params?.search) qs.set("search", params.search);
        if (params?.page) qs.set("page", String(params.page));
        if (params?.per_page) qs.set("per_page", String(params.per_page));
        const query = qs.toString() ? `?${qs.toString()}` : "";
        return `/admin/districts${query}`;
      },
      transformResponse: (response: any): PaginatedDistricts => {
        const payload = response?.data ?? response;
        const dataArr =
          payload.data?.data ??
          (Array.isArray(payload.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : []);
        return {
          data: dataArr,
          current_page: payload.current_page ?? 1,
          last_page: payload.last_page ?? 1,
          total: payload.total ?? dataArr.length,
          per_page: payload.per_page ?? dataArr.length,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ district_code }) => ({
                type: "District" as const,
                id: district_code,
              })),
              { type: "District", id: "LIST" },
            ]
          : [{ type: "District", id: "LIST" }],
    }),
    getDistrictsDropdown: builder.query<District[], string | void>({
      query: (state_code) =>
        `/admin/districts/dropdown${state_code ? `?state_code=${state_code}` : ""}`,
      transformResponse: (response: any): District[] =>
        response?.data ?? response ?? [],
    }),
    createDistrict: builder.mutation<
      District | MakerResponseBody,
      CreateDistrictPayload
    >({
      query: (payload) => ({
        url: "/admin/districts",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: [{ type: "District", id: "LIST" }],
    }),
    updateDistrict: builder.mutation<
      District | MakerResponseBody,
      { district_code: string; payload: UpdateDistrictPayload }
    >({
      query: ({ district_code, payload }) => ({
        url: `/admin/districts/${district_code}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (_result, _error, { district_code }) => [
        { type: "District", id: district_code },
        { type: "District", id: "LIST" },
      ],
    }),
    deleteDistrict: builder.mutation<
      { message: string } | MakerResponseBody,
      string
    >({
      query: (district_code) => ({
        url: `/admin/districts/${district_code}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "District", id: "LIST" }],
    }),
    
    // Reports
    getLoanApplications: builder.query<
      PaginatedLoanApplications,
      LoanApplicationReportFilters | void
    >({
      query: (params) => {
        const qs = new URLSearchParams();
        if (params?.status) qs.set("status", params.status);
        if (params?.loan_product) qs.set("loan_product", params.loan_product);
        if (params?.from_date) qs.set("from_date", params.from_date);
        if (params?.to_date) qs.set("to_date", params.to_date);
        if (params?.per_page) qs.set("per_page", String(params.per_page));
        if (params?.page) qs.set("page", String(params.page));
        const query = qs.toString() ? `?${qs.toString()}` : "";
        return `/admin/reports/loan-applications${query}`;
      },
    }),
    getLoanApplicationFilterOptions: builder.query<{ status: string; data: LoanApplicationFilterOptions }, void>({
      query: () => "/admin/reports/loan-applications/filter-options",
    }),
    exportLoanApplications: builder.query<string, LoanApplicationReportFilters | void>({
      query: (params) => {
        const qs = new URLSearchParams();
        if (params?.status) qs.set("status", params.status);
        if (params?.loan_product) qs.set("loan_product", params.loan_product);
        if (params?.from_date) qs.set("from_date", params.from_date);
        if (params?.to_date) qs.set("to_date", params.to_date);
        const query = qs.toString() ? `?${qs.toString()}` : "";
        return {
          url: `/admin/reports/loan-applications/export${query}`,
          responseHandler: (response: any) => response.text(),
          headers: {
            Accept: "text/csv",
          },
        };
      },
    }),

    downloadOfferLetter: builder.mutation<
      { status: string; data: { offer_letter_base64: string; message: string } },
      { step_key: string; loan_type: string; payload: { application_id: string; section_id: string } }
    >({
      query: (payload) => ({
        url: "v1/loan/loan-offers",
        method: "POST",
        body: payload,
      }),
    }),

    processJourneyStep: builder.mutation<
      ProcessJourneyStepResponse,
      { tenantId: string; data: ProcessJourneyStepPayload; suppressErrorToast?: boolean }
    >({
      query: ({ tenantId, data, suppressErrorToast }) => {
        const org = Object.values(orgs).find((o) => o.backendTenantId === tenantId);
        const apiToken = org?.backendAPIToken;

        return {
          url: "v1/loan/process-step",
          method: "POST",
          headers: {
            "X-Tenant-ID": tenantId,
            ...(apiToken ? { "X-API-Token": apiToken } : {}),
          },
          body: data,
          suppressErrorToast,
        };
      },
    }),

    getLoanApplication: builder.query<
      any,
      {
        tenantId: string;
        applicationId: string;
        loanType?: string;
        suppressErrorToast?: boolean;
      }
    >({
      query: ({ tenantId, applicationId, loanType, suppressErrorToast }) => {
        const org = Object.values(orgs).find((o) => o.backendTenantId === tenantId);
        const apiToken = org?.backendAPIToken;

        let qs = "";
        if (loanType) {
          qs = `?loan_type=${loanType}`;
        }

        return {
          url: `v1/loan/applications/${applicationId}${qs}`,
          method: "GET",
          suppressErrorToast,
          headers: {
            "X-Tenant-ID": tenantId,
            ...(apiToken ? { "X-API-Token": apiToken } : {}),
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
        };
      },
    }),

    // Public Dropdowns for Journey
    getPublicStates: builder.query<any[], void>({
      query: () => "states/dropdown",
      transformResponse: (response: any): any[] => {
         const d = response?.data;
         if (Array.isArray(d)) return d;
         if (Array.isArray(d?.data)) return d.data;
         if (Array.isArray(response)) return response;
         return [];
      }
    }),
    getPublicDistricts: builder.query<any[], string>({
      query: (state) => `districts/dropdown?state=${state}`,
      transformResponse: (response: any): any[] => {
         const d = response?.data;
         if (Array.isArray(d)) return d;
         if (Array.isArray(d?.data)) return d.data;
         if (Array.isArray(response)) return response;
         return [];
      }
    }),
    getPublicBranches: builder.query<any[], string>({
      query: (district) => `branches/dropdown?district=${district}`,
      transformResponse: (response: any): any[] => {
         const d = response?.data;
         if (Array.isArray(d)) return d;
         if (Array.isArray(d?.data)) return d.data;
         if (Array.isArray(response)) return response;
         return [];
      }
    }),
    getPublicMasterValues: builder.query<any[], string>({
      query: (call_type) => `master-values/dropdown?call_type=${call_type}`,
      transformResponse: (response: any): any[] => {
         const d = response?.data;
         if (Array.isArray(d)) return d;
         if (Array.isArray(d?.data)) return d.data;
         if (Array.isArray(response)) return response;
         return [];
      }
    }),
    getPublicLoanProducts: builder.query<any[], void>({
      query: () => "loan-products-list",
      transformResponse: (response: any): any[] => {
         const d = response?.data;
         if (Array.isArray(d)) return d;
         if (Array.isArray(d?.data)) return d.data;
         if (Array.isArray(response)) return response;
         return [];
      }
    }),
  }),
});

export const {
  useLoginUserMutation,
  useVerifyOtpMutation,
  useLogoutUserMutation,
  useRegisterUserMutation,
  useGetCaptchaQuery,
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeactivateUserMutation,
  useReactivateUserMutation,
  useDeleteUserMutation,
  useGetPermissionsQuery,
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
  useDeletePermissionMutation,
  useGetRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useSyncRolePermissionsMutation,
  useGetUserRolesQuery,
  useAssignUserRolesMutation,
  useGetMakerRequestsQuery,
  useGetMakerRequestQuery,
  useApproveMakerRequestMutation,
  useRejectMakerRequestMutation,
  useGetRegionsQuery,
  useGetRegionsDropdownQuery,
  useCreateRegionMutation,
  useUpdateRegionMutation,
  useDeleteRegionMutation,
  useGetSubRegionsQuery,
  useGetSubRegionsDropdownQuery,
  useCreateSubRegionMutation,
  useUpdateSubRegionMutation,
  useDeleteSubRegionMutation,
  useGetMasterValuesQuery,
  useGetMasterValuesListQuery,
  useCreateMasterValueMutation,
  useUpdateMasterValueMutation,
  useDeleteMasterValueMutation,
  useGetBranchesQuery,
  useGetBranchesDropdownQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useDeleteBranchMutation,
  useGetStatesQuery,
  useGetStatesDropdownQuery,
  useCreateStateMutation,
  useUpdateStateMutation,
  useDeleteStateMutation,
  useGetDistrictsQuery,
  useGetDistrictsDropdownQuery,
  useCreateDistrictMutation,
  useUpdateDistrictMutation,
  useDeleteDistrictMutation,
  useDownloadOfferLetterMutation,
  useProcessJourneyStepMutation,
  useGetPublicStatesQuery,
  useGetPublicDistrictsQuery,
  useGetPublicBranchesQuery,
  useGetPublicMasterValuesQuery,
  useGetPublicLoanProductsQuery,
  useGetLoanApplicationsQuery,
  useGetLoanApplicationQuery,
  useLazyGetLoanApplicationQuery,
  useGetLoanApplicationFilterOptionsQuery,
  useLazyExportLoanApplicationsQuery,
} = adminApiSlice;
