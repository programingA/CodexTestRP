import { getMe } from "@/lib/api";
import { adoptAnonymousFilmsForCurrentUser, clearCurrentUser, setCurrentUser } from "@/lib/local-films";
import type { AuthTokens, MeResponse } from "@/lib/types";

const ACCESS_TOKEN_KEY = "cinema-memory.access-token";
const REFRESH_TOKEN_KEY = "cinema-memory.refresh-token";

export function getAccessToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem(ACCESS_TOKEN_KEY) ?? "";
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  clearCurrentUser();
  window.dispatchEvent(new Event("cinema-memory:auth-changed"));
}

export function persistAuthSession(email: string, tokens: AuthTokens) {
  if (!tokens.accessToken || !tokens.refreshToken) {
    throw new Error("Auth response does not include tokens.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  setCurrentUser(normalizedEmail);

  try {
    adoptAnonymousFilmsForCurrentUser();
  } catch {
    // Local prototype data migration should not block a valid login.
  }

  window.dispatchEvent(new Event("cinema-memory:auth-changed"));
}

export async function persistVerifiedAuthSession(tokens: AuthTokens): Promise<MeResponse> {
  if (!tokens.accessToken || !tokens.refreshToken) {
    throw new Error("Auth response does not include tokens.");
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);

  const me = await verifyAuthSession();
  if (!me) {
    throw new Error("Stored OAuth tokens are not valid.");
  }

  try {
    adoptAnonymousFilmsForCurrentUser();
  } catch {
    // Local prototype data migration should not block a valid login.
  }

  window.dispatchEvent(new Event("cinema-memory:auth-changed"));
  return me;
}

export async function verifyAuthSession(): Promise<MeResponse | null> {
  const accessToken = getAccessToken();
  if (!accessToken) {
    clearAuthSession();
    return null;
  }

  try {
    const me = await getMe(accessToken);
    setCurrentUser(me.email);
    return me;
  } catch {
    clearAuthSession();
    return null;
  }
}
