"use client";

import Image from "next/image";
import { useRef } from "react";
import { useTranslations } from "next-intl";

import { useProgressiveImage } from "./progressive-image";
function ProjectCover({ coverUrl, alt }: { coverUrl: string; alt: string }) {
  const coverRef = useRef<HTMLDivElement>(null);
  const { low, high, highReady } = useProgressiveImage(coverUrl, {
    defer: "visible",
    el: coverRef,
  });
  const hasHigh = high !== low;
  return (
    <div ref={coverRef} className="absolute inset-0">
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
        quality={65}
        loading="lazy"
        sizes="(max-width: 640px) 100vw, (max-width: 1536px) 50vw, 33vw"
        className="
          object-cover scale-110 blur-2xl opacity-50
          transition-opacity duration-200
          ease-[cubic-bezier(0.22,1,0.36,1)]
          group-hover:opacity-70
        "
      />
      {!hasHigh || highReady ? (
        <Image
          src={high}
          alt={alt}
          fill
          quality={65}
          sizes="(max-width: 640px) 100vw, (max-width: 1536px) 50vw, 33vw"
          style={{
            transition:
              "transform 200ms cubic-bezier(0.22, 1, 0.36, 1), filter 200ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          className={`object-contain ${hasHigh ? "px-fade-in" : ""} group-hover:scale-[1.03] group-hover:brightness-110`}
        />
      ) : null}
    </div>
  );
}

export function ProjectCard({ title, summary, description, techStack, coverUrl, demoUrl, repoUrl, featured, index = 1 }: {
  title: string; summary: string; description: string; techStack: string;
  coverUrl?: string | null; demoUrl?: string | null; repoUrl?: string | null;
  featured: boolean; index?: number;
}) {
  const t = useTranslations("hero");
  return <article className="editorial-project group">
    <div className="project-number" aria-hidden="true">{String(index).padStart(2, "0")}</div>
    <div className="project-cover">
      {coverUrl ? <ProjectCover coverUrl={coverUrl} alt={title} /> : <div className="project-monogram" aria-hidden="true">{title.slice(0, 1)}</div>}
      {featured ? <span className="project-featured">{t("featured")}</span> : null}
    </div>
    <div className="project-copy">
      <p className="editorial-kicker">{techStack}</p>
      <h3>{title}</h3>
      <p className="project-summary">{summary}</p>
      {description ? <details className="project-details"><summary>{t("projectDetails")}</summary><p>{description}</p></details> : null}
      <div className="project-links">
        {demoUrl ? <a href={demoUrl} target="_blank" rel="noreferrer">{t("projectDemo")} <span aria-hidden="true">↗</span></a> : null}
        {repoUrl ? <a href={repoUrl} target="_blank" rel="noreferrer">{t("projectRepo")} <span aria-hidden="true">↗</span></a> : null}
      </div>
    </div>
  </article>;
}
