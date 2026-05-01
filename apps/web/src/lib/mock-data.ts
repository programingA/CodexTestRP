import type { Film, PlaybackFilm } from "@/lib/types";

export const demoFilms: Film[] = [
  {
    id: 1,
    title: "봄날의 산책",
    description: "벚꽃 아래에서 남긴 조용한 오후의 기록",
    coverImageUrl: "https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=1200&q=80",
    mood: "warm",
    createdAt: "2026-04-01T10:00:00Z",
    sceneCount: 4
  },
  {
    id: 2,
    title: "여름 바다",
    description: "파도 소리와 필름 카메라 셔터음이 함께 있던 날",
    coverImageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    mood: "bright",
    createdAt: "2026-04-12T10:00:00Z",
    sceneCount: 3
  },
  {
    id: 3,
    title: "심야 영화",
    description: "늦은 밤 극장 조명과 엔딩 크레딧의 잔상",
    coverImageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
    mood: "cinematic",
    createdAt: "2026-04-20T10:00:00Z",
    sceneCount: 5
  }
];

export const demoPlaybackFilm: PlaybackFilm = {
  ...demoFilms[0],
  scenes: [
    {
      id: 101,
      filmId: 1,
      title: "매표소 앞",
      body: "오래 기다린 하루가 시작되던 순간. 손에는 작은 꽃다발과 따뜻한 커피가 있었다.",
      memoryDate: "2026-04-01",
      location: "Seoul",
      mood: "anticipation",
      sortOrder: 1,
      mediaUrls: [demoFilms[0].coverImageUrl ?? ""]
    },
    {
      id: 102,
      filmId: 1,
      title: "빛이 들어온 장면",
      body: "필름 가장자리처럼 흔들리던 햇빛이 사진 속에 남았다.",
      memoryDate: "2026-04-01",
      location: "Seoul",
      mood: "calm",
      sortOrder: 2,
      mediaUrls: ["https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=80"]
    },
    {
      id: 103,
      filmId: 1,
      title: "엔딩 크레딧",
      body: "돌아오는 길에도 같은 이야기를 몇 번이나 다시 꺼냈다.",
      memoryDate: "2026-04-01",
      location: "Seoul",
      mood: "nostalgic",
      sortOrder: 3,
      mediaUrls: ["https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"]
    }
  ]
};
