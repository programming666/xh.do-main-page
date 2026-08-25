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
      <body className="min-h-full bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}