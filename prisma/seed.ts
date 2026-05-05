import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";
import { ensureSiteSettings } from "../src/lib/site-data";

const FORBIDDEN_PASSWORDS = new Set([
  "ChangeMe123!",
  "changeme123!",
  "password",
  "admin",
  "12345678",
  "passw0rd",
]);

function fail(message: string): never {
  console.error(`\n[seed] ${message}\n`);
  process.exit(1);
}

function readRequired(name: string, hint: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    fail(`Environment variable ${name} is required for seeding. ${hint}`);
  }
  return value;
}

async function main() {
  const adminEmail = readRequired(
    "ADMIN_EMAIL",
    "Set it to the mailbox you want to use as the admin account.",
  );
  const adminPassword = readRequired(
    "ADMIN_PASSWORD",
    "Choose a strong password (min 12 chars, mixed case, digits, symbols) and set it in .env before re-running seed.",
  );

  if (adminPassword.length < 12) {
    fail(
      `ADMIN_PASSWORD must be at least 12 characters long (current length: ${adminPassword.length}).`,
    );
  }
  if (FORBIDDEN_PASSWORDS.has(adminPassword)) {
    fail(
      `ADMIN_PASSWORD is set to a known weak / placeholder value. Choose a unique password.`,
    );
  }

  await ensureSiteSettings();

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    await auth.api.signUpEmail({
      body: {
        email: adminEmail,
        password: adminPassword,
        name: "xh.do Admin",
      },
    });
      console.log(`[seed] Bootstrapped admin user ${adminEmail}.`);
  } else {
      console.log(`[seed] Admin user ${adminEmail} already exists; skipping.`);
  }

  const count = await prisma.project.count();
  if (count === 0) {
    await prisma.project.create({
      data: {
        slug: "xh-do-home",
        // coverUrl left null — uploaded via /admin once the seed admin logs in.
        // Remote URLs would have to pass safeMediaUrl (cdn.xh.do or /uploads/*),
        // which a fresh seed environment can't satisfy.
        coverUrl: null,
        demoUrl: "https://xh.do",
        repoUrl: null,
        status: "live",
        sortOrder: 1,
        isFeatured: true,
        isPublished: true,
        translations: {
          create: [
            {
              locale: "zh",
              title: "xh.do 个人主页",
              summary: "可在线运营的科技感首页",
              description: "支持多语言、明暗主题、Logo/背景媒体管理、项目配置和 TOTP 二次验证后台。",
              techStack: "Next.js / Prisma / Better Auth / Tailwind",
            },
            {
              locale: "en",
              title: "xh.do Personal Homepage",
              summary: "A cinematic homepage managed online",
              description: "Supports i18n, light/dark themes, configurable logo and hero media, project management and TOTP-protected admin access.",
              techStack: "Next.js / Prisma / Better Auth / Tailwind",
            },
          ],
        },
      },
    });
  }

  console.log("Seed completed.");
}

main()
  .catch((error) => {
      console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
