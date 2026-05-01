"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import type { Film } from "@/lib/types";

type Props = {
  film: Film;
};

export function FilmCard({ film }: Props) {
  return (
    <motion.article
      whileHover={{ y: -6, rotateX: 3 }}
      className="group overflow-hidden rounded-lg border border-white/10 bg-stone-950/78 shadow-reel backdrop-blur"
    >
      <div className="film-perforation h-6 bg-stone-900/85" />
      <div className="relative aspect-[16/10] overflow-hidden">
        {film.coverImageUrl ? (
          <Image
            src={film.coverImageUrl}
            alt=""
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="h-full bg-gradient-to-br from-velvet to-nitrate" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h2 className="text-xl font-semibold text-white">{film.title}</h2>
          <p className="mt-1 line-clamp-2 text-sm text-stone-200">{film.description}</p>
        </div>
      </div>
      <div className="film-perforation h-6 bg-stone-900/85" />
      <div className="flex items-center justify-between px-4 py-4">
        <span className="text-sm text-stone-300">{film.sceneCount} scenes</span>
        <Link
          href={`/films/${film.id}/playback`}
          className="inline-flex items-center gap-2 rounded-md bg-projector px-3 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-200"
        >
          <Play size={15} />
          상영
        </Link>
      </div>
    </motion.article>
  );
}
