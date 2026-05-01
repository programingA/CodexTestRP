import type { Film, PlaybackFilm } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getFilms(): Promise<Film[]> {
  return request<Film[]>("/films");
}

export async function getPlaybackFilm(filmId: number): Promise<PlaybackFilm> {
  return request<PlaybackFilm>(`/films/${filmId}/playback`);
}

export const oauthUrl = (provider: "google" | "kakao") =>
  `${API_BASE_URL}/oauth2/authorization/${provider}`;
