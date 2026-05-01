import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProjectorScene } from "@/components/ProjectorScene";
import { demoPlaybackFilm } from "@/lib/mock-data";

type Props = {
  params: {
    filmId: string;
  };
};

export default function PlaybackPage({ params }: Props) {
  const { filmId } = params;
  const film = {
    ...demoPlaybackFilm,
    id: Number(filmId)
  };

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-stone-200 transition hover:bg-white/10"
          >
            <ArrowLeft size={16} />
            보관함
          </Link>
          <div className="text-right">
            <p className="text-sm text-projector">Now Projecting</p>
            <h1 className="text-xl font-semibold text-white">{film.title}</h1>
          </div>
        </div>
        <ProjectorScene scenes={film.scenes} />
      </div>
    </main>
  );
}
