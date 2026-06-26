export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";

const TOKEN_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";

let refreshPromise: Promise<string | null> | null = null;

function getStoredToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
}

function getStoredRefreshToken(): string | null {
  return typeof window !== "undefined"
    ? localStorage.getItem(REFRESH_KEY)
    : null;
}

export function storeTokens(access: string, refresh: string): void {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem("user");
}

export async function logoutSession(): Promise<void> {
  const accessToken = getStoredToken();
  const refreshToken = getStoredRefreshToken();
  if (!accessToken) return;

  try {
    await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        refreshToken: refreshToken ?? undefined,
      }),
    });
  } catch {
    // Best-effort server logout; local session is always cleared afterward.
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    storeTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

async function ensureValidToken(): Promise<string | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const [, payload] = token.split(".");
    const { exp } = JSON.parse(atob(payload));
    const expiresAt = exp * 1000;
    const bufferMs = 60_000;
    if (Date.now() < expiresAt - bufferMs) return token;
  } catch {
    return token;
  }

  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export type OnUnauthorized = () => void;
let onUnauthorized: OnUnauthorized | null = null;

export function setOnUnauthorized(cb: OnUnauthorized): void {
  onUnauthorized = cb;
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = await ensureValidToken();
  const isFormData = init?.body instanceof FormData;

  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: { ...headers, ...(init?.headers as Record<string, string>) },
  });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${refreshed}`;
      const retry = await fetch(`${BACKEND_URL}${path}`, {
        ...init,
        cache: "no-store",
        headers: { ...headers, ...(init?.headers as Record<string, string>) },
      });
      if (retry.ok) {
        if (retry.status === 204) return undefined as T;
        return retry.json() as Promise<T>;
      }
    }
    clearTokens();
    onUnauthorized?.();
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Backend request failed: ${response.status}${body ? ` - ${body}` : ""}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}
