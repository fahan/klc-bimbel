-- CreateEnum
CREATE TYPE "TrialRegistrationStatus" AS ENUM ('NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "free_trial_registrations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "childName" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "subjects" TEXT[] NOT NULL DEFAULT '{}',
    "branchCode" TEXT,
    "notes" TEXT,
    "status" "TrialRegistrationStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "free_trial_registrations_pkey" PRIMARY KEY ("id")
);
