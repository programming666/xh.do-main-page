"use client";

import Image from "next/image";

import { useProgressiveImage } from "./progressive-image";
function ProjectCover({ coverUrl, alt }: { coverUrl: string; alt: string }) {
  const { low, high, highReady } = useProgressiveImage(coverUrl);
  const hasHigh = high !== low;
  return (
    <>
      {/*
        Blurred copy of the same image fills any letterbox area with
        colors sampled from the image itself, so the contained
        foreground never looks like it's floating on a flat panel.
        It paints the compacted (low-byte) version first; the HD layer
        below fades in once the browser has decoded it.
      */}
      <Image
        src={low}
        alt=""
        aria-hidden="true"
        fill
        sizes="(max-width: 1024px) 100vw, 50vw"
        className="
          object-cover scale-110 blur-2xl opacity-50
          transition-opacity duration-200
          ease-[cubic-bezier(0.22,1,0.36,1)]
          group-hover:opacity-70
        "
      />
      <Image
        src={high}
        alt={alt}
        fill
        sizes="(max-width: 1024px) 100vw, 50vw"
        style={{
          opacity: hasHigh ? (highReady ? 1 : 0) : 1,
          transition:
            "opacity 600ms cubic-bezier(0.4, 0, 0.2, 1), transform 200ms cubic-bezier(0.22, 1, 0.36, 1), filter 200ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className="
          object-contain
          group-hover:scale-[1.03] group-hover:brightness-110
        "
      />
    </>
  );
}

export function ProjectCard({
  title,
  summary,
  description,
  techStack,
  coverUrl,
  demoUrl,
  repoUrl,
  featured,
}: {
  title: string;
  summary: string;
  description: string;
  techStack: string;
  coverUrl?: string | null;
  demoUrl?: string | null;
  repoUrl?: string | null;
  featured: boolean;
}) {
  return (
    <article
      className="
        glass-panel group overflow-hidden rounded-3xl
          transition-[transform,box-shadow,border-color] duration-200
          ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform
          hover:-translate-y-1 hover:border-cyan-300/30
          hover:shadow-[0_30px_80px_rgba(15,23,42,0.28)]

      "
    >
      <div className="relative aspect-[16/10] overflow-hidden border-b border-white/10 bg-slate-950/55">
        {coverUrl ? (
          <ProjectCover coverUrl={coverUrl} alt={title} />
        ) : (

          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(66,194,255,0.3),transparent_45%)] text-sm text-white/60">
            xh.do
          </div>
        )}
        {featured ? (
          <span className="absolute left-4 top-4 rounded-full border border-cyan-300/30 bg-slate-950/55 px-3 py-1 text-xs text-cyan-200">
            Featured
          </span>
        ) : null}
      </div>
      <div className="space-y-4 p-6">
        <div>
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="mt-2 text-sm text-[color:var(--muted)]">{summary}</p>
        </div>
        <p className="text-sm leading-7 text-[color:var(--muted)]">{description}</p>
        <div className="text-xs uppercase tracking-[0.2em] text-accent">{techStack}</div>
        <div className="flex flex-wrap gap-3">
          {demoUrl ? (
            <a className="rounded-full border border-cyan-300/20 px-4 py-2 text-sm transition-colors duration-200 ease-out hover:bg-cyan-300/10" href={demoUrl} target="_blank" rel="noreferrer">
              Demo
            </a>
          ) : null}
          {repoUrl ? (
            <a className="rounded-full border border-white/10 px-4 py-2 text-sm transition-colors duration-200 ease-out hover:bg-white/8" href={repoUrl} target="_blank" rel="noreferrer">
              Repo
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
