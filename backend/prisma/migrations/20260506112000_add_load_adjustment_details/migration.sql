ALTER TABLE "ProgramProgress"
ADD COLUMN "baseLoadAdjustment" DOUBLE PRECISION,
ADD COLUMN "loadAdjustmentPreset" DOUBLE PRECISION;

UPDATE "ProgramProgress"
SET
  "baseLoadAdjustment" = COALESCE("loadAdjustment", 1),
  "loadAdjustmentPreset" = 1
WHERE "baseLoadAdjustment" IS NULL
   OR "loadAdjustmentPreset" IS NULL;

ALTER TABLE "ProgramProgress"
ALTER COLUMN "baseLoadAdjustment" SET DEFAULT 1,
ALTER COLUMN "baseLoadAdjustment" SET NOT NULL,
ALTER COLUMN "loadAdjustmentPreset" SET DEFAULT 1,
ALTER COLUMN "loadAdjustmentPreset" SET NOT NULL;
