/*
  Warnings:

  - Changed the type of `role` on the `user_roles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "session_students" ALTER COLUMN "joinedAt" DROP DEFAULT;

-- AlterTable: add password with temporary default, then remove default
ALTER TABLE "users" ADD COLUMN "password" TEXT NOT NULL DEFAULT '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj0og7cCLNUm';
ALTER TABLE "users" ALTER COLUMN "password" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_roles" DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_role_key" ON "user_roles"("userId", "role");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_sessionGroupId_fkey" FOREIGN KEY ("sessionGroupId") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
