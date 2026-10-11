import { z } from "zod";

export function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim().replace(/^`+|`+$/g, "").trim();
  return trimmed === "" ? undefined : trimmed;
}

export function normalizeString(value: unknown) {
  if (typeof value !== "string") return value;
  return value.trim().replace(/^`+|`+$/g, "").trim();
}

export const cleanedRequiredString = z.preprocess(normalizeString, z.string().min(1));
export const cleanedOptionalString = z.preprocess(
  normalizeOptionalString,
  z.string().optional().nullable(),
);
export const cleanedColor = z.preprocess(normalizeString, z.string().min(4));
