-- Add sessionsPerMonth to subjects table
ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "sessions_per_month" INTEGER NOT NULL DEFAULT 8;

-- Set sensible defaults based on subject name
UPDATE "subjects" SET "sessions_per_month" = 12 WHERE name ILIKE '%AHE%' OR name ILIKE '%ASE%';
UPDATE "subjects" SET "sessions_per_month" = 8  WHERE name ILIKE '%Matematika%' OR name ILIKE '%Ngaji%' OR name ILIKE '%Quran%';
