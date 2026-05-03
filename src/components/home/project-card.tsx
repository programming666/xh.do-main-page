import Image from "next/image";

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
    <article className="glass-panel group overflow-hidden rounded-3xl">
      <div className="relative aspect-[16/10] overflow-hidden border-b border-white/10 bg-slate-950/50">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={title}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
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
        <div className="text-xs uppercase tracking-[0.2em] text-cyan-400/90">{techStack}</div>
        <div className="flex flex-wrap gap-3">
          {demoUrl ? (
            <a className="rounded-full border border-cyan-300/20 px-4 py-2 text-sm hover:bg-cyan-300/10" href={demoUrl} target="_blank" rel="noreferrer">
              Demo
            </a>
          ) : null}
          {repoUrl ? (
            <a className="rounded-full border border-white/10 px-4 py-2 text-sm hover:bg-white/8" href={repoUrl} target="_blank" rel="noreferrer">
              Repo
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
