"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Edit3, Film, LogOut, Play, Plus, ShieldCheck, Trash2, Video } from "lucide-react";
import { clearAuthSession, verifyAuthSession } from "@/lib/auth";
import { deleteLocalFilm, readLocalFilms } from "@/lib/local-films";
import type { PlaybackFilm } from "@/lib/types";

function isVideoMedia(url?: string) {
  if (!url) {
    return false;
  }

  return url.startsWith("data:video/") || /\.(mp4|webm|ogg)(\?|$)/i.test(url);
}

export function DashboardClient() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [localFilms, setLocalFilms] = useState<PlaybackFilm[]>([]);
  const [currentUser, setCurrentUserLabel] = useState("");

  useEffect(() => {
    let cancelled = false;

    void verifyAuthSession().then((me) => {
      if (cancelled) {
        return;
      }

      if (!me) {
        router.replace("/");
        window.dispatchEvent(new Event("cinema-memory:open-login"));
        return;
      }

      queueMicrotask(() => {
        if (!cancelled) {
          setCurrentUserLabel(me.email);
          setLocalFilms(readLocalFilms());
          setIsReady(true);
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const films = useMemo(() => localFilms, [localFilms]);

  function logout() {
    clearAuthSession();
    router.replace("/");
  }

  function deleteFilm(filmId: number) {
    const ok = window.confirm("이 필름을 삭제할까요? 삭제하면 현재 브라우저 저장소에서 제거됩니다.");
    if (!ok) {
      return;
    }

    deleteLocalFilm(filmId);
    setLocalFilms(readLocalFilms());
  }

  if (!isReady) {
    return (
      <main className="grid min-h-[60vh] place-items-center px-5">
        <div className="rounded-lg border border-white/10 bg-black/45 px-5 py-4 text-sm text-stone-300">
          서버에서 토큰을 검증하고 있습니다...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 flex flex-col justify-between gap-5 rounded-lg border border-white/10 bg-black/45 p-6 shadow-reel md:flex-row md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-projector/10 px-3 py-1 text-xs font-semibold text-projector">
              <ShieldCheck size={14} />
              {currentUser || "verified user"}
            </div>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">내 필름 보관함</h1>
            <p className="mt-3 max-w-2xl text-stone-300">
              대시보드는 백엔드에서 검증된 토큰의 사용자 이메일을 기준으로 로컬 필름 저장소를 엽니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/films/new"
              className="inline-flex items-center gap-2 rounded-md bg-projector px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-200"
            >
              <Plus size={16} />
              필름 만들기
            </Link>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-md border border-white/10 px-4 py-2 text-sm text-stone-200 transition hover:bg-white/10"
            >
              <LogOut size={16} />
              로그아웃
            </button>
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-center gap-2 text-projector">
            <Film size={18} />
            <h2 className="text-lg font-semibold">내 필름</h2>
          </div>

          {films.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-stone-950/70 p-8 text-center">
              <Film className="mx-auto text-projector" size={34} />
              <h3 className="mt-4 text-xl font-semibold text-white">아직 만든 필름이 없습니다</h3>
              <p className="mt-2 text-sm text-stone-400">
                필름 만들기에서 이미지나 동영상을 업로드해 첫 상영을 만들어보세요.
              </p>
              <Link
                href="/films/new"
                className="mt-5 inline-flex items-center gap-2 rounded-md bg-projector px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-200"
              >
                <Plus size={16} />
                필름 만들기
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {films.map((film) => {
                const coverIsVideo = isVideoMedia(film.coverImageUrl);

                return (
                  <article
                    key={film.id}
                    className="group rounded-lg border border-white/10 bg-stone-950/80 p-4 transition hover:-translate-y-1 hover:border-projector/50"
                  >
                    <Link href={`/films/${film.id}/playback`}>
                      <div className="relative mb-4 aspect-video overflow-hidden rounded-md bg-stone-900">
                        {film.coverImageUrl && coverIsVideo ? (
                          <video src={film.coverImageUrl} className="h-full w-full object-cover opacity-80" muted playsInline />
                        ) : film.coverImageUrl ? (
                          <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${film.coverImageUrl})` }} />
                        ) : (
                          <div className="grid h-full place-items-center text-stone-500">
                            <Film size={28} />
                          </div>
                        )}
                        {coverIsVideo && (
                          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-xs text-projector">
                            <Video size={13} />
                            Video
                          </span>
                        )}
                      </div>
                    </Link>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-white">{film.title}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-stone-400">{film.description}</p>
                        <p className="mt-2 text-xs text-stone-500">{film.sceneCount} scenes</p>
                      </div>
                      <Link href={`/films/${film.id}/playback`} className="rounded-md bg-projector p-2 text-stone-950" aria-label={`${film.title} 상영`}>
                        <Play size={15} />
                      </Link>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Link
                        href={`/films/${film.id}/edit`}
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-stone-200 transition hover:bg-white/10"
                      >
                        <Edit3 size={14} />
                        수정
                      </Link>
                      <button
                        type="button"
                        onClick={() => deleteFilm(film.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-red-400/30 px-3 py-2 text-sm text-red-300 transition hover:bg-red-950/30"
                      >
                        <Trash2 size={14} />
                        삭제
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
