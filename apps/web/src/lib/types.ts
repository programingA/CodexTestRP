export type Film = {
  id: number;
  title: string;
  description: string;
  coverImageUrl?: string;
  mood?: string;
  createdAt: string;
  sceneCount: number;
};

export type MemoryScene = {
  id: number;
  filmId: number;
  title: string;
  body: string;
  memoryDate?: string;
  location?: string;
  mood?: string;
  tags?: string[];
  sortOrder: number;
  mediaUrls: string[];
};

export type PlaybackFilm = Film & {
  scenes: MemoryScene[];
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
};

export type MeResponse = {
  id: number;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type SignupRequest = LoginRequest & {
  displayName: string;
};
