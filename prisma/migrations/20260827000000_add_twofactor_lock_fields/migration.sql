-- Add fields that better-auth 1.7.x writes to the twoFactor table:
--   * failedVerificationCount: increments on each failed TOTP attempt; locks
--     the row past a configured threshold (3 by default in better-auth).
--   * lockedUntil: timestamp until which the row refuses new verify attempts.
-- Both default to safe values so existing rows remain functional.
ALTER TABLE `twoFactor` ADD COLUMN `failedVerificationCount` INTEGER DEFAULT 0;
ALTER TABLE `twoFactor` ADD COLUMN `lockedUntil` DATETIME;