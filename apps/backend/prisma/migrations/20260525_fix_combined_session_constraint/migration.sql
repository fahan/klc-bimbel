-- Drop the problematic unique constraint that blocks combined sessions
-- Combined sessions intentionally have 2 sessions with the same (teacherId, dayOfWeek, startTime)
-- Application-level validation in createCombined() prevents real conflicts
ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_teacherId_dayOfWeek_startTime_key";

-- Create a partial unique index instead that ONLY applies to non-combined sessions
-- This allows combined sessions to exist while preventing double-booking for other sessions
CREATE UNIQUE INDEX "sessions_teacher_time_single"
ON "sessions"("teacherId", "dayOfWeek", "startTime")
WHERE "createdReason" = 'SINGLE';
