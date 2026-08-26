import Image from "next/image";

type ContactLink = {
  id?: string;
  label: string;
  url: string;
  imageUrl?: string | null;
};

function FallbackIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
    </svg>
  );
}

/**
 * Row of contact links shown on the homepage about card. Each link renders as
 * an icon pill (uploaded image icon + label), matching the "Visit GitHub" CTA
 * aesthetic. The internal `GithubIcon` in the home page is replaced by this
 * component so admins can manage any number of contact links from the CMS.
 */
export function ContactLinks({ links }: { links: ContactLink[] }) {
  if (!links.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <a
          key={link.id ?? link.url}
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-cyan-200 transition-colors duration-200 ease-out hover:border-cyan-300/45 hover:bg-cyan-300/10"
        >
          {link.imageUrl ? (
            <Image
              src={link.imageUrl}
              alt=""
              width={16}
              height={16}
              className="h-4 w-4 rounded-sm object-contain"
              unoptimized
            />
          ) : (
            <FallbackIcon className="h-4 w-4" />
          )}
          <span>{link.label}</span>
        </a>
      ))}
    </div>
  );
}
