"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

function getLocalePrefix() {
  if (typeof window === "undefined") {
    return "/zh";
  }

  const [, locale] = window.location.pathname.split("/");
  return locale === "en" || locale === "zh" ? `/${locale}` : "/zh";
}

export const authClient = createAuthClient({
  plugins: [
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.href = `${getLocalePrefix()}/admin/2fa`;
      },
    }),
  ],
});
