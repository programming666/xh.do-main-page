import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { mergeAppearance, readAppearance } from "../src/lib/appearance";
import { siteSettingsPatchSchema } from "../src/lib/validation";

test("migrations and appearance persistence preserve existing content and independent themes", { timeout: 120000 }, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "xhdo-appearance-"));
  const url = `file:${path.join(directory, "test.db").replaceAll("\\", "/")}`;
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: url }, stdio: "pipe", timeout: 60000,
    });
    const site = await prisma.siteSettings.create({ data: {
      id: "default", siteName: "Keep my content", heroMediaUrl: "/uploads/backgrounds/original.avif",
    } });
    const patch = siteSettingsPatchSchema.parse({ appearance: {
      light: { mode: "image", imageUrl: "https://example.com/paper.jpg", overlay: 40 },
      dark: { mode: "gradient", gradientAngle: 90 },
      sectionOrder: ["contact", "about", "projects"], projectStyle: "cards",
    } });
    await prisma.siteSettings.update({ where: { id: "default" }, data: {
      appearance: JSON.stringify(mergeAppearance(readAppearance(site.appearance), patch.appearance)),
    } });
    const saved = await prisma.siteSettings.findUniqueOrThrow({ where: { id: "default" } });
    assert.equal(saved.siteName, site.siteName);
    assert.equal(saved.heroMediaUrl, site.heroMediaUrl);
    assert.equal(readAppearance(saved.appearance).light.imageUrl, "https://example.com/paper.jpg");
    assert.equal(readAppearance(saved.appearance).dark.mode, "gradient");
    assert.deepEqual(readAppearance(saved.appearance).sectionOrder, ["contact", "about", "projects"]);
    const next = mergeAppearance(readAppearance(saved.appearance), { light: { imageUrl: "" } });
    await prisma.siteSettings.update({ where: { id: "default" }, data: { appearance: JSON.stringify(next) } });
    const cleared = readAppearance((await prisma.siteSettings.findUniqueOrThrow({ where: { id: "default" } })).appearance);
    assert.equal(cleared.light.imageUrl, "");
    assert.equal(cleared.dark.gradientAngle, 90);
    assert.equal(cleared.projectStyle, "cards");
  } finally {
    await prisma.$disconnect();
    await rm(directory, { recursive: true, force: true });
  }
});
