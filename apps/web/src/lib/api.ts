import type { AuthTokens, Film, LoginRequest, MeResponse, PlaybackFilm, SignupRequest } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`API request failed: ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    cache: "no-store"
  });

  const text = await response.text();

  if (!response.ok) {
    throw new ApiError(response.status, text);
  }

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export async function getFilms(): Promise<Film[]> {
  return request<Film[]>("/films");
}

export async function getPlaybackFilm(filmId: number): Promise<PlaybackFilm> {
  return request<PlaybackFilm>(`/films/${filmId}/playback`);
}

export async function login(payload: LoginRequest): Promise<AuthTokens> {
  return request<AuthTokens>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function signup(payload: SignupRequest): Promise<AuthTokens> {
  return request<AuthTokens>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getMe(accessToken: string): Promise<MeResponse> {
  return request<MeResponse>("/auth/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}

export const oauthUrl = (provider: "google" | "kakao") =>
  `${API_BASE_URL}/oauth2/authorization/${provider}`;
