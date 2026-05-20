"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Play, Projector } from "lucide-react";
import type { MemoryScene } from "@/lib/types";

type Props = {
  scenes: MemoryScene[];
};

function isVideoMedia(url?: string) {
  if (!url) {
    return false;
  }

  return url.startsWith("data:video/") || /\.(mp4|webm|ogg)(\?|$)/i.test(url);
}

export function ProjectorScene({ scenes }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeActiveIndex = scenes[activeIndex] ? activeIndex : 0;
  const activeScene = scenes[safeActiveIndex];
  const progress = useMemo(() => `${safeActiveIndex + 1} / ${scenes.length}`, [safeActiveIndex, scenes.length]);

  if (!activeScene) {
    return (
      <section className="grid min-h-[520px] place-items-center rounded-lg border border-white/10 bg-black text-stone-300">
        상영할 장면이 없습니다.
      </section>
    );
  }

  const mediaUrl = activeScene.mediaUrls[0];
  const isVideo = isVideoMedia(mediaUrl);

  function move(delta: number) {
    setActiveIndex((current) => (current + delta + scenes.length) % scenes.length);
  }

  return (
    <section className="relative overflow-hidden rounded-lg border border-white/10 bg-[#050505] shadow-screen">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_20%,rgba(246,211,101,0.18),transparent_34%),linear-gradient(135deg,#070606,#15110f_48%,#050505)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-velvet/28 to-transparent" />
      <div className="pointer-events-none absolute left-[28%] top-[33%] hidden h-52 w-[44%] -skew-y-6 bg-gradient-to-r from-projector/28 via-projector/10 to-transparent blur-xl md:block" />

      <div className="relative z-10 grid min-h-[720px] gap-6 p-5 lg:grid-cols-[330px_1fr] lg:p-8">
        <aside className="flex flex-col justify-between rounded-lg border border-white/10 bg-black/52 p-5 backdrop-blur">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-md bg-projector text-stone-950">
                <Projector size={20} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-projector">Projector</p>
                <h2 className="font-semibold text-white">상영 장비</h2>
              </div>
            </div>

            <div className="relative mx-auto mb-6 h-64 max-w-[280px]">
              <div className="absolute left-8 top-4 h-24 w-24 animate-[spin_8s_linear_infinite] rounded-full border-[14px] border-stone-300/90 bg-stone-950 shadow-reel">
                <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-500" />
              </div>
              <div className="absolute right-8 top-9 h-20 w-20 animate-[spin_7s_linear_infinite_reverse] rounded-full border-[11px] border-stone-500 bg-stone-950">
                <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-300" />
              </div>
              <div className="absolute bottom-14 left-6 h-24 w-48 rounded-lg border border-white/10 bg-gradient-to-br from-stone-800 to-stone-950 shadow-reel">
                <div className="absolute left-5 top-5 h-5 w-20 rounded-full bg-projector/50 blur-sm" />
                <div className="absolute bottom-4 left-5 h-3 w-28 rounded-full bg-stone-600" />
                <div className="absolute right-[-38px] top-8 h-12 w-20 rounded-r-full border border-white/10 bg-gradient-to-r from-stone-600 to-stone-800" />
                <div className="absolute right-[-52px] top-11 h-6 w-10 rounded-r-full bg-projector/80 blur-sm" />
              </div>
              <div className="absolute bottom-0 left-16 h-16 w-3 rounded-full bg-stone-700" />
              <div className="absolute bottom-0 left-32 h-16 w-3 rounded-full bg-stone-700" />
            </div>

            <div className="grid gap-3 text-sm text-stone-300">
              <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                <div className="text-xs uppercase tracking-[0.18em] text-stone-500">Current Reel</div>
                <div className="mt-1 font-medium text-white">{progress}</div>
              </div>
              {activeScene.memoryDate && (
                <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] p-3">
                  <CalendarDays size={15} className="text-projector" />
                  {activeScene.memoryDate}
                </div>
              )}
              {activeScene.location && (
                <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] p-3">
                  <MapPin size={15} className="text-projector" />
                  {activeScene.location}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-2">
            {scenes.map((scene, index) => (
              <button
                key={scene.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                  index === safeActiveIndex
                    ? "border-projector/70 bg-projector/12 text-white"
                    : "border-white/10 bg-white/[0.03] text-stone-400 hover:text-white"
                }`}
              >
                <span className="line-clamp-1">{scene.title}</span>
                <span className="text-xs text-projector">{index + 1}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="flex min-w-0 flex-col justify-between gap-5">
          <div className="screen-frame relative overflow-hidden rounded-lg border border-white/15 bg-stone-100 p-3 shadow-screen">
            <div className="film-strip absolute left-0 top-0 z-10 h-full w-8 opacity-55" />
            <div className="film-strip absolute right-0 top-0 z-10 h-full w-8 opacity-55" />
            <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-stone-950">
              {mediaUrl && isVideo ? (
                <video
                  key={mediaUrl}
                  src={mediaUrl}
                  className="h-full w-full object-cover opacity-95"
                  controls
                  playsInline
                />
              ) : mediaUrl ? (
                <div
                  className="h-full w-full bg-cover bg-center opacity-95"
                  style={{ backgroundImage: `url(${mediaUrl})` }}
                />
              ) : (
                <div className="h-full bg-gradient-to-br from-projector/30 via-sky-300/20 to-velvet/40" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/8 to-transparent" />
              <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-md bg-black/55 px-3 py-1 text-xs font-medium text-projector backdrop-blur">
                <Play size={13} />
                Scene {progress}
              </div>
              <div className="absolute bottom-6 left-6 right-6">
                <p className="mb-2 text-sm font-medium text-projector">{activeScene.mood}</p>
                <h1 className="text-3xl font-semibold text-white sm:text-5xl">{activeScene.title}</h1>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/56 p-5 backdrop-blur">
            <p className="max-w-3xl text-base leading-7 text-stone-200 sm:text-lg">{activeScene.body}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => move(-1)}
                className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-stone-200 transition hover:bg-white/10"
              >
                <ChevronLeft size={16} />
                이전
              </button>
              <button
                type="button"
                onClick={() => move(1)}
                className="inline-flex items-center gap-2 rounded-md bg-projector px-3 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-200"
              >
                다음
                <ChevronRight size={16} />
              </button>
              <div className="flex flex-wrap gap-2">
                {scenes.map((scene, index) => (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`h-2.5 w-12 rounded-full transition ${
                      index === safeActiveIndex ? "bg-projector" : "bg-white/30 hover:bg-white/60"
                    }`}
                    aria-label={`${scene.title} 장면으로 이동`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
