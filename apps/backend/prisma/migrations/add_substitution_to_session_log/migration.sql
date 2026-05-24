-- Add scheduledTeacherId column (nullable initially for backfill)
ALTER TABLE "session_logs" ADD COLUMN "scheduledTeacherId" TEXT;

-- Add substitutionReason column
ALTER TABLE "session_logs" ADD COLUMN "substitutionReason" TEXT;

-- Backfill scheduledTeacherId from Session.teacherId
UPDATE "session_logs" sl
SET "scheduledTeacherId" = s."teacherId"
FROM "sessions" s
WHERE sl."sessionId" = s.id;

-- Make scheduledTeacherId NOT NULL
ALTER TABLE "session_logs" ALTER COLUMN "scheduledTeacherId" SET NOT NULL;

-- Add foreign key constraint for scheduledTeacherId
ALTER TABLE "session_logs" ADD CONSTRAINT "session_logs_scheduledTeacherId_fkey"
FOREIGN KEY ("scheduledTeacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
