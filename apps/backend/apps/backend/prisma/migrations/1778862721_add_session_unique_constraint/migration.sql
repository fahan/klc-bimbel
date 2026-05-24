-- Add unique constraint to prevent duplicate sessions
-- Same branch + subject + teacher + day + time = unique
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_branchId_subjectId_teacherId_dayOfWeek_startTime_key" UNIQUE ("branchId", "subjectId", "teacherId", "dayOfWeek", "startTime");
