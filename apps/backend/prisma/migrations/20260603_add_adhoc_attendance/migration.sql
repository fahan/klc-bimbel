-- Migration: Add Ad-hoc Attendance (Hybrid Manual Attendance)
-- Adds PENDING_APPROVAL and REJECTED to SessionLogStatus enum,
-- makes sessionId nullable on session_logs, and adds ad-hoc + approval fields.

-- Step 1: Add new enum values to SessionLogStatus
ALTER TYPE "SessionLogStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';
ALTER TYPE "SessionLogStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

-- Step 2: Make sessionId nullable (was NOT NULL)
ALTER TABLE "session_logs" ALTER COLUMN "sessionId" DROP NOT NULL;

-- Step 3: Add ad-hoc session fields
ALTER TABLE "session_logs" ADD COLUMN IF NOT EXISTS "isAdHoc" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "session_logs" ADD COLUMN IF NOT EXISTS "adHocBranchId" TEXT;
ALTER TABLE "session_logs" ADD COLUMN IF NOT EXISTS "adHocSubjectId" TEXT;
ALTER TABLE "session_logs" ADD COLUMN IF NOT EXISTS "adHocStartTime" TEXT;
ALTER TABLE "session_logs" ADD COLUMN IF NOT EXISTS "adHocDuration" INTEGER;
ALTER TABLE "session_logs" ADD COLUMN IF NOT EXISTS "adHocNotes" TEXT;

-- Step 4: Add approval fields
ALTER TABLE "session_logs" ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;
ALTER TABLE "session_logs" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "session_logs" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

-- Step 5: Drop the unique constraint (sessionId is now nullable, compound unique won't work)
ALTER TABLE "session_logs" DROP CONSTRAINT IF EXISTS "session_logs_sessionId_sessionDate_key";

-- Step 6: Add index to replace the unique constraint for regular sessions
CREATE INDEX IF NOT EXISTS "session_logs_sessionId_sessionDate_idx" ON "session_logs"("sessionId", "sessionDate");
CREATE INDEX IF NOT EXISTS "session_logs_isAdHoc_status_idx" ON "session_logs"("isAdHoc", "status");
CREATE INDEX IF NOT EXISTS "session_logs_adHocBranchId_status_idx" ON "session_logs"("adHocBranchId", "status");

-- Step 7: Add FK constraints for new columns
ALTER TABLE "session_logs"
  ADD CONSTRAINT "session_logs_adHocBranchId_fkey"
  FOREIGN KEY ("adHocBranchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "session_logs"
  ADD CONSTRAINT "session_logs_adHocSubjectId_fkey"
  FOREIGN KEY ("adHocSubjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "session_logs"
  ADD CONSTRAINT "session_logs_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
