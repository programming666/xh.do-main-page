/**
 * One-off admin password reset.
 *
 * Run via:  npx tsx scripts/reset-admin-password.ts <NEW_PASSWORD>
 *
 * - Reads ADMIN_EMAIL from .env (single source of truth for who counts as admin).
 * - Hashes the new password with the same scrypt routine Better Auth uses
 *   internally, then updates the `Account.password` column for the
 *   "credential" provider. The User row, 2FA enrollment and every other
 *   Account row are left untouched, so re-enabling TOTP is NOT required.
 * - Refuses to run if the new password is <12 chars or is in the same
 *   placeholder list as prisma/seed.ts.
 *
 * This script is gitignored — see `.gitignore` entry for `scripts/`.
 */
import { hashPassword } from "better-auth/crypto";
import { prisma } from "../src/lib/prisma";
import { env } from "../src/lib/env";

const FORBIDDEN = new Set([
  "ChangeMe123!",
  "changeme123!",
  "password",
  "admin",
  "12345678",
  "passw0rd",
]);

function fail(message: string): never {
  console.error(`\n[reset-admin-password] ${message}\n`);
  process.exit(1);
}

async function main(): Promise<void> {
  const newPassword = process.argv[2];
  if (!newPassword) {
    fail(
      "Usage: npx tsx scripts/reset-admin-password.ts <NEW_PASSWORD>",
    );
  }
  if (newPassword.length < 12) {
    fail(
      `New password must be at least 12 characters (current length: ${newPassword.length}).`,
    );
  }
  if (FORBIDDEN.has(newPassword)) {
    fail(
      "New password matches a known weak / placeholder value. Pick something unique.",
    );
  }

  const email = env.ADMIN_EMAIL;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    fail(`No user with ADMIN_EMAIL=${email} in the database.`);
  }

  const account = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });
  if (!account) {
    fail(
      `User ${email} exists but has no "credential" provider Account row. Cannot reset password this way.`,
    );
  }

  const hashed = await hashPassword(newPassword);

  await prisma.account.update({
    where: { id: account.id },
    data: { password: hashed },
  });

  console.log(
    `[reset-admin-password] Password updated for ${email}. 2FA enrollment preserved.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });