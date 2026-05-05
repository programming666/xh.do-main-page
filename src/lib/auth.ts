import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { z } from "zod";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

// Production gets the deployment URL only; localhost is appended in dev so
// `npm run dev` from a fresh clone still works without overriding env.
const trustedOrigins = env.IS_PRODUCTION
  ? [env.BETTER_AUTH_URL]
  : [env.BETTER_AUTH_URL, "http://localhost:3000", "http://127.0.0.1:3000"];

export const auth = betterAuth({
  appName: "xh.do",
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  // Defense in depth: rate limit auth endpoints to slow credential stuffing
  // and TOTP brute force. The numbers below are deliberately conservative for
  // a single-admin deployment; tune as needed.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
    storage: "memory",
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/two-factor/verify-totp": { window: 60, max: 5 },
      "/two-factor/verify-backup-code": { window: 60, max: 5 },
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    // No public registration. The single admin user is bootstrapped via
    // `prisma/seed.ts`; opening sign-up would let any visitor squat the
    // ADMIN_EMAIL placeholder and gain admin via `isAdminEmail()`.
    disableSignUp: true,
  },
  plugins: [
    nextCookies(),
    twoFactor({
      issuer: "xh.do",
      totpOptions: {
        digits: 6,
        period: 30,
      },
      backupCodeOptions: {
        amount: 10,
        length: 10,
      },
      // Cookie used during the post-password 2FA challenge step.
      twoFactorCookieMaxAge: 600,
      // "Trust this device" window. Reduced from 7 days to 1 day so a stolen
      // device is exposed to the 2FA prompt sooner.
      trustDeviceMaxAge: 60 * 60 * 24,
    }),
  ],
  user: {
    additionalFields: {
      locale: {
        type: "string",
        required: false,
        // Restrict to the locales the app actually serves so a malicious
        // updateUser call can't store an arbitrary string in the User row
        // that later surfaces in <html lang> / link rel="alternate".
        validator: {
          input: z.enum(["zh", "en"]).optional(),
        },
      },
    },
  },
});
