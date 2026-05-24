-- CreateTable UserRole
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_role_key" ON "user_roles"("userId", "role");

-- CreateIndex
CREATE INDEX "user_roles_userId_idx" ON "user_roles"("userId");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing roles to UserRole table
INSERT INTO "user_roles" ("id", "userId", "role", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", "role", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "users" WHERE "role" IS NOT NULL;

-- Drop the role column from User table (optional - we can keep it for backward compatibility)
-- ALTER TABLE "User" DROP COLUMN "role";
