import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { EditorialFooter } from "@/components/editorial-footer";
import { ContactLinks } from "@/components/home/contact-links";
import { ProjectCard } from "@/components/home/project-card";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { getHomePageData } from "@/lib/site-data";
import { isVisibleSectionHref, visibleSections } from "@/lib/appearance";

// Keep public pages CDN-cacheable while refreshing managed content every minute.
export const revalidate = 60;

export default async function LocaleHomePage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "hero" });
  const { site, projects, contactLinks } = await getHomePageData(locale);
  const { translation, appearance } = site;
  const hasContacts = contactLinks.length > 0;
  const showSecondary = Boolean(translation.secondaryLabel && translation.secondaryHref)
    && !translation.secondaryHref.includes("/admin")
    && isVisibleSectionHref(translation.secondaryHref, appearance, hasContacts);
  const modules = {
    projects: <section id="projects" className="editorial-section" key="projects">
      <div className="section-heading"><div><span className="editorial-kicker">{t("featured")}</span><h2>{t("work")}<sup>{String(projects.length).padStart(2, "0")}</sup></h2></div><span className="section-marker" aria-hidden="true">↙</span></div>
      {projects.length ? <div className="editorial-projects" data-style={appearance.projectStyle}>
        {projects.map((project, index) => <ProjectCard key={project.id}
          title={project.translation.title} summary={project.translation.summary}
          description={project.translation.description} techStack={project.translation.techStack}
          coverUrl={project.coverUrl} demoUrl={project.demoUrl} repoUrl={project.repoUrl}
          featured={project.isFeatured} index={index + 1} />)}
      </div> : <p className="editorial-empty">{t("emptyProjects")}</p>}
    </section>,
    about: <section id="about" className="editorial-section editorial-about" key="about">
      <div><span className="editorial-kicker">{t("aboutSection")}</span><h2>{translation.aboutTitle}</h2></div>
      <p>{translation.aboutBody}</p>
    </section>,
    contact: <section id="contact" className="editorial-section editorial-contact" key="contact">
      <div className="section-heading"><div><span className="editorial-kicker">{t("elsewhere")}</span><h2>{t("contactBarTitle")}</h2></div></div>
      <ContactLinks links={contactLinks} />
    </section>,
  };
  return <main>
    <section className="editorial-hero" data-media="false">
      <div className="editorial-intro">
        <p className="editorial-kicker"><span className="editorial-dot" />{translation.eyebrow}</p>
        <h1>{translation.headline}</h1>
        <p className="editorial-deck">{translation.subheadline}</p>
        <div className="editorial-actions">
          {isVisibleSectionHref(translation.primaryHref, appearance, hasContacts) ? <a className="editorial-button" href={translation.primaryHref}>{translation.primaryLabel}<span aria-hidden="true">↗</span></a> : null}
          {showSecondary ? <Link className="editorial-text-link" href={translation.secondaryHref}>{translation.secondaryLabel}<span aria-hidden="true">↗</span></Link> : null}
        </div>
      </div>
    </section>
    {visibleSections(appearance, hasContacts).map((key) => modules[key])}
    <EditorialFooter locale={locale} siteName={site.siteName} footerText={translation.footerText} />
  </main>;
}
