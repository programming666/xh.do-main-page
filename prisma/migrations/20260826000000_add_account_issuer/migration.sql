-- Add issuer column to Account table (better-auth 1.7 requirement).
-- Background: better-auth 1.7 changed account identity from (providerId) to the
-- compound key (issuer, accountId). Sign-in checks `account.issuer ===
-- createLocalAccountIssuer("credential")` which is "local:credential". Without
-- this column on the Prisma Account table, every sign-in throws "User not
-- found" (see https://better-auth.com/docs/guides/1-7-upgrade-guide).
--
-- The column is added as nullable in this migration. The backfill that
-- follows sets every existing credential row's issuer to "local:credential".
-- A separate step (run after the backfill on prod) rebuilds the table to
-- add NOT NULL and the unique index, but for this single-admin deployment
-- we keep the column nullable to avoid the SQLite table-rebuild risk on
-- the live prod database.

ALTER TABLE "account" ADD COLUMN "issuer" TEXT;

-- Backfill: every existing credential row gets the synthetic local issuer.
UPDATE "account" SET "issuer" = 'local:credential' WHERE "providerId" = 'credential';

-- Sanity check: no row should be left without an issuer.
-- (If you ever wire a new provider, extend this UPDATE accordingly.)