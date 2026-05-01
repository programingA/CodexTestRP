import { FilmCard } from "@/components/FilmCard";
import { OAuthButtons } from "@/components/OAuthButtons";
import { demoFilms } from "@/lib/mock-data";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto flex min-h-[58vh] w-full max-w-7xl flex-col justify-end px-5 py-10 sm:px-8 lg:px-10">
        <div className="max-w-4xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-projector">Cinema Memory</p>
          <h1 className="text-5xl font-semibold leading-tight text-white sm:text-7xl">
            추억을 필름에 담고 다시 상영하세요.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-200">
            사진, 글, 장소, 분위기를 하나의 필름으로 묶고 영사기 화면에서 파노라마처럼 감상하는 개인 추억 보관함입니다.
          </p>
          <div className="mt-8">
            <OAuthButtons />
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-black/26 px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-white">필름 보관함</h2>
              <p className="mt-2 text-sm text-stone-300">v1 MVP 화면이며, API 연결 전에는 데모 필름을 표시합니다.</p>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {demoFilms.map((film) => (
              <FilmCard key={film.id} film={film} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
