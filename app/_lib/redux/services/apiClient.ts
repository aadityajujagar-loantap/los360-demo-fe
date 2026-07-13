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
