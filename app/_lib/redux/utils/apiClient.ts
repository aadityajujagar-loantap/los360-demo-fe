import { handleMockRequest } from "@/app/_lib/mockBackend";

export async function post(
  endpoint: string,
  data: any,
  _headers: Record<string, string> = {},
) {
  return handleMockRequest(endpoint, "POST", data);
}

export async function get(
  endpoint: string,
  _headers: Record<string, string> = {},
) {
  return handleMockRequest(endpoint, "GET");
}

export async function put(
  endpoint: string,
  data: any,
  _headers: Record<string, string> = {},
) {
  return handleMockRequest(endpoint, "PUT", data);
}

export async function del(
  endpoint: string,
  _headers: Record<string, string> = {},
) {
  return handleMockRequest(endpoint, "DELETE");
}

export async function postNBFC(
  endpoint: string,
  data: any,
  _headers: Record<string, string> = {},
) {
  return handleMockRequest(endpoint, "POST", data);
}

export async function getApplicationQueries(applicationId: string) {
  return get(`/applications/${applicationId}/queries`);
}

export async function resolveApplicationQuery(
  applicationId: string,
  queryId: string | number,
  data: { resolution_message: string; resolved_by?: string },
) {
  return post(`/applications/${applicationId}/queries/${queryId}/resolve`, data);
}

export async function respondApplicationQuery(
  applicationId: string,
  queryId: string | number,
  data: { response_message: string; responded_by?: string },
) {
  return post(`/applications/${applicationId}/queries/${queryId}/respond`, data);
}
