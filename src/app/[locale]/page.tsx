import Image from "next/image";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ContactLinks } from "@/components/home/contact-links";
import { ProjectCard } from "@/components/home/project-card";
import { TechBackground } from "@/components/home/tech-background";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { getHomePageData } from "@/lib/site-data";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 .5C5.73.5.75 5.48.75 11.75c0 4.96 3.21 9.16 7.67 10.65.56.1.77-.24.77-.54 0-.27-.01-.97-.02-1.91-3.12.68-3.78-1.5-3.78-1.5-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.39-1.22.71-1.5-2.49-.28-5.11-1.24-5.11-5.54 0-1.22.44-2.22 1.16-3.01-.12-.28-.5-1.43.11-2.98 0 0 .94-.3 3.09 1.15.9-.25 1.86-.37 2.82-.38.96.01 1.92.13 2.82.38 2.15-1.45 3.09-1.15 3.09-1.15.61 1.55.23 2.7.11 2.98.72.79 1.16 1.79 1.16 3.01 0 4.31-2.63 5.26-5.13 5.54.4.34.76 1.02.76 2.06 0 1.49-.01 2.69-.01 3.06 0 .3.2.65.78.54 4.46-1.49 7.67-5.69 7.67-10.65C23.25 5.48 18.27.5 12 .5Z"
      />
    </svg>
  );
}

// ISR: regenerate the static HTML at most every 60s so the homepage stays
// cacheable at the CDN (fixes the 3.4s cold TTFB / 6.8s mobile LCP) while
// still picking up content changes within a minute.
export const revalidate = 60;

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  // Guard: /xxx-style single-segment paths route into the [locale] segment
  // with an invalid locale. Reading site.translation below would crash on an
  // undefined translation, so reject unknown locales up front (404). The
  // layout also guards, but the page body renders in parallel during streaming.
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  // Cache the locale so next-intl's getTranslations below resolves it without
  // reading the x-next-intl-locale request header, letting this public page be
  // statically rendered + ISR-cached at the CDN.
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "hero" });
  const { site, projects, contactLinks } = await getHomePageData(locale);
  const translation = site.translation;
  const showSecondaryCta =
    Boolean(translation.secondaryLabel && translation.secondaryHref) &&
    !translation.secondaryHref.includes("/admin");

  return (
    <main className="relative overflow-hidden px-4 pb-20 pt-24 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-10">
        <section className="glass-panel relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
          <TechBackground
            mediaType={site.heroMediaType as "image" | "video"}
            mediaUrl={site.heroMediaUrl}
            mediaItems={site.heroMediaItems}
            lightMediaItems={site.heroLightItems}
            darkMediaItems={site.heroDarkItems}
            posterUrl={site.heroPosterUrl}
            effect={site.heroEffect as "none" | "scroll-pan" | "parallax"}
            overlayOpacity={site.heroOverlayOpacity}
            intervalMs={site.heroImageIntervalMs}
            accentColor={site.accentColor}
            gradientEnabled={site.gradientEnabled}
            gradientStart={site.gradientStart}
            gradientEnd={site.gradientEnd}
            gradientAngle={site.gradientAngle}
          />
          <div className="relative z-10 grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-4 rounded-full border border-white/12 bg-slate-950/25 px-5 py-3 text-xs uppercase tracking-[0.28em] text-cyan-200/90">
                {site.logoUrl ? (
                  <span className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/92 p-2 shadow-[0_0_30px_rgba(76,201,255,0.18)]">
                    <Image src={site.logoUrl} alt={site.siteName} fill className="object-contain p-2" unoptimized />
                  </span>
                ) : null}
                <span>{translation.eyebrow}</span>
              </div>
              <div className="space-y-4">
                <h1 className="hero-text-shadow max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                  {translation.headline}
                </h1>
                <p className="max-w-2xl text-base leading-8 text-slate-200/85 sm:text-lg">
                  {translation.subheadline}
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <a className="rounded-full bg-cyan-400 px-5 py-3 font-medium text-slate-950 transition-transform duration-200 ease-out hover:scale-[1.02]" href={translation.primaryHref}>
                  {translation.primaryLabel}
                </a>
                {showSecondaryCta ? (
                  translation.secondaryHref.startsWith("#") ? (
                    <a className="rounded-full border border-white/20 bg-white/10 px-5 py-3 font-medium text-white" href={translation.secondaryHref}>
                      {translation.secondaryLabel}
                    </a>
                  ) : (
                    <Link className="rounded-full border border-white/20 bg-white/10 px-5 py-3 font-medium text-white" href={translation.secondaryHref}>
                      {translation.secondaryLabel}
                    </Link>
                  )
                ) : null}
              </div>
            </div>
            <div id="about" className="space-y-4 rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-6 text-sm text-slate-200/82 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">{translation.aboutTitle}</p>
              <p className="leading-7">{translation.aboutBody}</p>
              {contactLinks.length ? (
                <ContactLinks links={contactLinks} />
              ) : site.githubUrl ? (
                <a
                  href={site.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-cyan-200 transition-colors duration-200 ease-out hover:border-cyan-300/45 hover:bg-cyan-300/10"
                >
                  <GithubIcon className="h-4 w-4" />
                  <span>{t("visitGithub")}</span>
                </a>
              ) : null}
            </div>
          </div>
        </section>

        <section id="projects" className="space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-accent">{t("featured")}</p>
              <h2 className="mt-3 flex items-baseline gap-3 text-3xl font-semibold">
                <span>{t("projects")}</span>
                <span className="text-2xl font-medium text-accent/90">({projects.length})</span>
              </h2>
            </div>
          </div>
          {projects.length ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  title={project.translation.title}
                  summary={project.translation.summary}
                  description={project.translation.description}
                  techStack={project.translation.techStack}
                  coverUrl={project.coverUrl}
                  demoUrl={project.demoUrl}
                  repoUrl={project.repoUrl}
                  featured={project.isFeatured}
                />
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-8 text-[color:var(--muted)]">{t("emptyProjects")}</div>
          )}
        </section>

        <footer className="px-2 py-4 text-sm text-[color:var(--muted)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
            <span>
              {translation.footerText?.trim()
                ? translation.footerText
                : t("footerTagline", { siteName: site.siteName })}
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}
