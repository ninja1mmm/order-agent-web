export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";

export type OnUnauthorized = () => void;
let onUnauthorized: OnUnauthorized | null = null;

export function setOnUnauthorized(cb: OnUnauthorized): void {
  onUnauthorized = cb;
}

export function redirectToLogin(): void {
  window.location.href = `${BACKEND_URL}/auth/login`;
}

export async function logoutSession(): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Best-effort server logout
  }
}

async function authenticatedFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const isFormData = init?.body instanceof FormData;
  const url = `${BACKEND_URL}${path}`;
  const method = init?.method ?? "GET";

  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      cache: "no-store",
      credentials: "include",
      headers: { ...headers, ...(init?.headers as Record<string, string>) },
    });
  } catch (err) {
    throw new Error(
      `Network request failed: ${method} ${url}${err instanceof Error ? ` - ${err.message}` : ""}`,
    );
  }

  if (response.status === 401) {
    onUnauthorized?.();
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Backend request failed: ${response.status}${body ? ` - ${body}` : ""}`,
    );
  }

  return response;
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await authenticatedFetch(path, init);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function apiBlobRequest(
  path: string,
  init?: RequestInit,
): Promise<Blob> {
  const response = await authenticatedFetch(path, init);
  return response.blob();
}
