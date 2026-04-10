/**
 * Client-side auth for the Automerge sync server.
 * Handles device registration, token storage, and authenticated requests.
 */

const TOKEN_KEY = "scratchpad-sync-token";
const DEVICE_ID_KEY = "scratchpad-sync-device-id";

const SYNC_SERVER_HTTP = (import.meta.env.VITE_SYNC_SERVER_URL || "ws://localhost:3030")
  .replace(/^ws/, "http");

export interface AuthState {
  status: "authenticated" | "needs-registration" | "checking";
  token?: string;
  deviceId?: string;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredDeviceId(): string | null {
  return localStorage.getItem(DEVICE_ID_KEY);
}

export async function checkAuthStatus(): Promise<AuthState> {
  try {
    const res = await fetch(`${SYNC_SERVER_HTTP}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { status: "needs-registration" };

    const health = await res.json();
    if (!health.authEnabled) {
      return { status: "authenticated" };
    }

    const token = getStoredToken();
    if (!token) return { status: "needs-registration" };

    const check = await fetch(`${SYNC_SERVER_HTTP}/auth/devices`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });

    if (check.ok) {
      return { status: "authenticated", token, deviceId: getStoredDeviceId() ?? undefined };
    }

    clearAuth();
    return { status: "needs-registration" };
  } catch {
    const token = getStoredToken();
    if (token) {
      return { status: "authenticated", token, deviceId: getStoredDeviceId() ?? undefined };
    }
    return { status: "needs-registration" };
  }
}

export async function registerDevice(
  deviceName: string,
  registrationKey: string
): Promise<{ token: string; deviceId: string }> {
  const res = await fetch(`${SYNC_SERVER_HTTP}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceName, registrationKey }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Registration failed" }));
    throw new Error(error.error || `Registration failed (${res.status})`);
  }

  const { jwt, deviceId } = await res.json();
  localStorage.setItem(TOKEN_KEY, jwt);
  localStorage.setItem(DEVICE_ID_KEY, deviceId);
  return { token: jwt, deviceId };
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(DEVICE_ID_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function getAuthenticatedWsUrl(): string {
  const baseUrl = import.meta.env.VITE_SYNC_SERVER_URL || "ws://localhost:3030";
  const token = getStoredToken();
  if (!token) return baseUrl;
  return `${baseUrl}?token=${encodeURIComponent(token)}`;
}
