-- Create enums for session management
CREATE TYPE "SessionCreatedReason" AS ENUM ('SINGLE', 'COMBINED_2SUBJECTS');
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'OVERCAPACITY', 'CANCELLED', 'ARCHIVED');

-- AlterTable sessions
ALTER TABLE "sessions" ADD COLUMN "sessionGroupId" TEXT,
ADD COLUMN "groupSize" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "maxCapacity" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN "currentEnrolled" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "createdReason" "SessionCreatedReason" NOT NULL DEFAULT 'SINGLE',
ADD COLUMN "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "notes" TEXT,
ADD COLUMN "createdBy" TEXT;

-- Add indexes
CREATE INDEX "sessions_sessionGroupId_idx" ON "sessions"("sessionGroupId");
CREATE INDEX "sessions_branchId_dayOfWeek_idx" ON "sessions"("branchId", "dayOfWeek");

-- Drop old unique constraint (branchId, subjectId, teacherId, dayOfWeek, startTime)
ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_branchId_subjectId_teacherId_dayOfWeek_startTime_key";

-- Add new unique constraint (teacherId, dayOfWeek, startTime) - prevent same teacher double-booking
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_teacherId_dayOfWeek_startTime_key" UNIQUE ("teacherId", "dayOfWeek", "startTime");

-- CreateTable SessionAuditLog
CREATE TABLE "session_audit_logs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedBy" TEXT,
    "reason" TEXT,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_audit_logs_pkey" PRIMARY KEY ("id")
);

-- Add indexes for session_audit_logs
CREATE INDEX "session_audit_logs_sessionId_idx" ON "session_audit_logs"("sessionId");
CREATE INDEX "session_audit_logs_action_idx" ON "session_audit_logs"("action");

-- Add foreign key for session_audit_logs
ALTER TABLE "session_audit_logs" ADD CONSTRAINT "session_audit_logs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add default value for joinedAt in session_students if it doesn't have one
ALTER TABLE "session_students" ALTER COLUMN "joinedAt" SET DEFAULT CURRENT_TIMESTAMP;
