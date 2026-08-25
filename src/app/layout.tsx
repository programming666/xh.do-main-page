import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { routing } from "@/i18n/routing";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://xh.do"),
  title: "xh.do",
  description: "xh.do personal site admin and public homepage",
};

// `next-intl` middleware exposes the resolved locale on `x-next-intl-locale`,
// falling back to the default locale. Reading it here (vs hard-coding zh) lets
// the `<html lang>` attribute reflect the URL the user actually requested.
async function resolveHtmlLang(): Promise<string> {
  const headerStore = await headers();
  const fromMiddleware = headerStore.get("x-next-intl-locale");
  if (fromMiddleware && (routing.locales as readonly string[]).includes(fromMiddleware)) {
    return fromMiddleware;
  }
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  if (cookieLocale && (routing.locales as readonly string[]).includes(cookieLocale)) {
    return cookieLocale;
  }
  return routing.defaultLocale;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await resolveHtmlLang();
  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full dark`}
    >
      <head>
        {/*
          Apply the correct theme class before first paint. SSR always renders
          class="dark" (matching the provider's initial state), so without this
          script a light-mode / light-OS visitor would see a dark flash until
          hydration. Reads the stored preference and falls back to the OS
          scheme (adaptive mode) when nothing is stored yet.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("xhdo-theme");var dark=true;if(s==="light"){dark=false}else if(s==="dark"){dark=true}else{dark=window.matchMedia("(prefers-color-scheme: dark)").matches}var d=document.documentElement;d.classList.toggle("dark",dark);d.style.colorScheme=dark?"dark":"light"}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}